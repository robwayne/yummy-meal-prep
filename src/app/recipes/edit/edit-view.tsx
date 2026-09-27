"use client";

import { useSearchParams } from "next/navigation";

import { Loading, NotFound } from "@/components/page-state";
import { useDb } from "@/lib/store";

import { RecipeForm } from "../recipe-form";

export function EditRecipeView() {
  const id = useSearchParams().get("id");
  const db = useDb();
  if (!db) return <Loading />;
  const recipe = db.recipes.find((r) => r.id === id);
  if (!recipe) return <NotFound what="recipe" backHref="/recipes" backLabel="Back to recipes" />;
  return (
    <div className="space-y-6">
      <h1 className="page-title">Edit {recipe.title}</h1>
      <RecipeForm key={recipe.id} recipe={recipe} />
    </div>
  );
}
