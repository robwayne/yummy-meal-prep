import { readDb } from "@/lib/db";

export async function GET() {
  const db = await readDb();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(db, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="yummy-meal-prep-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
