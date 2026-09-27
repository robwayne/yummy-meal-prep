import { relativeDays } from "@/lib/format";
import { daysUntil } from "@/lib/recommend";
import type { InventoryItem } from "@/lib/types";

export function ExpiryBadge({ item, soonDays }: { item: InventoryItem; soonDays: number }) {
  if (!item.expiresOn) return null;
  const d = daysUntil(item.expiresOn);
  if (d < 0) return <span className="badge badge-red">Expired {relativeDays(d)}</span>;
  if (d <= soonDays) return <span className="badge badge-amber">Expires {relativeDays(d)}</span>;
  return <span className="badge badge-muted">Expires {relativeDays(d)}</span>;
}
