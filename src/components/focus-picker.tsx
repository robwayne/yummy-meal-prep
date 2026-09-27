"use client";

import Link from "next/link";
import { useState } from "react";

import { setMealPlan } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import { activePlan, DIET_INFO, FOCUS_INFO } from "@/lib/nutrition";
import { todayIso } from "@/lib/recommend";
import { DIETS, FOCUSES, type Diet, type Focus, type MealPlan } from "@/lib/types";

function endsText(plan: MealPlan | undefined) {
  if (!plan) return "";
  return plan.until ? `until ${formatDate(plan.until)}` : "until you change it";
}

/** Choose this week's priority and diet. Saves as soon as you tap. */
export function FocusPicker({ plan }: { plan?: MealPlan }) {
  const today = todayIso();
  const active = activePlan(plan, today);
  const expired = plan?.until && plan.until < today ? plan : undefined;
  const [duration, setDuration] = useState<"week" | "ongoing">(plan && !plan.until ? "ongoing" : "week");

  const choose = (focus: Focus, diet: Diet) => setMealPlan(focus, diet, duration);

  return (
    <section id="focus" className="card space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="section-title">This week&apos;s focus</h2>
        {active.plan && <span className="text-xs text-stone-500">{endsText(active.plan)}</span>}
      </div>
      {expired && (
        <p className="rounded-lg bg-stone-100 p-2 text-sm dark:bg-stone-800">
          Your {FOCUS_INFO[expired.focus].label.toLowerCase()} week ended {formatDate(expired.until!)}. Back to balanced — pick
          a new focus any time.
        </p>
      )}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="radiogroup" aria-label="Focus">
        {FOCUSES.map((f) => {
          const on = active.focus === f;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(f, active.diet)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition ${
                on
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-stone-300 bg-white text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
              }`}
            >
              <span aria-hidden>{FOCUS_INFO[f].icon}</span>
              {FOCUS_INFO[f].label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-stone-600 dark:text-stone-400">{FOCUS_INFO[active.focus].blurb}.</p>
      <div className="grid grid-cols-2 items-end gap-3 sm:flex">
        <div>
          <label className="label" htmlFor="diet">Diet</label>
          <select
            id="diet"
            className="input"
            value={active.diet}
            onChange={(e) => choose(active.focus, e.target.value as Diet)}
          >
            {DIETS.map((d) => (
              <option key={d} value={d}>{DIET_INFO[d].label}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">How long</span>
          <div className="flex rounded-lg bg-stone-100 p-0.5 text-sm dark:bg-stone-800">
            {(["week", "ongoing"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDuration(d);
                  if (active.plan) setMealPlan(active.focus, active.diet, d);
                }}
                className={`rounded-md px-3 py-1.5 font-medium ${duration === d ? "bg-white shadow-sm dark:bg-stone-950" : "text-stone-500"}`}
              >
                {d === "week" ? "7 days" : "Ongoing"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <details className="text-xs text-stone-500">
        <summary className="cursor-pointer">How recommendations use this</summary>
        <p className="mt-1">
          Every plate is scored for protein, veg (raw is a bonus), carbs, fat and fibre. Meat or seafood you have in stock is
          preferred as the main protein. Your focus pushes matching meals up and clashing ones down; a diet hides meals that
          don&apos;t fit.
        </p>
      </details>
    </section>
  );
}

/** One-line summary for the home page. */
export function FocusSummary({ plan }: { plan?: MealPlan }) {
  const active = activePlan(plan, todayIso());
  const info = FOCUS_INFO[active.focus];
  return (
    <Link href="/cook#focus" className="card flex items-center justify-between gap-3 p-4 transition hover:border-brand-500/50">
      <span className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>{info.icon}</span>
        <span>
          <span className="block text-xs text-stone-500 uppercase">This week&apos;s focus</span>
          <span className="font-semibold">
            {info.label}
            {active.diet !== "everything" && ` · ${DIET_INFO[active.diet].label}`}
          </span>
          {active.plan && <span className="block text-xs text-stone-500">{endsText(active.plan)}</span>}
        </span>
      </span>
      <span className="text-sm text-brand-700 dark:text-brand-200">Change →</span>
    </Link>
  );
}
