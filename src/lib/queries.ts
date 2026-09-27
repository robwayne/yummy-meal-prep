import "server-only";

import { connection } from "next/server";

import { readDb } from "./db";

/** Load the database for a request. Always fresh — never baked in at build time. */
export async function getData() {
  await connection();
  return readDb();
}
