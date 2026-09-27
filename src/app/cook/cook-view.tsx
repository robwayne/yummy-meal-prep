"use client";

import Form from "next/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { RecipeCard } from "@/components/recipe-card";
import { Loading } from "@/components/page-state";
import { FocusPicker } from "@/components/focus-picker";
import { FOCUS_INFO, fitsDiet } from "@/lib/nutrition";
import {
  contextFor,
  forYou,
  freshness,
  matchRecipe,
  recommend,
  shoppingList,
  topPicks,
  type RecipeMatch,
} from "@/lib/recommend";
import { useDb } from "@/lib/store";

function Section({ title, subtitle, matches }: { title: string; subtitle: string; matches: RecipeMatch[] }) {
  if (!matches.length) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="section-title">{title} <span className="text-stone-400">({matches.length})</span></h2>
        <p className="text-sm text-stone-500">{subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => (
          <RecipeCard key={m.recipe.id} recipe={m.recipe} match={m} />
        ))}
      </div>
    </section>
  );
}

export function CookView() {
  const sp = useSearchParams();
  const db = useDb();
  if (!db) return <Loading />;

  const maxTime = Number(sp.get("time")) || 0;
  const tag = sp.get("tag") ?? "";
  const missingAllowed = Math.min(5, Math.max(1, Number(sp.get("missing")) || 2));

  const recipes = db.recipes
    .filter((r) => !maxTime || r.prepMinutes + r.cookMinutes <= maxTime)
    .filter((r) => !tag || r.tags.includes(tag));

  const ctx = contextFor(db);
  const recs = recommend({ ...ctx, recipes }, missingAllowed);
  const shopping = shoppingList(recs.almost);
  const expiring = db.inventory.filter((i) => freshness(i, db.settings.expiringSoonDays) === "soon");
  const suggestions = forYou(db.recipes, db.cookLog).filter(
    (r) => fitsDiet(r, ctx.diet ?? "everything") && matchRecipe(r, ctx).proteinAvailable,
  );
  const allTags = [...new Set(db.recipes.flatMap((r) => r.tags))].sort();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">What can I cook?</h1>
        <p className="text-stone-500">
          Recommendations based on the {db.inventory.length} items in your kitchen, what&apos;s about to expire, this week&apos;s focus and what you like.
        </p>
      </div>

      <FocusPicker plan={db.settings.plan} />

      <Form action="/cook" className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label" htmlFor="time">Time available</label>
          <select id="time" name="time" defaultValue={String(maxTime || "")} className="input">
            <option value="">Any</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">1 hour</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tag">Tag</label>
          <select id="tag" name="tag" defaultValue={tag} className="input">
            <option value="">Anything</option>
            {allTags.map((t) => (
              <option key={t} value={t}>#{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="missing">Willing to buy up to</label>
          <select id="missing" name="missing" defaultValue={String(missingAllowed)} className="input">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} item{n === 1 ? "" : "s"}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary">Update</button>
      </Form>

      {db.inventory.length === 0 && (
        <div className="card p-6 text-center">
          <p className="mb-3 text-stone-600 dark:text-stone-400">Add what&apos;s in your fridge and cabinets to get personalised recommendations.</p>
          <Link href="/inventory" className="btn btn-primary">Add inventory</Link>
        </div>
      )}

      {expiring.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <strong>Use it up:</strong> {expiring.map((i) => i.name).join(", ")} {expiring.length === 1 ? "is" : "are"} expiring soon —
          recipes that use {expiring.length === 1 ? "it" : "them"} are ranked higher.
        </div>
      )}

      <Section
        title={`Top picks · ${FOCUS_INFO[ctx.focus ?? "balanced"].label}`}
        subtitle="The best fits for this week's focus, whether you can make them now or need one or two things."
        matches={topPicks(recs)}
      />
      <Section title="Ready to cook" subtitle="You have everything you need (pantry staples assumed)." matches={recs.ready} />
      <Section
        title="Almost there"
        subtitle={`Missing ${missingAllowed === 1 ? "just one ingredient" : `${missingAllowed} or fewer ingredients`}.`}
        matches={recs.almost}
      />

      {shopping.length > 0 && (
        <section className="card p-5">
          <h2 className="section-title">Shopping list to unlock more</h2>
          <p className="mb-3 text-sm text-stone-500">Buying these would make the &ldquo;almost there&rdquo; recipes possible.</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shopping.map((s) => (
              <li key={s.name} className="text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="block text-xs text-stone-500">for {s.forRecipes.join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Section title="Worth a stretch" subtitle="You have a good chunk of these already." matches={recs.stretch.slice(0, 6)} />

      {recs.ready.length + recs.almost.length + recs.stretch.length === 0 && db.inventory.length > 0 && (
        <div className="card p-6 text-center text-stone-500">
          No close matches yet. Try allowing more missing items, or <Link href="/recipes/new" className="underline">add a recipe</Link> you love.
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="section-title">Picked for you</h2>
            <p className="text-sm text-stone-500">Similar to your favourites and top-rated recipes, and not cooked lately.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
