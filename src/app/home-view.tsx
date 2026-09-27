"use client";

import Link from "next/link";

import { ExpiryBadge } from "@/components/badges";
import { RecipeCard } from "@/components/recipe-card";
import { formatDateTime } from "@/lib/format";
import { Loading } from "@/components/page-state";
import { freshness, recommend } from "@/lib/recommend";
import { useDb } from "@/lib/store";

export function HomeView() {
  const db = useDb();
  if (!db) return <Loading />;

  const soonDays = db.settings.expiringSoonDays;
  const recs = recommend({
    inventory: db.inventory,
    staples: db.settings.staples,
    cookLog: db.cookLog,
    recipes: db.recipes,
    expiringSoonDays: soonDays,
  });
  const top = [...recs.ready, ...recs.almost].slice(0, 3);
  const attention = db.inventory
    .filter((i) => {
      const f = freshness(i, soonDays);
      return f === "soon" || f === "expired";
    })
    .sort((a, b) => (a.expiresOn ?? "").localeCompare(b.expiresOn ?? ""));
  const recent = [...db.events].reverse().slice(0, 6);

  const stats = [
    { label: "Items in stock", value: db.inventory.length, href: "/inventory" },
    { label: "Ready to cook", value: recs.ready.length, href: "/cook" },
    { label: "Recipes", value: db.recipes.length, href: "/recipes" },
    { label: "Meals cooked", value: db.cookLog.length, href: "/history?tab=meals" },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-800 p-6 text-white sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">What&apos;s for dinner?</h1>
        <p className="mt-2 max-w-xl text-brand-100">
          Keep track of what&apos;s in your fridge and cabinets, and get meal ideas that use it up before it goes off.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cook" className="btn border-white bg-white text-brand-700 hover:bg-brand-50">
            Find something to cook
          </Link>
          <Link href="/inventory" className="btn border-white/40 bg-white/10 text-white hover:bg-white/20">
            Update inventory
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 transition hover:border-brand-500/50">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-stone-500 uppercase">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <div className="flex items-end justify-between">
            <h2 className="section-title">Top picks right now</h2>
            <Link href="/cook" className="text-sm text-brand-700 hover:underline dark:text-brand-200">See all →</Link>
          </div>
          {top.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {top.map((m) => (
                <RecipeCard key={m.recipe.id} recipe={m.recipe} match={m} />
              ))}
            </div>
          ) : (
            <div className="card p-6 text-sm text-stone-500">
              {db.inventory.length === 0 ? (
                <>Start by <Link href="/inventory" className="underline">adding what you have</Link> — we&apos;ll match it against your recipe book.</>
              ) : (
                <>Nothing is a close match yet. Browse the <Link href="/cook" className="underline">full recommendations</Link> for ideas and a shopping list.</>
              )}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-4">
            <h2 className="section-title mb-2">Use soon</h2>
            {attention.length ? (
              <ul className="space-y-2">
                {attention.slice(0, 8).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{i.name}</span>
                    <ExpiryBadge item={i} soonDays={soonDays} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-500">Nothing expiring in the next {soonDays} days. 🎉</p>
            )}
          </section>

          <section className="card p-4">
            <div className="mb-2 flex items-end justify-between">
              <h2 className="section-title">Recent activity</h2>
              <Link href="/history?tab=activity" className="text-sm text-brand-700 hover:underline dark:text-brand-200">History →</Link>
            </div>
            {recent.length ? (
              <ul className="space-y-2 text-sm">
                {recent.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      <span className="text-stone-500 capitalize">{e.type === "expired" ? "tossed" : e.type}</span> {e.itemName}
                    </span>
                    <span className="shrink-0 text-xs text-stone-400">{formatDateTime(e.at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-500">No activity yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
