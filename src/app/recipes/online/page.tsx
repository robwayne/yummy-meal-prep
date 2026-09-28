import type { Metadata } from "next";
import { Suspense } from "react";

import { Loading } from "@/components/page-state";

import { OnlineRecipeView } from "./online-view";

export const metadata: Metadata = { title: "Online recipe" };

export default function OnlineRecipePage() {
  return (
    <Suspense fallback={<Loading />}>
      <OnlineRecipeView />
    </Suspense>
  );
}
