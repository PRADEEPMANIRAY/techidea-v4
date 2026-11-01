import type { MetadataRoute } from "next";
import { absoluteUrl, site } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", ...(site.indexable ? { allow: "/", disallow: "/api/" } : { disallow: "/" }) },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
