"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home", short: "Home", icon: "🏠" },
  { href: "/inventory", label: "Inventory", short: "Kitchen", icon: "🧺" },
  { href: "/cook", label: "What can I cook?", short: "Cook", icon: "🍳" },
  { href: "/groceries", label: "Groceries", short: "Shop", icon: "🛒" },
  { href: "/recipes", label: "Recipes", short: "Recipes", icon: "📖" },
  { href: "/history", label: "History", short: "History", icon: "🕘" },
  { href: "/settings", label: "Settings", short: "Settings", icon: "⚙️" },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Top navigation on tablets and desktops. */
export function Nav() {
  const isActive = useIsActive();
  return (
    <nav className="hidden gap-1 sm:flex">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
            isActive(l.href)
              ? "bg-brand-600 text-white"
              : "text-stone-600 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Thumb-friendly tab bar on phones, clear of the iPhone home indicator. */
export function TabBar() {
  const isActive = useIsActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-stone-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-stone-800 dark:bg-stone-950/95">
      <ul className="grid grid-cols-7">
        {LINKS.map((l) => {
          const active = isActive(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium tracking-tight ${
                  active ? "text-brand-700 dark:text-brand-200" : "text-stone-500"
                }`}
              >
                <span aria-hidden className={`text-xl leading-none ${active ? "" : "opacity-70 grayscale"}`}>{l.icon}</span>
                {l.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
