"use client";

import Link from "next/link";

import { toggleDislike, toggleFavorite } from "@/lib/actions";
import { adaptRecipe } from "@/lib/adapt";
import { totalMinutes } from "@/lib/format";
import { GROUP_INFO, recipeBalance, type Balance, type FoodGroup } from "@/lib/nutrition";
import type { RecipeMatch, Swap } from "@/lib/recommend";
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
export function BalanceRow({ balance, swap }: { balance: Balance; swap?: Swap }) {
  const main = balance.mainProtein;
  return (
    <div className="flex flex-wrap items-center gap-1" aria-label="Plate balance">
      {GROUPS.map((g) => {
        const has = balance.groups[g].length > 0;
        const label =
          g === "protein" && main
            ? swap && main.ingredient.name === swap.from
              ? swap.to
              : main.ingredient.name
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

/** 👍 Save / 👎 Not for me buttons shown on recommendations. */
export function FeedbackButtons({ recipe }: { recipe: Recipe }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => toggleFavorite(recipe.id)}
        aria-pressed={recipe.favorite}
        className={`btn btn-sm flex-1 ${recipe.favorite ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : ""}`}
      >
        👍 {recipe.favorite ? "Saved" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => toggleDislike(recipe.id)}
        aria-pressed={Boolean(recipe.disliked)}
        className="btn btn-sm flex-1"
        title="Stop recommending this, and show fewer dishes like it"
      >
        👎 {recipe.disliked ? "Disliked" : "Not for me"}
      </button>
    </div>
  );
}

export function RecipeCard({
  recipe: saved,
  match,
  feedback = false,
  href,
  badge,
}: {
  recipe: Recipe;
  match?: RecipeMatch;
  /** Show Save / Not for me buttons (on recommendations). */
  feedback?: boolean;
  /** Where the card links (defaults to the saved recipe page). */
  href?: string;
  /** Small label in the corner, e.g. "Online". */
  badge?: string;
}) {
  // Show the dish with your substitute protein when one is being used.
  const recipe = adaptRecipe(saved, match?.swap);
  return (
    <div className="card group flex flex-col transition hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-md">
      <Link href={href ?? `/recipes/view?id=${recipe.id}`} className="flex flex-1 flex-col gap-3 p-4">
        {recipe.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.image} alt="" loading="lazy" className="-mx-4 -mt-4 h-36 w-[calc(100%+2rem)] rounded-t-2xl object-cover" />
        )}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug group-hover:text-brand-700 dark:group-hover:text-brand-200">
            {recipe.title}
          </h3>
          {badge && <span className="badge badge-muted shrink-0">{badge}</span>}
          {recipe.favorite && <span title="Saved" aria-label="Saved">❤️</span>}
          {recipe.disliked && <span title="Disliked" aria-label="Disliked">👎</span>}
        </div>
        {recipe.description && <p className="line-clamp-2 text-sm text-stone-500">{recipe.description}</p>}
        {match?.swap && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            🔁 Made with your {match.swap.to} instead of {match.swap.from}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="badge badge-muted">⏱ {totalMinutes(recipe)}</span>
          <span className="badge badge-muted">{recipe.cuisine}</span>
          {recipe.rating && <span className="badge badge-amber">{"★".repeat(recipe.rating)}</span>}
          {recipe.tags.slice(0, 3).map((t) => (
            <span key={t} className="badge badge-muted">#{t}</span>
          ))}
        </div>
        <BalanceRow balance={match?.balance ?? recipeBalance(recipe)} swap={match?.swap} />
        {match && (
          <div className="mt-auto space-y-2">
            <MatchBar match={match} />
            {match.missing.length > 0 && (
              <p className="text-xs text-stone-500">
                <span className="font-medium text-stone-700 dark:text-stone-300">Need:</span>{" "}
                {match.missing.map((m) => m.name).join(", ")}
              </p>
            )}
            {match.reasons
              .filter((r) => !r.startsWith("Only missing") && !r.startsWith("You have"))
              .slice(0, 2)
              .map((r) => (
                <p key={r} className="text-xs text-brand-700 dark:text-brand-200">✓ {r}</p>
              ))}
          </div>
        )}
      </Link>
      {feedback && (
        <div className="border-t border-stone-100 p-3 dark:border-stone-800">
          <FeedbackButtons recipe={saved} />
        </div>
      )}
    </div>
  );
}
