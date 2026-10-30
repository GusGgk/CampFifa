"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { useApp } from "./AppProvider";
import { useDialogs } from "./Dialogs";
import PhotoCropper from "./PhotoCropper";

const errorOf = async (res: Response, fallback: string) => (await res.json().catch(() => null))?.error ?? fallback;

export default function PhotoControls({ name }: { name: string }) {
  const { photos, refresh } = useApp();
  const dialogs = useDialogs();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `/api/players/${encodeURIComponent(name)}/photo`;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (picked) setFile(picked);
  }

  async function save(blob: Blob) {
    const res = await dialogs.withPin((pin) =>
      fetch(url, { method: "PUT", headers: { "x-app-pin": pin, "content-type": blob.type }, body: blob }),
    );
    if (!res) return "";
    if (!res.ok) return errorOf(res, "Erro ao salvar a foto");
    setFile(null);
    refresh();
  }

  async function remove() {
    const ok = await dialogs.confirm({
      title: `Remover a foto de ${name}?`,
      message: "As iniciais voltam a aparecer no lugar da foto.",
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    const res = await dialogs.withPin((pin) => fetch(url, { method: "DELETE", headers: { "x-app-pin": pin } }));
    setBusy(false);
    if (!res) return;
    if (!res.ok) return dialogs.info("Não foi possível remover", await errorOf(res, "Tente de novo."));
    refresh();
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" hidden onChange={onPick} />
      <span className="photo-actions">
        <button type="button" className="btn btn-sm" onClick={() => input.current?.click()} disabled={busy}>
          <Camera size={14} /> {photos[name] ? "Trocar foto" : "Adicionar foto"}
        </button>
        {photos[name] && (
          <button
            type="button"
            className="btn btn-sm icon-only"
            onClick={remove}
            disabled={busy}
            title="Remover foto"
            aria-label="Remover foto"
          >
            <Trash2 size={14} />
          </button>
        )}
      </span>
      {file && (
        <PhotoCropper
          name={name}
          file={file}
          onCancel={() => setFile(null)}
          onSave={save}
          onPickAnother={() => input.current?.click()}
        />
      )}
    </>
  );
}
