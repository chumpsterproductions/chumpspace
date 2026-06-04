import type { Metadata } from "next";
import { PointerTracker } from "@/components/pointer-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chumpspace",
  description: "A Vercel-friendly Trello-style collaboration workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <PointerTracker />
        {children}
      </body>
    </html>
  );
}
