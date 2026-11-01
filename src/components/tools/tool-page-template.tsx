import type { ReactElement, ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ToolCard } from "./tool-card";
import { getCategory } from "@/data/tools/categories";
import { getRelatedTools, isSearchIndexEligible, type PublishedTool } from "@/data/tools/registry";
import { pageMetadata } from "@/lib/seo/metadata";
type NonEmpty<T> = readonly [T, ...T[]];
type Example = { title: string; input: string; result: string; explanation: string };
export function toolMetadata(tool: PublishedTool) {
  const metadata = pageMetadata(tool.name, tool.description, tool.href);
  return isSearchIndexEligible(tool) ? metadata : { ...metadata, robots: { index: false, follow: false } };
}
// A published route must supply working functionality and meaningful examples.
export function ToolPageTemplate({ tool, interactiveArea, instructions, examples, introduction, method, relatedToolIds, descriptionBelowTool = false, faqs }: { tool: PublishedTool; interactiveArea: ReactElement; instructions: NonEmpty<string>; examples: NonEmpty<Example>; introduction?: string; method?: ReactNode; relatedToolIds?: readonly string[]; descriptionBelowTool?: boolean; faqs?: readonly [string, string][] }) {
  const category = getCategory(tool.category)!;
  const related = getRelatedTools(tool, relatedToolIds);
  return <div className="page-width page-section tool-page">
    <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Tools", href: "/tools" }, { name: category.name, href: "/tools/category/" + category.id }, { name: tool.name, href: tool.href }]} />
    <div className={descriptionBelowTool ? "page-heading tool-heading-compact" : "page-heading"}><h1>{tool.name}</h1>{!descriptionBelowTool && <p>{tool.description}</p>}</div>
    <section className="interactive-area" aria-label={tool.name}>{interactiveArea}</section>
    {descriptionBelowTool && <p className="tool-page-description">{tool.description}</p>}
    <section className="content-section"><h2>How to use {tool.name}</h2>{introduction && <p className="tool-introduction">{introduction}</p>}<ol className="instruction-list">{instructions.map((step, index) => <li key={index}>{step}</li>)}</ol></section>
    {method}
    <section className="content-section"><h2>Practical examples</h2><div className="tool-grid">{examples.map((example) => <article className="tool-card" key={example.title}><h3>{example.title}</h3><dl><dt>Input</dt><dd>{example.input}</dd><dt>Result</dt><dd>{example.result}</dd></dl><p>{example.explanation}</p></article>)}</div></section>
    {faqs && faqs.length > 0 && <section className="content-section tool-faq" aria-labelledby="tool-faq-heading"><h2 id="tool-faq-heading">Frequently asked questions</h2>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>}
    {related.length > 0 && <section className="content-section"><h2>Related tools</h2><div className="tool-grid">{related.map((item) => <ToolCard key={item.id} tool={item} />)}</div></section>}
  </div>;
}
