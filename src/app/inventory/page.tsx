import type { Metadata } from "next";
import { Suspense } from "react";

import { Loading } from "@/components/page-state";

import { InventoryView } from "./inventory-view";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InventoryView />
    </Suspense>
  );
}
