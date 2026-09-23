import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
export const metadata: Metadata = {
  title: "Jobradar — Your next opportunity, in view",
  description:
    "A thoughtful workspace for discovering and tracking Sri Lankan and remote technology jobs.",
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  const themeScript = `
    try {
      const stored = localStorage.getItem("jobradar-theme");
      const theme = stored === "light" || stored === "dark"
        ? stored
        : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const sidebar = localStorage.getItem("jobradar-sidebar");
      const collapsed = sidebar === "collapsed";
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
      document.documentElement.classList.toggle("jobradar-dark", theme === "dark");
      document.documentElement.classList.toggle("jobradar-light", theme !== "dark");
      document.documentElement.classList.toggle("jobradar-sidebar-collapsed", collapsed);
    } catch {
      document.documentElement.dataset.theme = "light";
      document.documentElement.dataset.sidebar = "expanded";
      document.documentElement.classList.add("jobradar-light");
    }
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {children}
      </body>
    </html>
  );
}
