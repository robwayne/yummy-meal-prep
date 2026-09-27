"use client";

import Form from "next/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Loading } from "@/components/page-state";
import { discardAllExpired } from "@/lib/actions";
import { freshness } from "@/lib/recommend";
import { isLow, isVital, lowThreshold } from "@/lib/shopping";
import { useDb } from "@/lib/store";
import { LOCATION_LABELS, LOCATIONS, type Location } from "@/lib/types";

import { AddItemPanel } from "./add-item-panel";
import { ItemRow } from "./item-row";
import { TransferPanel } from "./transfer-panel";

export function InventoryView() {
  const sp = useSearchParams();
  const db = useDb();
  if (!db) return <Loading />;

  const q = sp.get("q")?.trim().toLowerCase() ?? "";
  const soonDays = db.settings.expiringSoonDays;

  const items = db.inventory
    .filter((i) => !q || i.name.toLowerCase().includes(q))
    .sort((a, b) => (a.expiresOn ?? "9999").localeCompare(b.expiresOn ?? "9999") || a.name.localeCompare(b.name));

  const expired = db.inventory.filter((i) => freshness(i, soonDays) === "expired");
  const soon = db.inventory.filter((i) => freshness(i, soonDays) === "soon");

  // Everything that has ever been in the inventory, for autocomplete.
  const suggestions = [...new Set(db.events.map((e) => e.itemName))].sort((a, b) => a.localeCompare(b));

  const addLocation = sp.get("location");
  const defaults = {
    name: sp.get("add") ?? undefined,
    unit: sp.get("unit") ?? undefined,
    location: LOCATIONS.includes(addLocation as Location) ? (addLocation as Location) : undefined,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-stone-500">
            {db.inventory.length} item{db.inventory.length === 1 ? "" : "s"} across your kitchen
            {soon.length > 0 && <> · <span className="text-amber-700 dark:text-amber-400">{soon.length} expiring soon</span></>}
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <Link href="/history" className="btn">View history</Link>
          <Link href="/cook" className="btn btn-primary">What can I cook?</Link>
        </div>
      </div>

      <AddItemPanel key={defaults.name ?? ""} defaults={defaults} suggestions={suggestions} />

      <TransferPanel items={db.inventory} />

      {expired.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/40">
          <p>
            <strong>{expired.length} item{expired.length === 1 ? " is" : "s are"} past their date:</strong>{" "}
            {expired.map((i) => i.name).join(", ")}. They&apos;re excluded from recommendations.
          </p>
          <button type="button" className="btn btn-sm btn-danger" onClick={discardAllExpired}>Toss all expired</button>
        </div>
      )}

      <Form action="/inventory" className="flex gap-2" role="search">
        <input name="q" type="search" defaultValue={q} placeholder="Search your inventory…" className="input max-w-sm" />
        <button className="btn">Search</button>
        {q && <Link href="/inventory" className="btn">Clear</Link>}
      </Form>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-stone-500">
          {q ? "Nothing matches that search." : "Your inventory is empty. Add what's in your fridge and cabinets above to get recommendations."}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {LOCATIONS.map((loc) => {
            const here = items.filter((i) => i.location === loc);
            if (!here.length) return null;
            return (
              <section key={loc} className="card p-4 sm:p-5">
                <h2 className="section-title flex items-center justify-between">
                  {LOCATION_LABELS[loc]}
                  <span className="badge badge-muted">{here.length}</span>
                </h2>
                <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                  {here.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      soonDays={soonDays}
                      vital={isVital(db, item.name)}
                      low={isLow(db, item)}
                      threshold={lowThreshold(db, item)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
