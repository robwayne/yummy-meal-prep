# HungryHungryRob 🥕

A personal recipe book, kitchen inventory and meal recommender, built with **Next.js 16** and **React 19**. It runs entirely in your browser (no server, no account), is built for iPhone, and is hosted on GitHub Pages.

**Live app:** https://robwayne.github.io/yummy-meal-prep/ (the address follows the GitHub repository name)

## Features

- **Inventory**: track what's in your fridge, freezer, pantry/cabinets and spice rack, with quantities, units and best-before dates.
  - Quick-add a whole grocery haul by pasting a list (`2 lb chicken thighs`, `1 dozen eggs`, `milk`).
  - Adding something you already have tops up the existing item.
  - Use part of an item, edit it, toss it (spoiled) or remove it. Expired items get flagged and left out of recommendations.
- **History**: every change is kept in an append-only log.
  - **Products**: everything you've ever had, with how often you bought, used or tossed it, and a one-click "Add again".
  - **Activity log**: a filterable timeline of additions, restocks, usage, cooking and waste.
  - **Meals cooked**: a log of what you made and when.
- **What can I cook?**: recipes ranked against your current inventory.
  - **Ready to cook** (you have everything), **Almost there** (missing 1–N items, you choose N) and **Worth a stretch**.
  - Recipes that use up items **expiring soon** rank higher.
  - Ranking also learns from your favourites, star ratings and what you actually cook, and pushes down things you cooked recently.
  - A combined **shopping list** of what to buy to unlock more recipes.
  - Filter by time available and tag.
- **Weekly focus & balanced plates**
  - Every recipe is scored for a balanced plate: **protein, veg (raw is a bonus), carbs, fat and fibre**. Recipe cards show which food groups a meal covers.
  - Meat or seafood is preferred as the main protein, especially meat you already have in stock ("Uses your chicken").
  - Pick a focus for the week (**High protein, More veggies, High fibre, Low carb**, or **Balanced**) and optionally a diet (**Pescatarian, Vegetarian**). It lasts 7 days or until you change it, and all recommendations follow it.
  - Recipes missing a food group suggest a side from your kitchen to round out the plate.
- **👍 Save / 👎 Not for me** on every recommendation: saved dishes (and ones like them) rank higher; disliked dishes are never recommended and similar ones are nudged down. Undo from the recipe page; the Recipe book can filter Saved or Disliked.
- **Meal history** (History → Meals): what was recommended each day, cooked, saved and disliked. Save it as a .txt and import it back any time. Dishes suggested on several recent days but never cooked take a rest so suggestions stay fresh.
- **Search any dish**: the Recipe book (and the search box on Home) searches your book first, then free online recipe sites (TheMealDB and DummyJSON). Every result shows what you have and what's missing; open an online recipe to see it in full, save it to your book, or add its missing ingredients to the shopping list.
- **Snacks & treats**: a Meals / Snacks switch on the Cook page; snacks stay out of meal recommendations.
- **Add missing to shopping list** on every recipe.
- **Groceries** (Shop tab)
  - **Inventory running low**: anything below its "low below" level (1 of its unit by default, so exactly 1 kg isn't low; tap to change per product, 0 = only when out), used up recently, or expired.
  - **Vital items** (☆ on any item): never-run-out products, always shown and flagged at the top when low or out, with an alert on Home.
  - **Recommended for recipes**: missing ingredients for meals you're close to making, ranked by how many dishes each unlocks.
  - **My list**: add suggestions or your own items, tick them off in the store, then add ticked items to your inventory in one tap.
- **Recipe book**: comes with 44 starter recipes, including balanced meat and seafood plates and 12 snacks and treats (chocolate chip cookies, hummus, energy balls…). You can add your own, edit or delete them, search by name, cuisine, tag or ingredient, favourite them and rate them.
  - Each recipe shows which ingredients you have, which you're short on and which are missing.
  - **"I cooked this"** takes the ingredients out of your inventory, with unit conversion and soonest-expiring stock used first. You can adjust the amounts before saving.
  - **"You might also like"**: similar recipes (content-based). The Cook page has **"Picked for you"**.
- **Smart ingredient matching**: handles plurals, synonyms (scallion = green onion, penne → pasta), varieties (olive oil counts as "oil", sharp cheddar as "cheddar") and false friends (peanut butter ≠ butter).
- **Settings**: pantry staples that are always assumed to be on hand (salt, pepper, oil…), the length of the "expiring soon" window, backup download and restore, and "erase everything".
- **iPhone-friendly**: bottom tab bar, number keypads for amounts, no zoom-on-tap, and installable to the Home Screen as a full-screen app.

## Where your data lives

Everything is saved in your browser's local storage, on each device separately. Nothing is sent anywhere.

- **On iPhone, add it to your Home Screen** (Safari → Share → Add to Home Screen). iOS can clear a website's data after about a week without a visit, but Home Screen apps are exempt.
- To move data between devices, use **Settings → Download backup**, then **Restore from backup** on the other device.
- All storage goes through `src/lib/store.ts`, so it can later be swapped for a synced database such as Supabase without changing the pages.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

## Deploying

Pushing to `main` or `feature/recipe-inventory-app` runs `.github/workflows/deploy.yml`. It lints, tests, builds a static site into `out/` and publishes it to GitHub Pages. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

To preview the Pages build locally:

```bash
PAGES_BASE_PATH=/yummy-meal-prep npm run build   # static site in out/
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Static export to `out/` |
| `npm test` | Unit tests (Vitest) for parsing, matching, recommendations and data changes |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run lint` | ESLint |

## Project layout

```
src/
  app/                 pages (/, /inventory, /cook, /recipes, /recipes/view, /recipes/edit, /history, /settings)
  components/          shared UI (nav + phone tab bar, forms, recipe cards)
  lib/
    store.ts           browser storage (localStorage) + React hook
    actions.ts         every data change: validation + history logging
    database.ts        empty/seeded database, backup validation
    ingredients.ts     line parser, name normalisation, matching, unit conversion
    recommend.ts       scoring, buckets, shopping list, similarity, cooking deductions
    online-recipes.ts  online recipe search (TheMealDB, DummyJSON) → our recipe format
    meal-history.ts    meal history .txt format (recommended / cooked / saved / disliked)
    shopping.ts        running low, low thresholds, vital items, recipe groceries
    nutrition.ts       food groups, plate balance, weekly focus & diet scoring, side suggestions
    history.ts         per-product history roll-up
    seed-recipes.ts    starter recipe book
.github/workflows/deploy.yml   build + publish to GitHub Pages
```
