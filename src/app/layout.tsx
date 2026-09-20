import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Jobradar — Your next opportunity, in view",
  description:
    "A thoughtful workspace for discovering and tracking Sri Lankan and remote technology jobs.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `
    try {
      const stored = localStorage.getItem("jobradar-theme");
      const theme = stored === "light" || stored === "dark"
        ? stored
        : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle("jobradar-dark", theme === "dark");
      document.documentElement.classList.toggle("jobradar-light", theme !== "dark");
    } catch {
      document.documentElement.dataset.theme = "light";
      document.documentElement.classList.add("jobradar-light");
    }
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
