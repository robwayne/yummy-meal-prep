export const LOCATIONS = ["fridge", "freezer", "pantry", "spices", "other"] as const;
export type Location = (typeof LOCATIONS)[number];

export const LOCATION_LABELS: Record<Location, string> = {
  fridge: "Fridge",
  freezer: "Freezer",
  pantry: "Pantry / Cabinet",
  spices: "Spice rack",
  other: "Other",
};

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: Location;
  /** ISO date (YYYY-MM-DD) */
  expiresOn?: string;
  notes?: string;
  addedAt: string;
  updatedAt: string;
};

export const EVENT_TYPES = [
  "added",
  "restocked",
  "updated",
  "used",
  "cooked",
  "expired",
  "removed",
] as const;
export type InventoryEventType = (typeof EVENT_TYPES)[number];

/** Append-only log entry. This is the durable history of everything that passed through the inventory. */
export type InventoryEvent = {
  id: string;
  itemId: string;
  itemName: string;
  type: InventoryEventType;
  /** Signed change in quantity, in `unit`. */
  quantityDelta?: number;
  quantityAfter?: number;
  unit: string;
  location: Location;
  at: string;
  note?: string;
  recipeId?: string;
};

export type RecipeIngredient = {
  name: string;
  quantity?: number;
  unit?: string;
  optional?: boolean;
  note?: string;
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  cuisine: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  favorite: boolean;
  /** 1–5 */
  rating?: number;
  source: "seed" | "user";
  createdAt: string;
  updatedAt: string;
};

export type CookLogEntry = {
  id: string;
  recipeId: string;
  recipeTitle: string;
  at: string;
};

export type Settings = {
  /** Ingredients always assumed to be on hand (salt, water, ...). */
  staples: string[];
  /** Items expiring within this many days are flagged and prioritised. */
  expiringSoonDays: number;
};

export type Database = {
  version: 1;
  inventory: InventoryItem[];
  events: InventoryEvent[];
  recipes: Recipe[];
  cookLog: CookLogEntry[];
  settings: Settings;
};
