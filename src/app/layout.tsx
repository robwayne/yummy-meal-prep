import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { Nav, TabBar } from "@/components/nav";
import { StorageKeeper } from "@/components/storage-keeper";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "HungryHungryRob", template: "%s · HungryHungryRob" },
  description: "Your recipe book, kitchen inventory and meal recommender in one place.",
  appleWebApp: { capable: true, title: "HungryHungryRob", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <StorageKeeper />
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span aria-hidden className="text-2xl">🥕</span>
              HungryHungryRob
            </Link>
            <Nav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:py-8">
          {children}
        </main>
        <TabBar />
      </body>
    </html>
  );
}
