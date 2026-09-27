"use client";

import { useActionState } from "react";

import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { saveSettings, type ActionState } from "@/lib/actions";
import type { Settings } from "@/lib/types";

const initial: ActionState = {};

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState(saveSettings, initial);
  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="staples">Pantry staples</label>
        <textarea id="staples" name="staples" rows={4} defaultValue={settings.staples.join(", ")} className="input" />
        <p className="mt-1 text-xs text-stone-500">
          Things you always have and don&apos;t want to track (comma or line separated). Recipes treat these as available.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="soon">&ldquo;Expiring soon&rdquo; window (days)</label>
        <input
          id="soon"
          name="expiringSoonDays"
          type="number"
          inputMode="numeric"
          min={0}
          max={60}
          defaultValue={settings.expiringSoonDays}
          className="input w-32"
        />
        <FieldError state={state} name="expiringSoonDays" />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
