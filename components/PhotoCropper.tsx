"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp, Move, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { colorVar } from "./ui";

/** Final photo size. Avatars show at most 120 px, so 512 stays sharp on 4x screens. */
export const OUTPUT = 512;
export const MAX_BYTES = 300 * 1024;
// Big phone photos are reduced once on load; enough room to zoom 6x and still export a full 512 px.
const SOURCE_MAX = 3072;
const MAX_ZOOM = 8;

type View = { zoom: number; cx: number; cy: number };

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { c, ctx };
}

/** Decodes the file honoring EXIF rotation and caps its size. */
async function loadSource(file: File): Promise<HTMLCanvasElement> {
  let img: CanvasImageSource & { width: number; height: number };
  try {
    img = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Não foi possível abrir essa imagem"));
      el.src = url;
    }).finally(() => URL.revokeObjectURL(url));
  }
  const scale = Math.min(1, SOURCE_MAX / Math.max(img.width, img.height));
  const { c, ctx } = canvas(Math.round(img.width * scale), Math.round(img.height * scale));
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if ("close" in img && typeof img.close === "function") img.close();
  return c;
}

function rotate(src: HTMLCanvasElement, dir: 1 | -1) {
  const { c, ctx } = canvas(src.height, src.width);
  ctx.translate(dir === 1 ? c.width : 0, dir === 1 ? 0 : c.height);
  ctx.rotate((dir * Math.PI) / 2);
  ctx.drawImage(src, 0, 0);
  return c;
}

const sideOf = (src: HTMLCanvasElement, zoom: number) => Math.min(src.width, src.height) / zoom;

function clampView(src: HTMLCanvasElement, v: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
  const half = sideOf(src, zoom) / 2;
  return {
    zoom,
    cx: Math.min(src.width - half, Math.max(half, v.cx)),
    cy: Math.min(src.height - half, Math.max(half, v.cy)),
  };
}

