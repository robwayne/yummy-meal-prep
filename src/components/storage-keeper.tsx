"use client";

import { useEffect } from "react";

/** Ask the browser not to evict our saved data (granted automatically for Home Screen apps on iOS). */
export function StorageKeeper() {
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => undefined);
  }, []);
  return null;
}
