import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getData } from "@/lib/queries";

import { RecipeForm } from "../../recipe-form";

export const metadata: Metadata = { title: "Edit recipe" };

export default async function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  const { id } = await params;
  const db = await getData();
  const recipe = db.recipes.find((r) => r.id === id);
  if (!recipe) notFound();
  return (
    <div className="space-y-6">
      <h1 className="page-title">Edit {recipe.title}</h1>
      <RecipeForm recipe={recipe} />
    </div>
  );
}
