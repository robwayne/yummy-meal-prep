import type { Metadata } from "next";
import { Suspense } from "react";

import { Loading } from "@/components/page-state";

import { CookView } from "./cook-view";

export const metadata: Metadata = { title: "What can I cook?" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CookView />
    </Suspense>
  );
}
