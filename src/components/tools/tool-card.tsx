import Link from "next/link";
import type { Tool } from "@/data/tools/registry";
import { getCategory } from "@/data/tools/categories";
export function ToolCard({ tool }: { tool: Tool }) {
  const category = getCategory(tool.category)!;
  return <article className="tool-card">
    <div className="card-top"><span className="tool-icon" aria-hidden="true">{category.symbol}</span><span className={tool.status === "published" ? "badge badge-live" : "badge"}>{tool.status === "published" ? "Available" : "Planned"}</span></div>
    <h3>{tool.status === "published" ? <Link href={tool.href}>{tool.name}<span aria-hidden="true"> ↗</span></Link> : tool.name}</h3>
    <p>{tool.description}</p>
    <Link className="category-label" href={"/tools/category/" + category.id}>{category.name}<span aria-hidden="true"> →</span></Link>
  </article>;
}
