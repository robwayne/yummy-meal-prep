import type { NextConfig } from "next";

/**
 * Built as a fully static site (no server) so it can be hosted on GitHub Pages.
 * On Pages the app lives under /<repo-name>, which the deploy workflow passes in
 * as PAGES_BASE_PATH. Locally it's served from the root.
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.PAGES_BASE_PATH || "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
