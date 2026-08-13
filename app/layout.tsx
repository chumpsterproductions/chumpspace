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
        <Script id="accent-color" strategy="beforeInteractive">{`
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
          } catch {}
        `}</Script>
        {children}
      </body>
    </html>
  );
}
