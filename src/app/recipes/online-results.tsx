"use client";

import { useEffect, useState } from "react";

import { RecipeCard } from "@/components/recipe-card";
import { searchOnline } from "@/lib/online-recipes";
import { matchRecipe, type RecommendContext } from "@/lib/recommend";
import type { Recipe } from "@/lib/types";

/** Results for a given query; anything for a different query means we're still loading. */
type Results = { query: string; recipes: Recipe[]; offline: boolean };

/** Online search results for a query, matched against your kitchen. */
export function OnlineResults({ query, ctx, saved }: { query: string; ctx: RecommendContext; saved: Recipe[] }) {
  const [results, setResults] = useState<Results | null>(null);
  const loading = results?.query !== query;

  useEffect(() => {
    let cancelled = false;
    searchOnline(query).then(
      (r) => !cancelled && setResults({ query, ...r }),
      () => !cancelled && setResults({ query, recipes: [], offline: true }),
    );
    return () => {
      cancelled = true;
    };
  }, [query]);

  const savedTitles = new Set(saved.map((r) => r.title.toLowerCase()));
  const savedByExternal = new Map(saved.filter((r) => r.externalId).map((r) => [r.externalId!, r.id]));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="section-title">🌐 More recipes online</h2>
        <p className="text-sm text-stone-500">From TheMealDB and DummyJSON — matched against your kitchen.</p>
      </div>
      {loading || !results ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-48 animate-pulse" />
          ))}
        </div>
      ) : results.recipes.length === 0 ? (
        <p className="card p-6 text-sm text-stone-500">
          {results.offline
            ? "Couldn't reach the online recipe sites — check your connection and try again."
            : `No online recipes found for “${query}”. Try a simpler word, like “cookie” or “curry”.`}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.recipes
            .filter((r) => !savedTitles.has(r.title.toLowerCase()) || savedByExternal.has(r.externalId!))
            .map((r) => {
              const savedId = savedByExternal.get(r.externalId!);
              return (
                <RecipeCard
                  key={r.externalId}
                  recipe={r}
                  match={matchRecipe(r, ctx)}
                  href={savedId ? `/recipes/view?id=${savedId}` : `/recipes/online?ref=${encodeURIComponent(r.externalId!)}`}
                  badge={savedId ? "In your book" : "Online"}
                />
              );
            })}
        </div>
      )}
    </section>
  );
}
