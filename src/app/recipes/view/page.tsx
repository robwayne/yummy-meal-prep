import type { Metadata } from "next";
import { Suspense } from "react";

import { Loading } from "@/components/page-state";

import { RecipeView } from "./recipe-view";

export const metadata: Metadata = { title: "Recipe" };

export default function RecipePage() {
  return (
    <Suspense fallback={<Loading />}>
      <RecipeView />
    </Suspense>
  );
}
