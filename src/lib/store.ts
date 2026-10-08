import { useSyncExternalStore } from "react";

import { createDatabase, isDatabase, migrateDatabase } from "./database";
import type { Database } from "./types";

/**
 * All data lives in the browser's localStorage under one key. The store keeps
 * an immutable snapshot in memory; every mutation works on a copy, saves it and
 * notifies subscribers (and other open tabs, via the `storage` event).
 *
 * Outside a browser (tests) it falls back to memory only.
 */
export const STORAGE_KEY = "hungryhungryrob:db";
/** Where data was kept before the app was renamed; moved over on first load. */
const LEGACY_KEYS = ["yummy-meal-prep:db"];

let cache: Database | null = null;
const listeners = new Set<() => void>();

function hasStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function save(db: Database) {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error("Couldn't save to browser storage", err);
  }
}

function load(): Database {
  if (hasStorage()) {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Carry data over from the old name, then tidy up.
        for (const key of LEGACY_KEYS) {
          const old = localStorage.getItem(key);
          if (!old) continue;
          localStorage.setItem(STORAGE_KEY, old);
          localStorage.removeItem(key);
          raw = old;
          break;
        }
      }
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isDatabase(parsed)) {
          if (migrateDatabase(parsed)) save(parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.error("Couldn't read browser storage; starting fresh", err);
    }
  }
  const db = createDatabase();
  save(db);
  return db;
}

function emit() {
  for (const l of listeners) l();
}

export function getDb(): Database {
  if (!cache) cache = load();
  return cache;
}

/** Apply a change. `fn` receives a mutable copy; its return value is passed through. */
export function mutate<T>(fn: (db: Database) => T): T {
  const draft = structuredClone(getDb());
  const result = fn(draft);
  cache = draft;
  save(draft);
  emit();
  return result;
}

/** Replace everything (restoring a backup, or resetting). */
export function replaceDb(db: Database) {
  cache = db;
  save(db);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The current database, or `null` while prerendering (there's no localStorage at build time). */
export function useDb(): Database | null {
  return useSyncExternalStore(subscribe, getDb, () => null);
}
