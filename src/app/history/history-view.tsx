"use client";

import Form from "next/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { formatDate, formatDateTime } from "@/lib/format";
import { productHistory } from "@/lib/history";
import { formatQuantity } from "@/lib/ingredients";
import { Loading } from "@/components/page-state";
import { useDb } from "@/lib/store";
import { EVENT_TYPES, LOCATION_LABELS, type InventoryEventType } from "@/lib/types";


const EVENT_STYLE: Record<InventoryEventType, { label: string; badge: string }> = {
  added: { label: "Added", badge: "badge-green" },
  restocked: { label: "Restocked", badge: "badge-green" },
  updated: { label: "Edited", badge: "badge-muted" },
  used: { label: "Used", badge: "badge-muted" },
  cooked: { label: "Cooked", badge: "badge-amber" },
  expired: { label: "Tossed", badge: "badge-red" },
  removed: { label: "Removed", badge: "badge-muted" },
};

const TABS = { products: "Products", activity: "Activity log", meals: "Meals cooked" } as const;

export function HistoryView() {
  const sp = useSearchParams();
  const db = useDb();
  if (!db) return <Loading />;

  const tabParam = sp.get("tab") ?? "products";
  const tab = (tabParam in TABS ? tabParam : "products") as keyof typeof TABS;
  const q = sp.get("q")?.trim().toLowerCase() ?? "";
  const type = sp.get("type") ?? "";
  const limit = Math.max(50, Number(sp.get("limit")) || 100);

  const products = productHistory(db.events, db.inventory).filter((p) => !q || p.name.toLowerCase().includes(q));
  const events = [...db.events]
    .reverse()
    .filter((e) => !q || e.itemName.toLowerCase().includes(q))
    .filter((e) => !type || e.type === type);
  const meals = [...db.cookLog].reverse();

  const tossed = db.events.filter((e) => e.type === "expired").length;
  const stocked = db.events.filter((e) => e.type === "added" || e.type === "restocked").length;

  const tabHref = (t: string) => `/history?tab=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Inventory history</h1>
        <p className="text-stone-500">Everything that&apos;s passed through your kitchen.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Products tracked", value: productHistory(db.events, db.inventory).length },
          { label: "Grocery additions", value: stocked },
          { label: "Meals cooked", value: db.cookLog.length },
          { label: "Items tossed", value: tossed },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-stone-500 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg bg-stone-200/60 p-0.5 text-sm dark:bg-stone-800">
          {Object.entries(TABS).map(([k, v]) => (
            <Link
              key={k}
              href={tabHref(k)}
              className={`rounded-md px-3 py-1.5 font-medium ${tab === k ? "bg-white shadow-sm dark:bg-stone-950" : "text-stone-500"}`}
            >
              {v}
            </Link>
          ))}
        </div>
        {tab !== "meals" && (
          <Form action="/history" className="flex flex-wrap gap-2" role="search">
            <input type="hidden" name="tab" value={tab} />
            <input name="q" type="search" defaultValue={q} placeholder="Filter by product…" className="input w-44" />
            {tab === "activity" && (
              <select name="type" defaultValue={type} className="input w-36">
                <option value="">All events</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_STYLE[t].label}</option>
                ))}
              </select>
            )}
            <button className="btn">Filter</button>
          </Form>
        )}
      </div>

      {tab === "products" && (
        <div className="card overflow-x-auto">
          {products.length === 0 ? (
            <p className="p-8 text-center text-stone-500">No history yet — add something to your inventory.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-xs text-stone-500 uppercase dark:border-stone-800">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Usually in</th>
                  <th className="p-3 text-right">Bought</th>
                  <th className="p-3 text-right">Used</th>
                  <th className="p-3 text-right">Tossed</th>
                  <th className="p-3">First seen</th>
                  <th className="p-3">Last bought</th>
                  <th className="p-3">Now</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {products.map((p) => (
                  <tr key={p.key}>
                    <td className="p-3 font-medium">
                      <Link href={`/history?tab=activity&q=${encodeURIComponent(p.name)}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="p-3 text-stone-500">{LOCATION_LABELS[p.location]}</td>
                    <td className="p-3 text-right">{p.timesStocked}×</td>
                    <td className="p-3 text-right">{p.timesUsed}×</td>
                    <td className={`p-3 text-right ${p.timesTossed ? "text-red-600" : ""}`}>{p.timesTossed}×</td>
                    <td className="p-3 whitespace-nowrap text-stone-500">{formatDate(p.firstSeen)}</td>
                    <td className="p-3 whitespace-nowrap text-stone-500">{p.lastStocked ? formatDate(p.lastStocked) : "—"}</td>
                    <td className="p-3">
                      {p.inStock ? <span className="badge badge-green">In stock</span> : <span className="badge badge-muted">Out</span>}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/inventory?add=${encodeURIComponent(p.name)}&unit=${encodeURIComponent(p.unit)}&location=${p.location}`}
                        className="btn btn-sm whitespace-nowrap"
                      >
                        + Add again
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="card">
          {events.length === 0 ? (
            <p className="p-8 text-center text-stone-500">No activity matches.</p>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {events.slice(0, limit).map((e) => {
                const style = EVENT_STYLE[e.type];
                const delta =
                  e.quantityDelta !== undefined
                    ? `${e.quantityDelta > 0 ? "+" : "−"}${formatQuantity(Math.abs(e.quantityDelta), e.unit) || Math.abs(e.quantityDelta)}`
                    : "";
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                    <span className={`badge ${style.badge} w-20 justify-center`}>{style.label}</span>
                    <span className="font-medium">{e.itemName}</span>
                    {delta && <span className="text-stone-500">{delta}</span>}
                    {e.quantityAfter !== undefined && (
                      <span className="text-xs text-stone-400">→ {formatQuantity(e.quantityAfter, e.unit) || 0} left</span>
                    )}
                    {e.note && (
                      <span className="text-xs text-stone-500">
                        {e.recipeId ? <Link href={`/recipes/view?id=${e.recipeId}`} className="hover:underline">{e.note}</Link> : e.note}
                      </span>
                    )}
                    <span className="ml-auto text-xs whitespace-nowrap text-stone-400">{formatDateTime(e.at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {events.length > limit && (
            <div className="border-t border-stone-100 p-3 text-center dark:border-stone-800">
              <Link
                href={`/history?tab=activity&limit=${limit + 100}${q ? `&q=${encodeURIComponent(q)}` : ""}${type ? `&type=${type}` : ""}`}
                className="btn btn-sm"
              >
                Show more
              </Link>
            </div>
          )}
        </div>
      )}

      {tab === "meals" && (
        <div className="card">
          {meals.length === 0 ? (
            <p className="p-8 text-center text-stone-500">
              Nothing cooked yet. Hit &ldquo;I cooked this&rdquo; on a recipe to log it.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {meals.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  {db.recipes.some((r) => r.id === m.recipeId) ? (
                    <Link href={`/recipes/view?id=${m.recipeId}`} className="font-medium hover:underline">{m.recipeTitle}</Link>
                  ) : (
                    <span className="font-medium">{m.recipeTitle}</span>
                  )}
                  <span className="text-xs text-stone-400">{formatDateTime(m.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
