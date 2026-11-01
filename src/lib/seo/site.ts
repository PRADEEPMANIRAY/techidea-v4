const configuredUrl = new URL(process.env.SITE_URL || "https://techidea.online");

if (!['http:', 'https:'].includes(configuredUrl.protocol) || configuredUrl.username || configuredUrl.password || configuredUrl.pathname !== '/' || configuredUrl.search || configuredUrl.hash) {
  throw new Error("SITE_URL must be an HTTP(S) origin without credentials, a path, query, or fragment.");
}
if (process.env.SITE_INDEXABLE && !["true", "false"].includes(process.env.SITE_INDEXABLE)) {
  throw new Error("SITE_INDEXABLE must be true or false.");
}

export const site = {
  name: "TechIdea",
  url: configuredUrl.origin,
  description: "TechIdea is an independent utility platform for free online tools, calculators and public APIs.",
  indexable: process.env.SITE_INDEXABLE === "true",
} as const;

export function absoluteUrl(path: string = "/"): string {
  return new URL(path, `${site.url}/`).toString();
}