/** Crops at full resolution, then halves step by step down to OUTPUT; much sharper than one big downscale. */
async function exportCrop(src: HTMLCanvasElement, v: View): Promise<Blob> {
  const side = sideOf(src, v.zoom);
  const first = Math.max(OUTPUT, Math.round(side));
  let { c: cur } = canvas(first, first);
  cur.getContext("2d")!.drawImage(src, v.cx - side / 2, v.cy - side / 2, side, side, 0, 0, first, first);
  while (cur.width / 2 >= OUTPUT) {
    const half = Math.round(cur.width / 2);
    const next = canvas(half, half);
    next.ctx.drawImage(cur, 0, 0, half, half);
    cur = next.c;
  }
  const out = canvas(OUTPUT, OUTPUT);
  out.ctx.drawImage(cur, 0, 0, OUTPUT, OUTPUT);

  const encode = (type: string, q: number) => new Promise<Blob | null>((r) => out.c.toBlob(r, type, q));
  for (const q of [0.92, 0.86, 0.8, 0.72, 0.64]) {
    let blob = await encode("image/webp", q);
    // Older Safari can't encode WebP and quietly hands back PNG.
    if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", q);
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("Não foi possível reduzir a foto o suficiente");
}

const PREVIEWS = [
  { size: 120, label: "Perfil" },
  { size: 64, label: "Ranking" },
  { size: 24, label: "Listas" },
];

export default function PhotoCropper({
  name,
  file,
  onCancel,
  onSave,
  onPickAnother,
}: {
  name: string;
  file: File;
  onCancel: () => void;
  /** Resolves to an error message to show, or nothing when saved. */
  onSave: (blob: Blob) => Promise<string | void>;
  onPickAnother: () => void;
}) {
  const [src, setSrc] = useState<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, cx: 0, cy: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const stageCanvas = useRef<HTMLCanvasElement>(null);
  const previews = useRef<(HTMLCanvasElement | null)[]>([]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setError(null);
    loadSource(file)
      .then((c) => {
        if (!alive) return;
        setSrc(c);
        setView({ zoom: 1, cx: c.width / 2, cy: c.height / 2 });
      })
      .catch(() => alive && setError("Não foi possível abrir essa imagem. Tente uma foto JPG, PNG ou WebP."));
    return () => {
      alive = false;
    };
  }, [file]);

  // Stage and previews are redrawn from the source, so what you see is exactly what gets saved.
  useEffect(() => {
    if (!src) return;
    const side = sideOf(src, view.zoom);
    const sx = view.cx - side / 2;
    const sy = view.cy - side / 2;
    const dpr = window.devicePixelRatio || 1;
    for (const el of [stageCanvas.current, ...previews.current]) {
      if (!el) continue;
      const px = Math.round(el.clientWidth * dpr);
      if (el.width !== px) el.width = el.height = px;
      const ctx = el.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, sx, sy, side, side, 0, 0, px, px);
    }
  }, [src, view]);

  const update = useCallback((fn: (v: View) => View) => src && setView((v) => clampView(src, fn(v))), [src]);

  /** Zoom keeping the point under (px, py) — in stage CSS pixels — fixed. */
  const zoomAt = useCallback(
    (factor: number, px?: number, py?: number) =>
      update((v) => {
        if (!src) return v;
        const size = stage.current?.clientWidth ?? 1;
        const ox = (px ?? size / 2) - size / 2;
        const oy = (py ?? size / 2) - size / 2;
        const before = sideOf(src, v.zoom) / size;
        const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom * factor));
        const after = sideOf(src, zoom) / size;
        return { zoom, cx: v.cx + ox * before - ox * after, cy: v.cy + oy * before - oy * after };
      }),
    [src, update],
  );

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: React.PointerEvent) {
    const map = pointers.current;
    const prev = map.get(e.pointerId);
    if (!prev || !src) return;
    const size = stage.current?.clientWidth ?? 1;
    if (map.size === 1) {
      const k = sideOf(src, view.zoom) / size;
      update((v) => ({ ...v, cx: v.cx - (e.clientX - prev.x) * k, cy: v.cy - (e.clientY - prev.y) * k }));
    } else if (map.size === 2) {
      // Pinch: zoom by the change in distance between the two fingers, around their midpoint.
      const other = [...map.entries()].find(([id]) => id !== e.pointerId)![1];
      const d0 = Math.hypot(prev.x - other.x, prev.y - other.y);
      const d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const r = stage.current!.getBoundingClientRect();
      if (d0 > 0) zoomAt(d1 / d0, (e.clientX + other.x) / 2 - r.left, (e.clientY + other.y) / 2 - r.top);
    }
    map.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!src) return;
    const step = sideOf(src, view.zoom) * 0.04;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      update((v) => ({ ...v, cx: v.cx + dx, cy: v.cy + dy }));
    } else if (e.key === "+" || e.key === "=") zoomAt(1.1);
    else if (e.key === "-") zoomAt(1 / 1.1);
  }

  function turn(dir: 1 | -1) {
    if (!src) return;
    const next = rotate(src, dir);
    setSrc(next);
    setView((v) =>
      clampView(next, dir === 1 ? { zoom: v.zoom, cx: src.height - v.cy, cy: v.cx } : { zoom: v.zoom, cx: v.cy, cy: src.width - v.cx }),
    );
  }

  async function save() {
    if (!src) return;
    setSaving(true);
    setError(null);
    try {
      const message = await onSave(await exportCrop(src, view));
      if (message) setError(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar a foto");
    } finally {
      setSaving(false);
    }
  }

  const lowRes = src ? sideOf(src, view.zoom) < OUTPUT * 0.6 : false;

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onCancel()}>
      <div className="modal cropper" role="dialog" aria-modal="true" aria-label={`Foto de ${name}`}>
        <div className="cropper-head">
          <span className="label">Foto de perfil</span>
          <h2>{name}</h2>
        </div>

        <div className="cropper-body">
          <div className="cropper-main">
            <div
              ref={stage}
              className={`crop-stage${src ? "" : " loading"}`}
              style={colorVar(name)}
              tabIndex={0}
              role="application"
              aria-label="Área de recorte. Arraste para posicionar, use a roda do mouse ou as teclas + e - para zoom e as setas para mover."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
            >
              <canvas ref={stageCanvas} />
              <span className="crop-grid" aria-hidden />
              <span className="crop-corners" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </span>
              {!src && !error && <span className="crop-msg">Carregando…</span>}
              {src && (
                <span className="crop-hint" aria-hidden>
                  <Move size={14} /> Arraste para posicionar
                </span>
              )}
            </div>

            <div className="crop-tools">
              <button type="button" className="tool" onClick={() => zoomAt(1 / 1.2)} aria-label="Diminuir zoom" disabled={!src}>
                <ZoomOut size={18} />
              </button>
              <input
                className="zoom-range"
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={view.zoom}
                aria-label="Zoom"
                disabled={!src}
                onChange={(e) => zoomAt(Number(e.target.value) / view.zoom)}
              />
              <button type="button" className="tool" onClick={() => zoomAt(1.2)} aria-label="Aumentar zoom" disabled={!src}>
                <ZoomIn size={18} />
              </button>
              <span className="tool-sep" />
              <button type="button" className="tool" onClick={() => turn(-1)} aria-label="Girar para a esquerda" disabled={!src}>
                <RotateCcw size={18} />
              </button>
              <button type="button" className="tool" onClick={() => turn(1)} aria-label="Girar para a direita" disabled={!src}>
                <RotateCw size={18} />
              </button>
            </div>
            {lowRes && <p className="crop-warn">Zoom alto para essa imagem: a foto pode perder nitidez.</p>}
          </div>

          <aside className="crop-previews" style={colorVar(name)}>
            <span className="label">Como vai ficar</span>
            <div className="preview-list">
              {PREVIEWS.map((p, i) => (
                <figure key={p.size}>
                  <canvas
                    ref={(el) => {
                      previews.current[i] = el;
                    }}
                    style={{ width: p.size, height: p.size }}
                  />
                  <figcaption>
                    {p.label}
                    <span className="num">
                      {p.size}×{p.size}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <button type="button" className="btn btn-sm" onClick={onPickAnother} disabled={saving}>
              <ImageUp size={14} /> Escolher outra imagem
            </button>
          </aside>
        </div>

        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn-cta" onClick={save} disabled={!src || saving}>
            {saving ? "Salvando…" : "Salvar foto"}
          </button>
        </div>
      </div>
    </div>
  );
}
