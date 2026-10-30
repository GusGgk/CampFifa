"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AppData } from "@/lib/data";
import type { Match } from "@/lib/types";
import { chrono, filterByMode, type Mode } from "@/lib/stats";
import MatchForm from "./MatchForm";
import { DialogProvider } from "./Dialogs";

type Ctx = {
  matches: Match[];
  photos: Record<string, string>;
  error: string | null;
  openForm: () => void;
  refresh: () => void;
};

type QueryCtx = {
  params: URLSearchParams;
  /** Changes the query string in place: no server round trip, no scroll jump. */
  setParams: (changes: Record<string, string | null>) => void;
};

const AppContext = createContext<Ctx | null>(null);
const QueryContext = createContext<QueryCtx | null>(null);

// Pages are prerendered as static HTML, so the query string is only known in the browser.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// After this long in the background, coming back to the tab fetches fresh data.
const STALE_AFTER_MS = 60_000;

export function AppProvider({ data, children }: { data: AppData; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [formOpen, setFormOpen] = useState(false);
  const [params, setSearch] = useState(() => new URLSearchParams());
  const loadedAt = useRef(0);

  const matches = useMemo(() => chrono(data.matches), [data.matches]);
  const refresh = useCallback(() => router.refresh(), [router]);

  // Read the query string before paint on every page change (and reveal pages hidden by the boot script).
  useBrowserLayoutEffect(() => {
    setSearch(new URLSearchParams(window.location.search));
    delete document.documentElement.dataset.urlPending;
  }, [pathname]);

  useEffect(() => {
    const onPop = () => setSearch(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    loadedAt.current = Date.now();
  }, [data]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > STALE_AFTER_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const setParams = useCallback(
    (changes: Record<string, string | null>) => {
      const q = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(changes)) {
        if (v) q.set(k, v);
        else q.delete(k);
      }
      const s = q.toString();
      // Next.js keeps its router in sync with native history updates.
      window.history.replaceState(window.history.state, "", s ? `${pathname}?${s}` : pathname);
      setSearch(q);
    },
    [pathname],
  );

  const value = useMemo(
    () => ({ matches, photos: data.photos, error: data.error, openForm: () => setFormOpen(true), refresh }),
    [matches, data.photos, data.error, refresh],
  );
  const query = useMemo(() => ({ params, setParams }), [params, setParams]);

  return (
    <AppContext.Provider value={value}>
      <QueryContext.Provider value={query}>
        <DialogProvider>
          {children}
          {formOpen && <MatchForm matches={matches} onClose={() => setFormOpen(false)} onSaved={refresh} />}
        </DialogProvider>
      </QueryContext.Provider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp fora do AppProvider");
  return ctx;
}

export function useQuery() {
  const ctx = useContext(QueryContext);
  if (!ctx) throw new Error("useQuery fora do AppProvider");
  return ctx;
}

const MODE_PARAM: Record<Mode, string | null> = { all: null, solo: "1x1", duo: "2x2" };

/** Game mode lives in ?modo= so it survives navigation and shared links. */
export function useMode() {
  const { params, setParams } = useQuery();
  const raw = params.get("modo");
  const mode: Mode = raw === "1x1" ? "solo" : raw === "2x2" ? "duo" : "all";

  const setMode = (next: Mode) => setParams({ modo: MODE_PARAM[next] });

  /** Internal link that keeps the current mode. */
  const href = (path: string, extra?: Record<string, string>) => {
    const q = new URLSearchParams(extra);
    if (raw) q.set("modo", raw);
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };

  return { mode, setMode, href };
}

/** Matches filtered by the current mode, oldest first. */
export function useFilteredMatches() {
  const { matches } = useApp();
  const { mode } = useMode();
  return useMemo(() => filterByMode(matches, mode), [matches, mode]);
}
