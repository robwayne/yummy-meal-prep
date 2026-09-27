import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { SEED_RECIPES } from "./seed-recipes";
import type { Database } from "./types";

/**
 * A tiny JSON-file database. Everything lives in one file (default
 * `./data/db.json`, override with YUMMY_DATA_DIR) — perfect for a personal app
 * and trivially backed up. Writes are serialised and atomic (temp file + rename).
 */
const DATA_DIR = process.env.YUMMY_DATA_DIR ?? path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export const DEFAULT_STAPLES = ["salt", "pepper", "water", "oil", "olive oil"];

function emptyDatabase(): Database {
  const now = new Date().toISOString();
  return {
    version: 1,
    inventory: [],
    events: [],
    recipes: SEED_RECIPES.map((r) => ({
      ...r,
      id: randomUUID(),
      favorite: false,
      source: "seed" as const,
      createdAt: now,
      updatedAt: now,
    })),
    cookLog: [],
    settings: { staples: DEFAULT_STAPLES, expiringSoonDays: 3 },
  };
}

async function load(): Promise<Database> {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as Database;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    const db = emptyDatabase();
    await persist(db);
    return db;
  }
}

async function persist(db: Database): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await rename(tmp, DB_FILE);
}

// Keep the write queue on globalThis so dev-mode module reloads share it.
const globalForDb = globalThis as unknown as { __yummyQueue?: Promise<unknown> };

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const prev = globalForDb.__yummyQueue ?? Promise.resolve();
  const next = prev.then(task, task);
  globalForDb.__yummyQueue = next.catch(() => undefined);
  return next;
}

/** Read a consistent snapshot of the database. */
export function readDb(): Promise<Database> {
  return enqueue(load);
}

/** Apply a mutation atomically. The callback may mutate `db` in place and return a value. */
export function mutateDb<T>(fn: (db: Database) => T): Promise<T> {
  return enqueue(async () => {
    const db = await load();
    const result = fn(db);
    await persist(db);
    return result;
  });
}

export const newId = () => randomUUID();
