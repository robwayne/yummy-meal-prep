import { SEED_RECIPES, SEED_RECIPES_V2, SEED_VERSION, type SeedRecipe } from "./seed-recipes";
import type { Database, Recipe } from "./types";

export const DEFAULT_STAPLES = ["salt", "pepper", "water", "oil", "olive oil"];

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function fromSeed(r: SeedRecipe, now: string): Recipe {
  return { ...r, id: newId(), favorite: false, source: "seed", createdAt: now, updatedAt: now };
}

/** A fresh database, seeded with the starter recipe book. */
export function createDatabase(): Database {
  const now = new Date().toISOString();
  return {
    version: 1,
    seedVersion: SEED_VERSION,
    inventory: [],
    events: [],
    recipes: [...SEED_RECIPES, ...SEED_RECIPES_V2].map((r) => fromSeed(r, now)),
    cookLog: [],
    settings: { staples: DEFAULT_STAPLES, expiringSoonDays: 3 },
  };
}

/**
 * Bring an older saved database up to date in place: adds starter recipes
 * introduced since it was created (skipping any title already present).
 * Returns true if anything changed.
 */
export function migrateDatabase(db: Database): boolean {
  if ((db.seedVersion ?? 1) >= SEED_VERSION) return false;
  const now = new Date().toISOString();
  const titles = new Set(db.recipes.map((r) => r.title.toLowerCase()));
  for (const r of SEED_RECIPES_V2) {
    if (!titles.has(r.title.toLowerCase())) db.recipes.push(fromSeed(r, now));
  }
  db.seedVersion = SEED_VERSION;
  return true;
}

/** Loose check that parsed JSON is a database (used when restoring a backup). */
export function isDatabase(value: unknown): value is Database {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    Array.isArray(v.inventory) &&
    Array.isArray(v.events) &&
    Array.isArray(v.recipes) &&
    Array.isArray(v.cookLog) &&
    typeof v.settings === "object" &&
    v.settings !== null
  );
}
