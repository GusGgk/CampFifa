"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { readPin, savePin } from "./MatchForm";

// In-app replacements for confirm()/prompt()/alert(), which embedded browsers and previews often block.

type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; danger?: boolean };
type Dialog =
  | ({ kind: "confirm"; resolve: (ok: boolean) => void } & ConfirmOptions)
  | { kind: "info"; title: string; message?: string; resolve: () => void }
  | { kind: "pin"; error?: string; resolve: (pin: string | null) => void };

type Api = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  info: (title: string, message?: string) => Promise<void>;
  /** Runs a protected request with the saved PIN, asking for it (again) when missing or wrong. */
  withPin: (run: (pin: string) => Promise<Response>) => Promise<Response | null>;
};

const DialogContext = createContext<Api | null>(null);

export function useDialogs() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialogs fora do DialogProvider");
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ kind: "confirm", ...opts, resolve })),
    [],
  );
  const info = useCallback(
    (title: string, message?: string) => new Promise<void>((resolve) => setDialog({ kind: "info", title, message, resolve })),
    [],
  );
  const askPin = useCallback(
    (error?: string) => new Promise<string | null>((resolve) => setDialog({ kind: "pin", error, resolve })),
    [],
  );

  const withPin = useCallback(
    async (run: (pin: string) => Promise<Response>) => {
      let pin = readPin();
      let error: string | undefined;
      for (;;) {
        if (!pin) {
          const typed = await askPin(error);
          if (typed == null) return null;
          pin = typed;
        }
        const res = await run(pin);
        if (res.status === 401) {
          error = "PIN incorreto. Tente de novo.";
          pin = "";
          continue;
        }
        if (res.ok) savePin(pin);
        return res;
      }
    },
    [askPin],
  );

  const api = useMemo(() => ({ confirm, info, withPin }), [confirm, info, withPin]);
  const close = () => setDialog(null);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog && <DialogView dialog={dialog} close={close} />}
    </DialogContext.Provider>
  );
}

function DialogView({ dialog, close }: { dialog: Dialog; close: () => void }) {
  const [pin, setPin] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  const cancel = useCallback(() => {
    if (dialog.kind === "confirm") dialog.resolve(false);
    else if (dialog.kind === "pin") dialog.resolve(null);
    else dialog.resolve();
    close();
  }, [dialog, close]);

  useEffect(() => {
    (dialog.kind === "pin" ? input.current : confirmBtn.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, cancel]);

  const ok = () => {
    if (dialog.kind === "confirm") dialog.resolve(true);
    else if (dialog.kind === "pin") {
      if (!pin.trim()) return;
      dialog.resolve(pin.trim());
    } else dialog.resolve();
    close();
  };

  const title = dialog.kind === "pin" ? "PIN do grupo" : dialog.title;
  return (
    <div className="backdrop dialog-layer" onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
      <form
        className={`modal dialog${dialog.kind === "confirm" && dialog.danger ? " danger" : ""}`}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={(e) => {
          e.preventDefault();
          ok();
        }}
      >
        <h2>{title}</h2>
        {dialog.kind === "pin" ? (
          <>
            <p className="dialog-text">Só quem tem o PIN registra partidas e troca fotos. Ele fica salvo neste aparelho.</p>
            <div className="pin-field">
              <KeyRound size={18} />
              <input
                ref={input}
                className="input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                aria-label="PIN do grupo"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
            {dialog.error && <p className="error">{dialog.error}</p>}
          </>
        ) : (
          dialog.message && <p className="dialog-text">{dialog.message}</p>
        )}
        <div className="modal-actions">
          {dialog.kind !== "info" && (
            <button type="button" className="btn" onClick={cancel}>
              Cancelar
            </button>
          )}
          <button
            ref={confirmBtn}
            type="submit"
            className={dialog.kind === "confirm" && dialog.danger ? "btn btn-danger-solid" : "btn btn-primary"}
          >
            {dialog.kind === "confirm" ? (dialog.confirmLabel ?? "Confirmar") : dialog.kind === "pin" ? "Continuar" : "Ok"}
          </button>
        </div>
      </form>
    </div>
  );
}
