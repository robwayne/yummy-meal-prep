import type { Metadata } from "next";
import { Suspense } from "react";

import { Loading } from "@/components/page-state";

import { EditRecipeView } from "./edit-view";

export const metadata: Metadata = { title: "Edit recipe" };

export default function EditRecipePage() {
  return (
    <Suspense fallback={<Loading />}>
      <EditRecipeView />
    </Suspense>
  );
}
