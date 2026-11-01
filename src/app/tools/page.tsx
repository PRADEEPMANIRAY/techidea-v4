import { Directory } from "@/components/tools/directory";
import { tools } from "@/data/tools/registry";
import { pageMetadata } from "@/lib/seo/metadata";
const description = "Find your next everyday utility. Search the TechIdea collection by name or explore categories with working tools.";
export const metadata = pageMetadata("Free online tools directory", description, "/tools");
export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; category?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const category = typeof params.category === "string" ? params.category : "";
  return <Directory key={query + ":" + category} title="Free Online Tools Directory" description={description} items={tools} path="/tools" initialQuery={query} initialCategory={category} />;
}
