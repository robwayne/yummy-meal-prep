"use client";

import { useEffect, useRef, useState } from "react";

import { restoreBackup, type ActionState } from "@/lib/actions";
import { createDatabase } from "@/lib/database";
import { getDb, replaceDb } from "@/lib/store";

function downloadBackup() {
  const json = JSON.stringify(getDb(), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `hungryhungryrob-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ActionState>({});
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!confirm("Restoring replaces everything on this device with the backup. Continue?")) return;
    setResult(restoreBackup(await file.text()));
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="section-title">Your data</h2>
        <p className="text-sm text-stone-500">
          Everything is saved in this browser on this device. Nothing is sent to a server. To move to another device, download a
          backup here and restore it there.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={downloadBackup}>Download backup</button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Restore from backup…</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      {result.message && (
        <p className={`text-sm ${result.ok ? "text-brand-700 dark:text-brand-200" : "text-red-600 dark:text-red-400"}`}>
          {result.message}
        </p>
      )}
      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="font-medium">On iPhone: add this app to your Home Screen</p>
        <p className="mt-1">
          In Safari, tap <strong>Share</strong> → <strong>Add to Home Screen</strong>. It then opens full-screen like an app, and
          iOS keeps its data. A site you only visit in a browser tab can have its data cleared after about a week without a
          visit.
        </p>
        {persisted === true && <p className="mt-1">✓ This browser has granted permanent storage.</p>}
      </div>
      <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            if (confirm("Erase all inventory, history and your own recipes on this device, and start over?")) {
              replaceDb(createDatabase());
              setResult({ ok: true, message: "Started fresh." });
            }
          }}
        >
          Erase everything
        </button>
      </div>
    </section>
  );
}
