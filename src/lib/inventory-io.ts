/**
 * Inventory as a plain text file, one item per line, that can be saved on the
 * phone and imported again later (or pasted into Quick list).
 */
import { formatQuantity, parseIngredientLine, type ParsedIngredient } from "./ingredients";
import { LOCATION_LABELS, LOCATIONS, type InventoryItem, type Location } from "./types";

export type ImportedLine = ParsedIngredient & { location?: Location; expiresOn?: string };

function lineFor(item: InventoryItem): string {
  const qty = formatQuantity(item.quantity, item.unit) || String(item.quantity);
  const note = item.notes ? ` (${item.notes.replace(/[()|]/g, " ").trim()})` : "";
  const parts = [`${qty} ${item.name}${note}`, item.location];
  if (item.expiresOn) parts.push(item.expiresOn);
  return parts.join(" | ");
}

/**
 * One line per item: "2 lb chicken thighs | fridge | 2026-10-01".
 * Paste it into Quick list to add everything back, locations and dates included.
 */
export function inventoryToText(items: InventoryItem[], now = new Date()): string {
  const sorted = [...items].sort(
    (a, b) => LOCATIONS.indexOf(a.location) - LOCATIONS.indexOf(b.location) || a.name.localeCompare(b.name),
  );
  const header = `# Yummy Meal Prep inventory · ${now.toISOString().slice(0, 10)} · ${items.length} items`;
  return [header, ...sorted.map(lineFor)].join("\n");
}

function parseLocation(text: string): Location | undefined {
  const t = text.trim().toLowerCase();
  if (!t) return undefined;
  const byKey = LOCATIONS.find((l) => l === t);
  if (byKey) return byKey;
  if (/cabinet|cupboard|pantry/.test(t)) return "pantry";
  if (/spice/.test(t)) return "spices";
  return LOCATIONS.find((l) => LOCATION_LABELS[l].toLowerCase() === t);
}

/** Parse one line of a list, with optional "| location | YYYY-MM-DD" parts. Comment lines (#) are skipped. */
export function parseInventoryLine(raw: string): ImportedLine | undefined {
  const line = raw.trim();
  if (!line || line.startsWith("#")) return undefined;
  const [main, ...extras] = line.split("|");
  const parsed = parseIngredientLine(main);
  if (!parsed) return undefined;
  const result: ImportedLine = { ...parsed };
  for (const extra of extras) {
    const e = extra.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(e)) result.expiresOn = e;
    else result.location ??= parseLocation(e);
  }
  return result;
}

export function parseInventoryText(text: string): ImportedLine[] {
  return text
    .split(/\r?\n/)
    .map(parseInventoryLine)
    .filter((x): x is ImportedLine => Boolean(x));
}
