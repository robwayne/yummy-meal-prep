"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Loading, NotFound } from "@/components/page-state";
import { MatchBar, RecipeCard } from "@/components/recipe-card";
import { deleteRecipe, rateRecipe, toggleFavorite } from "@/lib/actions";
import { formatDate, totalMinutes } from "@/lib/format";
import { formatIngredient } from "@/lib/ingredients";
import { matchRecipe, planConsumption, similarRecipes, type MatchStatus } from "@/lib/recommend";
import { useDb } from "@/lib/store";

import { CookForm } from "./cook-form";

const STATUS: Record<MatchStatus, { icon: string; label: string; className: string }> = {
  have: { icon: "✓", label: "In your kitchen", className: "text-brand-600" },
  low: { icon: "!", label: "You may not have enough", className: "text-amber-600" },
  staple: { icon: "✓", label: "Pantry staple", className: "text-stone-400" },
  missing: { icon: "✗", label: "Missing", className: "text-red-500" },
};

export function RecipeView() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const db = useDb();
  const recipe = db?.recipes.find((r) => r.id === id);

  useEffect(() => {
    if (recipe) document.title = `${recipe.title} · Yummy Meal Prep`;
  }, [recipe]);

  if (!db) return <Loading />;
  if (!recipe) return <NotFound what="recipe" backHref="/recipes" backLabel="Back to recipes" />;

  const match = matchRecipe(recipe, {
    inventory: db.inventory,
    staples: db.settings.staples,
    cookLog: db.cookLog,
    recipes: db.recipes,
    expiringSoonDays: db.settings.expiringSoonDays,
  });
  const plan = planConsumption(recipe, db.inventory, db.settings.staples);
  const similar = similarRecipes(recipe, db.recipes);
  const cooked = db.cookLog.filter((c) => c.recipeId === recipe.id).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <Link href="/recipes" className="text-sm text-stone-500 hover:underline">← Recipe book</Link>
          <h1 className="page-title">{recipe.title}</h1>
          {recipe.description && <p className="text-stone-600 dark:text-stone-400">{recipe.description}</p>}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="badge badge-muted">Serves {recipe.servings}</span>
            <span className="badge badge-muted">Prep {recipe.prepMinutes} min</span>
            <span className="badge badge-muted">Cook {recipe.cookMinutes} min</span>
            <span className="badge badge-muted">Total {totalMinutes(recipe)}</span>
            <span className="badge badge-muted">{recipe.cuisine}</span>
            {recipe.tags.map((t) => (
              <Link key={t} href={`/recipes?tag=${encodeURIComponent(t)}`} className="badge badge-green">#{t}</Link>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn" onClick={() => toggleFavorite(recipe.id)} aria-pressed={recipe.favorite}>
            {recipe.favorite ? "❤️ Favourite" : "🤍 Favourite"}
          </button>
          <div className="flex items-center rounded-lg border border-stone-300 px-1 dark:border-stone-700" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                title={`Rate ${n}`}
                aria-label={`Rate ${n} out of 5`}
                onClick={() => rateRecipe(recipe.id, n)}
                className={`px-1 py-1 text-xl ${n <= (recipe.rating ?? 0) ? "text-amber-500" : "text-stone-300 dark:text-stone-600"}`}
              >
                ★
              </button>
            ))}
          </div>
          <Link href={`/recipes/edit?id=${recipe.id}`} className="btn">Edit</Link>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (!confirm(`Delete "${recipe.title}"? This can't be undone.`)) return;
              router.push("/recipes");
              deleteRecipe(recipe.id);
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card space-y-4 p-5 lg:col-span-1">
          <h2 className="section-title">Ingredients</h2>
          <MatchBar match={match} />
          <ul className="space-y-2">
            {match.ingredients.map((m, idx) => {
              const s = STATUS[m.status];
              return (
                <li key={idx} className="flex gap-2 text-sm">
                  <span className={`w-4 shrink-0 font-bold ${s.className}`} title={s.label}>{s.icon}</span>
                  <span className="min-w-0">
                    <span className={m.status === "missing" && !m.ingredient.optional ? "font-medium" : ""}>
                      {formatIngredient(m.ingredient)}
                    </span>
                    {m.ingredient.note && <span className="text-stone-500">, {m.ingredient.note}</span>}
                    {m.ingredient.optional && <span className="text-stone-400"> (optional)</span>}
                    {m.items.length > 0 && (
                      <span className="block text-xs text-stone-500">
                        {s.label}: {m.items.map((i) => `${i.name} (${i.quantity}${i.unit ? ` ${i.unit}` : ""})`).join(", ")}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {match.missing.length > 0 && (
            <div className="rounded-lg bg-stone-100 p-3 text-sm dark:bg-stone-800">
              <p className="font-medium">Shopping list</p>
              <p className="text-stone-600 dark:text-stone-400">{match.missing.map((m) => m.name).join(", ")}</p>
            </div>
          )}
          <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
            <CookForm recipeId={recipe.id} plan={plan} />
          </div>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="section-title mb-4">Method</h2>
          {recipe.steps.length ? (
            <ol className="space-y-4">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-stone-500">No steps yet. <Link href={`/recipes/edit?id=${recipe.id}`} className="underline">Add some</Link>.</p>
          )}
          {cooked.length > 0 && (
            <p className="mt-6 text-sm text-stone-500">
              Cooked {cooked.length} time{cooked.length === 1 ? "" : "s"} · last on {formatDate(cooked[0].at)}
            </p>
          )}
        </section>
      </div>

      {similar.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">You might also like</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
