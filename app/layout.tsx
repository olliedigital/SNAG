import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Archivo } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: "SNAG — your personal deal agent",
  description: "SNAG watches eBay, StockX, GOAT and more, 24/7, and pings you the second a verified pair drops below what it should cost.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${archivo.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
