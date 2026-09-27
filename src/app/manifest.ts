import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Paths are relative to the manifest so they work under the GitHub Pages sub-path.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yummy Meal Prep",
    short_name: "Yummy",
    description: "Your recipe book, kitchen inventory and meal recommender.",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#16883f",
    icons: [
      { src: "icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
