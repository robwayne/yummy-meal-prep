import type { Metadata } from "next";

import { RecipeForm } from "../recipe-form";

export const metadata: Metadata = { title: "New recipe" };

export default function NewRecipePage() {
  return (
    <div className="space-y-6">
      <h1 className="page-title">New recipe</h1>
      <RecipeForm />
    </div>
  );
}
