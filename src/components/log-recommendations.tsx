"use client";

import { useEffect } from "react";

import { logRecommendations } from "@/lib/actions";
import type { RecipeMatch } from "@/lib/recommend";
import type { Focus } from "@/lib/types";

/** Records the dishes being recommended today (for meal history and variety). Renders nothing. */
export function LogRecommendations({ matches, focus }: { matches: RecipeMatch[]; focus: Focus }) {
  const key = matches.map((m) => m.recipe.id).join(",");
  useEffect(() => {
    if (!key) return;
    logRecommendations(
      matches.map((m) => ({ id: m.recipe.id, title: m.recipe.title })),
      focus,
    );
    // Only when the set of recommended dishes changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, focus]);
  return null;
}
