"use client";

import { Loading } from "@/components/page-state";
import { useDb } from "@/lib/store";

import { DataPanel } from "./data-panel";
import { SettingsForm } from "./settings-form";

export function SettingsView() {
  const db = useDb();
  if (!db) return <Loading />;
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="page-title">Settings</h1>
      <SettingsForm key={JSON.stringify(db.settings)} settings={db.settings} />
      <DataPanel />
    </div>
  );
}
