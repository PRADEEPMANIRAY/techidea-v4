import { apis } from "@/data/apis/registry";
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import { getPublishedTools, getAvailableCategories, isSearchIndexEligible } from "@/data/tools/registry";
export default function sitemap(): MetadataRoute.Sitemap {
  // Only real content routes and implemented tools; never planned service/tool URLs.
  return ["/", "/tools", "/calculators", "/apis", "/apis/docs", "/about", "/contact", "/privacy-policy", "/terms", "/disclaimer", ...apis.map(api => "/apis/docs/" + api.id), ...getAvailableCategories().map((category) => "/tools/category/" + category.id), ...getPublishedTools().filter(isSearchIndexEligible).map((tool) => tool.href)].map((path) => ({ url: absoluteUrl(path) }));
}
