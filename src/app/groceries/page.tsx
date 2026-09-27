import type { Metadata } from "next";

import { GroceriesView } from "./groceries-view";

export const metadata: Metadata = { title: "Groceries" };

export default function GroceriesPage() {
  return <GroceriesView />;
}
