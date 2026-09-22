import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Regenwaterput",
  description: "Peil en verloop van de regenwaterput",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="nl">
      <body>
        <div className="schil">{children}</div>
      </body>
    </html>
  );
}
