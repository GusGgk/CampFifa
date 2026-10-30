import type { Metadata, Viewport } from "next";
import { Anton, Barlow_Condensed, Chakra_Petch } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import AppShell from "@/components/AppShell";
import { loadData } from "@/lib/data";
import "./globals.css";

const display = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const ui = Chakra_Petch({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-ui" });
// Sidebar menu and the "Nova partida" button: the sporty italic from the Esportivo concept.
const menu = Barlow_Condensed({ subsets: ["latin"], weight: ["700", "800", "900"], style: "italic", variable: "--font-menu" });

// Pages are static HTML served from the CDN. They regenerate as soon as data changes
// (revalidateTag in the API routes) and, as a safety net, at most every 60 s.
export const revalidate = 60;

export const metadata: Metadata = {
  title: { default: "Bagromêtro", template: "%s · Bagromêtro" },
  description: "Ranking, partidas e estatísticas do campeonato de FIFA entre Gk, Edu, Gritten e Dosan",
};

export const viewport: Viewport = {
  themeColor: "#101014",
};

// Applies the saved theme and sidebar state before the first paint, so nothing flashes or jumps.
const bootScript = `try{var d=document.documentElement,t=localStorage.getItem("bagro-theme");if(t==="light"||t==="dark")d.dataset.theme=t;if(localStorage.getItem("bagro-rail")==="open"&&matchMedia("(min-width: 781px)").matches)d.dataset.rail="open"}catch(e){}if(/[?&](modo|jogador|local|a|b)=/.test(location.search))d.dataset.urlPending="";`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const data = await loadData();
  return (
    <html lang="pt-BR" className={`${display.variable} ${ui.variable} ${menu.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <AppProvider data={data}>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
