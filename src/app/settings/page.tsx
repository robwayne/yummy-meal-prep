import type { Metadata } from "next";

import { getData } from "@/lib/queries";

import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const db = await getData();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="page-title">Settings</h1>
      <SettingsForm settings={db.settings} />
      <section className="card space-y-2 p-5">
        <h2 className="section-title">Your data</h2>
        <p className="text-sm text-stone-500">
          Everything is stored in <code className="font-mono">data/db.json</code> on the server running this app. Download a
          backup any time.
        </p>
        <a href="/api/export" className="btn" download>Download backup (JSON)</a>
      </section>
    </div>
  );
}
