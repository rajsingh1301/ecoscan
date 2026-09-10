import type { Metadata, Viewport } from "next";
import { Fraunces, Figtree } from "next/font/google";
import Link from "next/link";
import HeaderXpBadge from "@/components/HeaderXpBadge";
import ProgressSync from "@/components/ProgressSync";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-display",
});

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "EcoScan",
  description: "Point your camera at anything and find out where it actually goes.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2f6b4f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <ProgressSync />
        <header className="masthead">
          <div className="masthead-inner">
            <Link href="/" className="wordmark">
              EcoScan
              <span className="wordmark-dot" aria-hidden="true" />
            </Link>
            <nav className="navbar">
              <Link href="/cleanup" className="navlink">
                Quest
              </Link>
              <Link href="/community" className="navlink">
                Feed
              </Link>
              <Link href="/profile" className="navlink">
                Impact
              </Link>
              <HeaderXpBadge />
            </nav>
          </div>
        </header>

        <main className="flex-1 px-5 py-7 flex flex-col items-center">{children}</main>
      </body>
    </html>
  );
}
