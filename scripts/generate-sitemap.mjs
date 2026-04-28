import { writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_URL = process.env.SITE_URL || "https://filmgraph.app";
const today = new Date().toISOString().slice(0, 10);

const staticRoutes = [
  "/",
  "/discover",
  "/search",
  "/library",
  "/history",
  "/about",
  "/changelog",
];

const dynamicMovieIds = (process.env.SITEMAP_MOVIE_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const dynamicRoutes = dynamicMovieIds.map((id) => `/movie/${id}`);
const urls = [...new Set([...staticRoutes, ...dynamicRoutes])];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (route) => `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route === "/" ? "daily" : "weekly"}</changefreq>
    <priority>${route === "/" ? "1.0" : "0.7"}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const sitemapPath = path.resolve("public", "sitemap.xml");
await writeFile(sitemapPath, xml, "utf8");
console.log(`Generated sitemap at ${sitemapPath}`);
console.log(
  "Tip: set SITEMAP_MOVIE_IDS=550,680,13 to include dynamic /movie/:id URLs.",
);
