import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chumpspace",
  description: "A calm, shared workspace for boards, decisions, and team context.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Script id="appearance" strategy="beforeInteractive">{`
          try {
            const color = localStorage.getItem("chumpspace-accent-color");
            if (color && /^#[0-9a-f]{6}$/i.test(color)) {
              const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
              const c = [r, g, b].map((v) => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
              const l = .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
              const s = document.documentElement.style;
              s.setProperty("--primary", color);
              s.setProperty("--primary-foreground", l > .36 ? "#09090b" : "#fafafa");
              s.setProperty("--ring", color);
              s.setProperty("--border-strong", "rgba(" + r + "," + g + "," + b + ",.55)");
              s.setProperty("--accent-soft", "rgba(" + r + "," + g + "," + b + ",.14)");
            }
            const background = localStorage.getItem("chumpspace-background-color");
            if (background && /^#[0-9a-f]{6}$/i.test(background)) {
              const r = parseInt(background.slice(1, 3), 16), g = parseInt(background.slice(3, 5), 16), b = parseInt(background.slice(5, 7), 16);
              const c = [r, g, b].map((v) => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
              const light = .2126 * c[0] + .7152 * c[1] + .0722 * c[2] > .42;
              const shift = (v, n) => Math.max(0, Math.min(255, Math.round(v + n)));
              const hex = (n) => n.toString(16).padStart(2, "0");
              const shade = (n) => "#" + hex(shift(r, n)) + hex(shift(g, n)) + hex(shift(b, n));
              const foreground = light ? "#09090b" : "#fafafa", card = shade(light ? -8 : 7), raised = shade(light ? -16 : 18), secondary = shade(light ? -20 : 24);
              const s = document.documentElement.style;
              s.colorScheme = light ? "light" : "dark";
              s.setProperty("--background", background); s.setProperty("--foreground", foreground);
              s.setProperty("--card", card); s.setProperty("--card-foreground", foreground);
              s.setProperty("--popover", card); s.setProperty("--popover-foreground", foreground);
              s.setProperty("--secondary", secondary); s.setProperty("--secondary-foreground", foreground);
              s.setProperty("--muted", secondary); s.setProperty("--muted-foreground", light ? "#52525b" : "#a1a1aa");
              s.setProperty("--accent", raised); s.setProperty("--accent-foreground", foreground);
              s.setProperty("--border", light ? "rgba(9,9,11,.14)" : "rgba(255,255,255,.1)");
              s.setProperty("--input", light ? "rgba(9,9,11,.18)" : "rgba(255,255,255,.13)");
              s.setProperty("--panel", card); s.setProperty("--panel-strong", card); s.setProperty("--surface-raised", raised);
              s.setProperty("--surface-soft", light ? "rgba(9,9,11,.045)" : "rgba(255,255,255,.045)");
            }
          } catch {}
        `}</Script>
        {children}
      </body>
    </html>
  );
}
