"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  GitCompare,
  LayoutDashboard,
  Menu,
  Plus,
  SunMoon,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useApp, useMode } from "./AppProvider";
import { ModeSelect } from "./ui";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/partidas", label: "Partidas", icon: Swords },
  { href: "/jogadores", label: "Jogadores", icon: Users },
  { href: "/comparar", label: "Comparar", icon: GitCompare },
];

export const THEME_KEY = "bagro-theme";
export const RAIL_KEY = "bagro-rail";
const MOBILE = "(max-width: 780px)";

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}
}

/** The open/closed sidebar lives on <html data-rail> so the inline script in the layout restores it before paint. */
function setRail(open: boolean) {
  const root = document.documentElement;
  if (open) root.dataset.rail = "open";
  else delete root.dataset.rail;
  // On phones the sidebar is a drawer, so it always starts closed.
  if (matchMedia(MOBILE).matches) return;
  try {
    localStorage.setItem(RAIL_KEY, open ? "open" : "closed");
  } catch {}
}

const Wordmark = () => (
  <>
    Bagrom<span>ê</span>tro
  </>
);

export function NewMatchButton({ className = "" }: { className?: string }) {
  const { openForm } = useApp();
  return (
    <button type="button" className={`btn-cta ${className}`} onClick={openForm}>
      <Plus size={18} strokeWidth={2.5} /> Nova partida
    </button>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { openForm, error } = useApp();
  const { href } = useMode();
  const [open, setOpen] = useState(false);
  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  useEffect(() => setOpen(document.documentElement.dataset.rail === "open"), []);

  // The phone drawer closes after picking a page.
  useEffect(() => {
    if (matchMedia(MOBILE).matches && document.documentElement.dataset.rail === "open") {
      setRail(false);
      setOpen(false);
    }
  }, [pathname]);

  const toggle = (next: boolean) => {
    setRail(next);
    setOpen(next);
  };

  return (
    <div className="app">
      <div className="nav-col">
        <nav className="rail" aria-label="Navegação principal">
          {/* The logo block is the menu trigger, so it never reads as one of the page icons below it. */}
          <button
            type="button"
            className="brand-toggle"
            onClick={() => toggle(true)}
            title="Expandir menu"
            aria-label="Expandir menu"
            aria-expanded={open}
            aria-controls="sidebar"
          >
            <Image className="brand-mark" src="/brand/mark-competitivo.png" alt="" width={44} height={44} priority />
            <span className="brand-strip" aria-hidden>
              <span className="idle">
                <ChevronsRight size={12} />
              </span>
              <span className="hot">
                Menu <ChevronsRight size={12} />
              </span>
            </span>
          </button>
          <Link className="rail-title" href={href("/")}>
            <Wordmark />
          </Link>
          <button
            type="button"
            className="rail-link rail-menu"
            onClick={() => toggle(true)}
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="sidebar"
          >
            <Menu size={20} />
          </button>
          <span className="nav-icons">
            {NAV.map(({ href: path, label, icon: Icon }) => (
              <Link
                key={path}
                className="rail-link"
                href={href(path)}
                title={label}
                aria-label={label}
                aria-current={isActive(path) ? "page" : undefined}
              >
                <Icon size={20} />
              </Link>
            ))}
          </span>
          <span className="spacer" />
          <button
            type="button"
            className="rail-link"
            onClick={toggleTheme}
            title="Alternar tema"
            aria-label="Alternar tema claro ou escuro"
          >
            <SunMoon size={20} />
          </button>
          <button type="button" className="rail-link rail-add" onClick={openForm} title="Nova partida" aria-label="Nova partida">
            <Plus size={20} />
          </button>
        </nav>

        <aside className="sidebar" id="sidebar" aria-label="Menu">
          <button
            type="button"
            className="brand-toggle open"
            onClick={() => toggle(false)}
            title="Recolher menu"
            aria-label="Recolher menu"
            aria-expanded={open}
            aria-controls="sidebar"
          >
            <Image className="sidebar-logo" src="/brand/logo-competitivo.png" alt="" width={150} height={140} />
            <span className="brand-strip" aria-hidden>
              <span className="idle">
                <ChevronsLeft size={12} />
              </span>
              <span className="hot">
                <ChevronsLeft size={12} /> Recolher
              </span>
            </span>
          </button>
          <nav className="menu" aria-label="Seções">
            {NAV.map(({ href: path, label }) => (
              <Link key={path} href={href(path)} aria-current={isActive(path) ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-foot">
            <ModeSelect id="modo-menu" />
            <NewMatchButton />
            <button type="button" className="menu-link" onClick={toggleTheme}>
              <SunMoon size={16} /> Tema claro / escuro
            </button>
          </div>
        </aside>
        <div className="sidebar-backdrop" onClick={() => toggle(false)} aria-hidden />
      </div>

      <div style={{ minWidth: 0 }}>
        <header className="topbar">
          <Link className="wordmark" href={href("/")}>
            <Wordmark />
          </Link>
          <nav className="tabs" aria-label="Seções">
            {NAV.map(({ href: path, label }) => (
              <Link key={path} href={href(path)} aria-current={isActive(path) ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <span className="grow" />
          <span className="topbar-actions">
            <ModeSelect />
            <NewMatchButton className="desktop-only" />
          </span>
        </header>
        {error && <div className="banner-error">Não foi possível carregar os dados: {error}</div>}
        {children}
      </div>
    </div>
  );
}
