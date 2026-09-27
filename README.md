# Yummy Meal Prep 🥕

A personal recipe book, kitchen inventory and meal recommender, built with **Next.js 16** (App Router, Server Actions) and **React 19**.

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
- **Recipe book**: comes with 22 starter recipes. You can add your own, edit or delete them, search by name, cuisine, tag or ingredient, favourite them and rate them.
  - Each recipe shows which ingredients you have, which you're short on and which are missing.
  - **"I cooked this"** takes the ingredients out of your inventory, with unit conversion and soonest-expiring stock used first. You can adjust the amounts before saving.
  - **"You might also like"**: similar recipes (content-based). The Cook page has **"Picked for you"**.
- **Smart ingredient matching**: handles plurals, synonyms (scallion = green onion, penne → pasta), varieties (olive oil counts as "oil", sharp cheddar as "cheddar") and false friends (peanut butter ≠ butter).
- **Settings**: pantry staples that are always assumed to be on hand (salt, pepper, oil…), the length of the "expiring soon" window, and a JSON backup download.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Data is stored in `data/db.json` (git-ignored), which is created on first run and seeded with the starter recipes. Set `YUMMY_DATA_DIR` to keep it somewhere else.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build && npm start` | Production build / server |
| `npm test` | Unit tests (Vitest) for parsing, matching and recommendations |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run lint` | ESLint |

## Project layout

```
src/
  app/                 routes (/, /inventory, /cook, /recipes, /history, /settings)
    actions/           server actions (inventory, recipes, settings)
    api/export/        JSON backup download
  components/          shared UI
  lib/
    db.ts              JSON-file database (atomic, serialised writes)
    ingredients.ts     line parser, name normalisation, matching, unit conversion
    recommend.ts       scoring, buckets, shopping list, similarity, cooking deductions
    history.ts         per-product history roll-up
    seed-recipes.ts    starter recipe book
```

The storage layer is a single module (`lib/db.ts`). To host this for more than one person, swap it for a real database such as SQLite/Postgres via Drizzle or Prisma, and add authentication to the server actions.
