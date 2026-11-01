import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory } from "@/data/tools/categories";
import { getToolsByCategory, getAvailableCategories } from "@/data/tools/registry";
import { pageMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ToolCard } from "@/components/tools/tool-card";
type Props = { params: Promise<{ category: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return categories.map((category) => ({ category: category.id })); }
export async function generateMetadata({ params }: Props) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  const metadata = pageMetadata(category.name, category.description, "/tools/category/" + category.id);
  return getAvailableCategories().some(item => item.id === category.id) ? metadata : {...metadata, robots: {index: false, follow: false}};
}
export default async function CategoryPage({ params }: Props) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  const items = getToolsByCategory(category.id);
  const available = items.filter((tool) => tool.status === "published").length;
  if (!available) return <div className="page-width page-section"><Breadcrumbs items={[{name:"Home",href:"/"},{name:"Tools",href:"/tools"},{name:category.name,href:"/tools/category/"+category.id}]} /><div className="page-heading"><h1>{category.name}</h1><p>No {category.name.toLowerCase()} are available yet.</p></div><p>This category is not part of the available collection. No files can be processed here.</p><Link className="button button-dark" href="/tools">Browse working tools</Link></div>;
  return <div className="page-width page-section">
    <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Tools", href: "/tools" }, { name: category.name, href: "/tools/category/" + category.id }]} />
    <div className="page-heading"><span className="tool-icon" aria-hidden="true">{category.symbol}</span><h1>{category.name}</h1><p>{category.description}</p></div>
    <section className="category-intro" aria-label={"About " + category.name}><p>{category.intro}</p><aside><strong>Before you begin</strong><p>{category.tip}</p></aside></section>
    <div className="section-heading"><div><h2>{available ? "Available tools" : "The planned collection"}</h2><p>{available ? `${available} working tools. Choose a tool to get started.` : "These tools are in planning. No individual tool is available yet."}</p></div><Link className="text-link" href={"/tools?category=" + category.id}>Search this category →</Link></div>
    <div className="tool-grid">{items.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div>
    <section className="related-categories"><h2>Explore other categories</h2><div className="link-pills">{getAvailableCategories().filter((item) => item.id !== category.id).map((item) => <Link key={item.id} href={"/tools/category/" + item.id}>{item.name} <span aria-hidden="true">↗</span></Link>)}</div></section>
  </div>;
}
