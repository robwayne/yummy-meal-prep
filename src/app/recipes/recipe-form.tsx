"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { ActionState } from "@/app/actions/inventory";
import { saveRecipe } from "@/app/actions/recipes";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { formatIngredient } from "@/lib/ingredients";
import type { Recipe } from "@/lib/types";

const initial: ActionState = {};

export function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const [state, action] = useActionState(saveRecipe.bind(null, recipe?.id ?? null), initial);
  const ingredientText = recipe?.ingredients
    .map((i) => `${formatIngredient(i)}${i.note ? ` (${i.note})` : ""}${i.optional ? " (optional)" : ""}`)
    .join("\n");

  return (
    <form action={action} className="card grid gap-4 p-4 sm:grid-cols-6 sm:p-6">
      <div className="sm:col-span-4">
        <label className="label" htmlFor="title">Title</label>
        <input id="title" name="title" defaultValue={recipe?.title} className="input" required />
        <FieldError state={state} name="title" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="cuisine">Cuisine</label>
        <input id="cuisine" name="cuisine" defaultValue={recipe?.cuisine} placeholder="Italian, Thai…" className="input" />
      </div>
      <div className="sm:col-span-6">
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={2} defaultValue={recipe?.description} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="servings">Servings</label>
        <input id="servings" name="servings" type="number" min={1} defaultValue={recipe?.servings ?? 2} className="input" />
        <FieldError state={state} name="servings" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="prep">Prep (min)</label>
        <input id="prep" name="prepMinutes" type="number" min={0} defaultValue={recipe?.prepMinutes ?? 10} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="cook">Cook (min)</label>
        <input id="cook" name="cookMinutes" type="number" min={0} defaultValue={recipe?.cookMinutes ?? 20} className="input" />
      </div>
      <div className="sm:col-span-6">
        <label className="label" htmlFor="tags">Tags (comma separated)</label>
        <input id="tags" name="tags" defaultValue={recipe?.tags.join(", ")} placeholder="dinner, quick, vegetarian" className="input" />
      </div>
      <div className="sm:col-span-3">
        <label className="label" htmlFor="ingredients">Ingredients — one per line</label>
        <textarea
          id="ingredients"
          name="ingredients"
          rows={12}
          defaultValue={ingredientText}
          placeholder={"2 cups rice\n1 lb chicken thighs\n3 cloves garlic\nsalt\nparsley (optional)"}
          className="input font-mono"
          required
        />
        <p className="mt-1 text-xs text-stone-500">Add &ldquo;(optional)&rdquo; to anything you can skip.</p>
        <FieldError state={state} name="ingredients" />
      </div>
      <div className="sm:col-span-3">
        <label className="label" htmlFor="steps">Steps — one per line</label>
        <textarea
          id="steps"
          name="steps"
          rows={12}
          defaultValue={recipe?.steps.join("\n")}
          placeholder={"Cook the rice.\nBrown the chicken.\n…"}
          className="input"
        />
      </div>
      <div className="flex items-center gap-3 sm:col-span-6">
        <SubmitButton pendingText="Saving…">{recipe ? "Save changes" : "Add recipe"}</SubmitButton>
        <Link href={recipe ? `/recipes/${recipe.id}` : "/recipes"} className="btn">Cancel</Link>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
