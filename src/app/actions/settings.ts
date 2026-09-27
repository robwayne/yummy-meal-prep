"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mutateDb } from "@/lib/db";

import type { ActionState } from "./inventory";

const settingsSchema = z.object({
  staples: z
    .string()
    .default("")
    .transform((v) => [...new Set(v.split(/[\n,]/).map((s) => s.trim().toLowerCase()).filter(Boolean))]),
  expiringSoonDays: z.coerce.number().int().min(0).max(60),
});

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  await mutateDb((db) => {
    db.settings = parsed.data;
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved" };
}
