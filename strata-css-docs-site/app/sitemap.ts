import type { MetadataRoute } from "next";
import { getPackages } from "@/lib/packages";
import utilities from "@/content/utilities.json";
import components from "@/content/components.json";

const SITE_URL = "https://strata-css-docs-site.vercel.app";

const STATIC_ROUTES = [
  "",
  "/docs",
  "/blogs",
  "/showcase",
  "/roadmap",
  "/guides/installation",
  "/guides/configuration",
  "/guides/build-pipeline",
  "/guides/theme-system",
  "/guides/data-attribute-states",
  "/guides/versioning",
  "/policies/license",
  "/policies/contributing",
  "/policies/changelog",
  "/policies/privacy",
  "/policies/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  const packageEntries: MetadataRoute.Sitemap = getPackages().map((pkg) => ({
    url: `${SITE_URL}/packages/${pkg.slug}`,
    lastModified: new Date(),
  }));

  const utilityEntries: MetadataRoute.Sitemap = utilities.map((u) => ({
    url: `${SITE_URL}/utilities/${u.slug}`,
    lastModified: new Date(),
  }));

  const componentEntries: MetadataRoute.Sitemap = components.map((c) => ({
    url: `${SITE_URL}/components/${c.slug}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...packageEntries, ...utilityEntries, ...componentEntries];
}
