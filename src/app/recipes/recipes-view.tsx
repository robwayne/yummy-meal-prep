"use client";

import Form from "next/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { RecipeCard } from "@/components/recipe-card";
import { normalizeName } from "@/lib/ingredients";
import { Loading } from "@/components/page-state";
import { contextFor, matchRecipe, tasteProfile } from "@/lib/recommend";
import { useDb } from "@/lib/store";

const SORTS = { match: "Best match", az: "A–Z", time: "Quickest", new: "Newest" } as const;

export function RecipesView() {
  const sp = useSearchParams();
  const db = useDb();
  if (!db) return <Loading />;

  const q = sp.get("q")?.trim().toLowerCase() ?? "";
  const tag = sp.get("tag") ?? "";
  const favOnly = sp.get("fav") === "1";
  const sortParam = sp.get("sort") ?? "match";
  const sort = (sortParam in SORTS ? sortParam : "match") as keyof typeof SORTS;

  const allTags = [...new Set(db.recipes.flatMap((r) => r.tags))].sort();
  const ctx = contextFor(db);
  const profile = tasteProfile(db.recipes, db.cookLog);

  const qName = q ? normalizeName(q) : "";
  const results = db.recipes
    .filter((r) => !favOnly || r.favorite)
    .filter((r) => !tag || r.tags.includes(tag))
    .filter(
      (r) =>
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.tags.some((t) => t.includes(q)) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q) || normalizeName(i.name) === qName),
    )
    .map((r) => ({ recipe: r, match: matchRecipe(r, ctx, profile) }));

  results.sort((a, b) => {
    switch (sort) {
      case "az":
        return a.recipe.title.localeCompare(b.recipe.title);
      case "time":
        return a.recipe.prepMinutes + a.recipe.cookMinutes - (b.recipe.prepMinutes + b.recipe.cookMinutes);
      case "new":
        return b.recipe.createdAt.localeCompare(a.recipe.createdAt);
      default:
        return b.match.score - a.match.score;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Recipe book</h1>
          <p className="text-stone-500">{db.recipes.length} recipes · search by name, cuisine, tag or ingredient</p>
        </div>
        <Link href="/recipes/new" className="btn btn-primary">+ New recipe</Link>
      </div>

      <Form action="/recipes" className="card grid gap-3 p-4 sm:grid-cols-12" role="search">
        <input name="q" type="search" defaultValue={q} placeholder="Search… e.g. chicken, pasta, quick" className="input sm:col-span-4" />
        <select name="tag" defaultValue={tag} className="input sm:col-span-3">
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>#{t}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className="input sm:col-span-2">
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="fav" value="1" defaultChecked={favOnly} className="accent-brand-600" />
          Favourites
        </label>
        <button className="btn sm:col-span-1">Go</button>
      </Form>

      {results.length === 0 ? (
        <div className="card p-8 text-center text-stone-500">No recipes match. Try a different search or add your own.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(({ recipe, match }) => (
            <RecipeCard key={recipe.id} recipe={recipe} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
