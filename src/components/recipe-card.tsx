import Link from "next/link";

import { totalMinutes } from "@/lib/format";
import { GROUP_INFO, recipeBalance, type Balance, type FoodGroup } from "@/lib/nutrition";
import type { RecipeMatch } from "@/lib/recommend";
import type { Recipe } from "@/lib/types";

export function MatchBar({ match }: { match: RecipeMatch }) {
  const pct = Math.round(match.coverage * 100);
  const color = match.missing.length === 0 ? "bg-brand-500" : match.missing.length <= 2 ? "bg-amber-500" : "bg-stone-400";
  return (
    <div>
      <div className="flex justify-between text-xs text-stone-500">
        <span>
          {match.haveCount}/{match.requiredCount} ingredients
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const GROUPS: FoodGroup[] = ["protein", "veg", "carb", "fat", "fiber"];

/** Five food-group pills: filled when the recipe has it, faded when it doesn't. */
export function BalanceRow({ balance }: { balance: Balance }) {
  const main = balance.mainProtein;
  return (
    <div className="flex flex-wrap items-center gap-1" aria-label="Plate balance">
      {GROUPS.map((g) => {
        const has = balance.groups[g].length > 0;
        const label =
          g === "protein" && main
            ? main.ingredient.name
            : g === "veg" && balance.rawVeg
              ? "Veg · raw"
              : GROUP_INFO[g].label;
        return (
          <span
            key={g}
            title={has ? `${GROUP_INFO[g].label}: ${balance.groups[g].map((i) => i.name).join(", ")}` : `No ${GROUP_INFO[g].label.toLowerCase()}`}
            className={`badge gap-1 ${has ? "badge-green" : "bg-transparent text-stone-400 line-through decoration-stone-300 dark:text-stone-600"}`}
          >
            <span aria-hidden>{GROUP_INFO[g].icon}</span>
            <span className="max-w-24 truncate">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

export function RecipeCard({ recipe, match }: { recipe: Recipe; match?: RecipeMatch }) {
  return (
    <Link
      href={`/recipes/view?id=${recipe.id}`}
      className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug group-hover:text-brand-700 dark:group-hover:text-brand-200">
          {recipe.title}
        </h3>
        {recipe.favorite && <span title="Favourite" aria-label="Favourite">❤️</span>}
      </div>
      {recipe.description && <p className="line-clamp-2 text-sm text-stone-500">{recipe.description}</p>}
      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="badge badge-muted">⏱ {totalMinutes(recipe)}</span>
        <span className="badge badge-muted">{recipe.cuisine}</span>
        {recipe.rating && <span className="badge badge-amber">{"★".repeat(recipe.rating)}</span>}
        {recipe.tags.slice(0, 3).map((t) => (
          <span key={t} className="badge badge-muted">#{t}</span>
        ))}
      </div>
      <BalanceRow balance={match?.balance ?? recipeBalance(recipe)} />
      {match && (
        <div className="mt-auto space-y-2">
          <MatchBar match={match} />
          {match.missing.length > 0 && (
            <p className="text-xs text-stone-500">
              <span className="font-medium text-stone-700 dark:text-stone-300">Need:</span>{" "}
              {match.missing.map((m) => m.name).join(", ")}
            </p>
          )}
          {match.reasons.filter((r) => !r.startsWith("Only missing") && !r.startsWith("You have")).slice(0, 2).map((r) => (
            <p key={r} className="text-xs text-brand-700 dark:text-brand-200">✓ {r}</p>
          ))}
        </div>
      )}
    </Link>
  );
}
