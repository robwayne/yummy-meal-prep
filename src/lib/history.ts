import { normalizeName } from "./ingredients";
import type { InventoryEvent, InventoryItem, Location } from "./types";

export type ProductHistory = {
  key: string;
  name: string;
  unit: string;
  location: Location;
  timesStocked: number;
  timesUsed: number;
  timesTossed: number;
  firstSeen: string;
  lastSeen: string;
  lastStocked?: string;
  inStock: number;
};

/** Roll the event log up into one row per product you've ever had. */
export function productHistory(events: InventoryEvent[], inventory: InventoryItem[]): ProductHistory[] {
  const map = new Map<string, ProductHistory>();
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  for (const e of sorted) {
    const key = normalizeName(e.itemName);
    let p = map.get(key);
    if (!p) {
      p = {
        key,
        name: e.itemName,
        unit: e.unit,
        location: e.location,
        timesStocked: 0,
        timesUsed: 0,
        timesTossed: 0,
        firstSeen: e.at,
        lastSeen: e.at,
        inStock: 0,
      };
      map.set(key, p);
    }
    p.lastSeen = e.at;
    p.name = e.itemName;
    p.location = e.location;
    if (e.type === "added" || e.type === "restocked") {
      p.timesStocked++;
      p.lastStocked = e.at;
      p.unit = e.unit;
    } else if (e.type === "used" || e.type === "cooked") {
      p.timesUsed++;
    } else if (e.type === "expired") {
      p.timesTossed++;
    }
  }
  for (const item of inventory) {
    const p = map.get(normalizeName(item.name));
    if (p) p.inStock++;
  }
  return [...map.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}
