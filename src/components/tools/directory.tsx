import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ToolSearch } from "./tool-search";
import type { Tool } from "@/data/tools/registry";
import type { ToolCategoryId } from "@/data/tools/categories";
export function Directory({ title, description, items, path, initialQuery, initialCategory, allowedCategories }: { title: string; description: string; items: readonly Tool[]; path: string; initialQuery?: string; initialCategory?: string; allowedCategories?: readonly ToolCategoryId[] }) {
  return <div className="page-width page-section"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: path === "/tools" ? "Tools" : "Calculators", href: path }]} /><div className="page-heading"><p className="eyebrow">The TechIdea collection</p><h1>{title}</h1><p>{description}</p></div><div className="notice"><span aria-hidden="true">◷</span><p><strong>A collection in the making.</strong> Tools labeled Available are ready to use. Planned tools do not have published pages.</p></div><ToolSearch items={items} initialQuery={initialQuery} initialCategory={initialCategory} allowedCategories={allowedCategories} /></div>;
}
