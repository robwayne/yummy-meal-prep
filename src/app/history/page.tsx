import type { Metadata } from "next";
import { Suspense } from "react";

import { Loading } from "@/components/page-state";

import { HistoryView } from "./history-view";

export const metadata: Metadata = { title: "History" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <HistoryView />
    </Suspense>
  );
}
