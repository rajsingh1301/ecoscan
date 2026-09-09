import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import HeaderXpBadge from "@/components/HeaderXpBadge";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoScan",
  description: "AI-powered waste sorting assistant — NextStep Hacks 2026",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10 px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg flex items-center gap-1">
            🌎 EcoScan
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link href="/">Scan</Link>
            <Link href="/cleanup">Quest</Link>
            <Link href="/community">Community</Link>
            <Link href="/history">Impact</Link>
            <Link href="/settings" aria-label="Settings">
              ⚙️
            </Link>
            <HeaderXpBadge />
          </nav>
        </header>
        <main className="flex-1 flex flex-col items-center px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
