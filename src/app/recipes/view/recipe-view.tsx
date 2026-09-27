"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Loading, NotFound } from "@/components/page-state";
import { BalanceRow, MatchBar, RecipeCard } from "@/components/recipe-card";
import { deleteRecipe, rateRecipe, toggleFavorite } from "@/lib/actions";
import { adaptRecipe } from "@/lib/adapt";
import { formatDate, totalMinutes } from "@/lib/format";
import { formatIngredient } from "@/lib/ingredients";
import { GROUP_INFO, roundItOut } from "@/lib/nutrition";
import {
  contextFor,
  matchRecipe,
  planConsumption,
  similarRecipes,
  usableInventory,
  type MatchStatus,
} from "@/lib/recommend";
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
  const saved = db?.recipes.find((r) => r.id === id);
  const match = db && saved ? matchRecipe(saved, contextFor(db)) : undefined;
  // Shown with your substitute protein, if one is being used (the saved recipe is unchanged).
  const recipe = saved && adaptRecipe(saved, match?.swap);

  useEffect(() => {
    if (recipe) document.title = `${recipe.title} · Yummy Meal Prep`;
  }, [recipe?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!db) return <Loading />;
  if (!recipe || !match) return <NotFound what="recipe" backHref="/recipes" backLabel="Back to recipes" />;

  const ctx = contextFor(db);
  const sides = roundItOut(match.balance, usableInventory(db.inventory), ctx.diet ?? "everything");
  const plan = planConsumption(recipe, db.inventory, db.settings.staples);
  // Only suggest dishes you could actually make the main protein for.
  const similar = similarRecipes(saved!, db.recipes, 12)
    .map((r) => matchRecipe(r, ctx))
    .filter((m) => m.proteinAvailable)
    .slice(0, 4);
  const cooked = db.cookLog.filter((c) => c.recipeId === recipe.id).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <Link href="/recipes" className="text-sm text-stone-500 hover:underline">← Recipe book</Link>
          <h1 className="page-title">{recipe.title}</h1>
          {recipe.description && <p className="text-stone-600 dark:text-stone-400">{recipe.description}</p>}
          {match.swap && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              🔁 Using your <strong>{match.swap.to}</strong> instead of {match.swap.from}. Cook times may differ a little.
            </p>
          )}
          {!match.proteinAvailable && match.balance.mainProtein && (
            <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm dark:bg-stone-800">
              You don&apos;t have {match.balance.mainProtein.ingredient.name} (or a substitute), so this isn&apos;t being
              recommended right now.
            </p>
          )}
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
          <div className="space-y-2 rounded-lg border border-stone-200 p-3 dark:border-stone-800">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Plate balance</p>
            <BalanceRow balance={match.balance} swap={match.swap} />
            {match.balance.mainProtein && match.balance.mainProtein.kind === "other" && (
              <p className="text-xs text-stone-500">No meat or seafood — protein comes from {match.balance.mainProtein.ingredient.name}.</p>
            )}
            {sides.length > 0 && (
              <div className="text-sm">
                <p className="font-medium">Round it out with a side from your kitchen:</p>
                <ul className="mt-1 space-y-0.5 text-stone-600 dark:text-stone-400">
                  {sides.map((s) => (
                    <li key={s.group}>
                      {GROUP_INFO[s.group].icon} {GROUP_INFO[s.group].label}: {s.items.map((i) => i.name).join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <ul className="space-y-2">
            {match.ingredients.map((m, idx) => {
              const s = STATUS[m.status];
              return (
                <li key={idx} className="flex gap-2 text-sm">
                  <span className={`w-4 shrink-0 font-bold ${s.className}`} title={s.label}>{s.icon}</span>
                  <span className="min-w-0">
                    <span className={m.status === "missing" && !m.ingredient.optional ? "font-medium" : ""}>
                      {m.swappedFor ? (
                        <>
                          {formatIngredient({ ...m.ingredient, name: m.swappedFor.name })}{" "}
                          <span className="text-amber-700 dark:text-amber-400">(instead of {m.ingredient.name})</span>
                        </>
                      ) : (
                        formatIngredient(m.ingredient)
                      )}
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
            {similar.map((m) => (
              <RecipeCard key={m.recipe.id} recipe={m.recipe} match={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
