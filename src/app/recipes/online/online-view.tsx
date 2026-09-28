"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AddMissingButton } from "@/components/add-missing-button";
import { Loading } from "@/components/page-state";
import { BalanceRow, MatchBar } from "@/components/recipe-card";
import { saveOnlineRecipe } from "@/lib/actions";
import { adaptRecipe } from "@/lib/adapt";
import { totalMinutes } from "@/lib/format";
import { formatIngredient } from "@/lib/ingredients";
import { fetchOnlineRecipe } from "@/lib/online-recipes";
import { contextFor, matchRecipe, type MatchStatus } from "@/lib/recommend";
import { useDb } from "@/lib/store";
import type { Recipe } from "@/lib/types";

const STATUS: Record<MatchStatus, { icon: string; label: string; className: string }> = {
  have: { icon: "✓", label: "In your kitchen", className: "text-brand-600" },
  low: { icon: "!", label: "You may not have enough", className: "text-amber-600" },
  staple: { icon: "✓", label: "Pantry staple", className: "text-stone-400" },
  missing: { icon: "✗", label: "Missing", className: "text-red-500" },
};

type Loaded = { ref: string; recipe?: Recipe; failed?: boolean };

export function OnlineRecipeView() {
  const ref = useSearchParams().get("ref") ?? "";
  const router = useRouter();
  const db = useDb();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOnlineRecipe(ref).then(
      (recipe) => !cancelled && setLoaded({ ref, recipe, failed: !recipe }),
      () => !cancelled && setLoaded({ ref, failed: true }),
    );
    return () => {
      cancelled = true;
    };
  }, [ref]);

  const saved = db?.recipes.find((r) => r.externalId && r.externalId === ref);
  useEffect(() => {
    if (saved) router.replace(`/recipes/view?id=${saved.id}`);
  }, [saved, router]);

  if (!db || !loaded || loaded.ref !== ref || saved) return <Loading />;
  if (!loaded.recipe) {
    return (
      <div className="card space-y-3 p-8 text-center">
        <p className="text-stone-600 dark:text-stone-400">Couldn&apos;t load that recipe — check your connection and try again.</p>
        <Link href="/recipes" className="btn">Back to recipes</Link>
      </div>
    );
  }

  const online = loaded.recipe;
  const match = matchRecipe(online, contextFor(db));
  const recipe = adaptRecipe(online, match.swap);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <button type="button" onClick={() => router.back()} className="text-sm text-stone-500 hover:underline">← Back</button>
        {recipe.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.image} alt="" className="h-48 w-full rounded-2xl object-cover sm:h-64" />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="page-title">{recipe.title}</h1>
          <span className="badge badge-muted">🌐 Online</span>
        </div>
        {recipe.description && <p className="text-stone-600 dark:text-stone-400">{recipe.description}</p>}
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="badge badge-muted">Serves {recipe.servings}</span>
          <span className="badge badge-muted">Total ~{totalMinutes(recipe)}</span>
          <span className="badge badge-muted">{recipe.cuisine}</span>
          {recipe.tags.slice(0, 5).map((t) => (
            <span key={t} className="badge badge-green">#{t}</span>
          ))}
        </div>
        {match.swap && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            🔁 Using your <strong>{match.swap.to}</strong> instead of {match.swap.from}.
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push(`/recipes/view?id=${saveOnlineRecipe(online)}`)}
          >
            📖 Save to my recipes
          </button>
          {recipe.sourceUrl && (
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="btn">Original ↗</a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card space-y-4 p-5">
          <h2 className="section-title">Ingredients</h2>
          <MatchBar match={match} />
          <BalanceRow balance={match.balance} swap={match.swap} />
          <ul className="space-y-2">
            {match.ingredients.map((m, idx) => {
              const s = STATUS[m.status];
              return (
                <li key={idx} className="flex gap-2 text-sm">
                  <span className={`w-4 shrink-0 font-bold ${s.className}`} title={s.label}>{s.icon}</span>
                  <span className="min-w-0">
                    {formatIngredient(m.swappedFor ? { ...m.ingredient, name: m.swappedFor.name } : m.ingredient)}
                    {m.ingredient.note && <span className="text-stone-500"> ({m.ingredient.note})</span>}
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
          {match.missing.length > 0 ? (
            <div className="space-y-2 rounded-lg bg-stone-100 p-3 text-sm dark:bg-stone-800">
              <p className="font-medium">Missing</p>
              <p className="text-stone-600 dark:text-stone-400">{match.missing.map((m) => m.name).join(", ")}</p>
              <AddMissingButton title={recipe.title} missing={match.missing} />
            </div>
          ) : (
            <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              ✓ You have everything for this.
            </p>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="section-title mb-4">Method</h2>
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
          <p className="mt-6 text-xs text-stone-500">
            Save it to your book to log cooking it, rate it and get it in recommendations.
          </p>
        </section>
      </div>
    </div>
  );
}
