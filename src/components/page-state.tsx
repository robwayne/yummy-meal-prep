import Link from "next/link";

export function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-stone-200 dark:bg-stone-800" />
      <div className="h-4 w-72 rounded bg-stone-200 dark:bg-stone-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-40" />
        ))}
      </div>
    </div>
  );
}

export function NotFound({ what, backHref, backLabel }: { what: string; backHref: string; backLabel: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="mb-4 text-stone-600 dark:text-stone-400">That {what} doesn&apos;t exist (it may have been deleted).</p>
      <Link href={backHref} className="btn">{backLabel}</Link>
    </div>
  );
}
