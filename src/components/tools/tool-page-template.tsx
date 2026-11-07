import type { ReactElement, ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ToolCard } from "./tool-card";
import { getCategory } from "@/data/tools/categories";
import { getRelatedTools, isSearchIndexEligible, type PublishedTool } from "@/data/tools/registry";
import { pageMetadata } from "@/lib/seo/metadata";
import { EnhancementGuidance } from "./enhancement-guidance";
type NonEmpty<T> = readonly [T, ...T[]];
type Example = { title: string; input: string; result: string; explanation: string };
const seoOverrides: Partial<Record<string, { title: string; description: string }>> = {
  "emi-calculator": { title: "EMI Calculator – Prepayment & Loan Comparison", description: "Compare loan repayments with a lump sum or monthly extras. Estimate interest saved, shorter tenure or a revised EMI, and download both payment schedules." },
  "sip-calculator": { title: "SIP Calculator – Step-Up & Inflation Comparison", description: "Compare fixed and annual step-up SIP contributions. See projected value, invested amount and inflation-adjusted purchasing power with year-wise tables." },
  "qr-code-generator": { title: "QR Code Generator – Colors, Logo, PNG & SVG", description: "Create static text or URL QR codes locally with custom colors and a small logo. Download PNG or SVG with a quiet zone and check contrast before sharing." },
  "image-compressor": { title: "Image Compressor – Batch Resize & Convert", description: "Compress and resize up to 10 JPEG, PNG or WebP images locally. Compare file sizes and previews, choose quality and download each result without uploading." },
  "tile-calculator": { title: "Tile Calculator – Tiles, Boxes & Cost", description: "Calculate floor tiles and whole boxes from room area, tile size, grout gap and wastage. Use feet or meters and add a box price to estimate material cost." },
  "paint-calculator": { title: "Paint Calculator – Walls, Ceilings & Cost", description: "Estimate paint for equal or separate walls and an optional ceiling. Deduct openings, set coats and coverage, and see liters, US gallons and material cost." },
  "concrete-calculator": { title: "Concrete Calculator – Yards, Bags & Slabs", description: "Calculate concrete for slabs, footings and columns in cubic yards, feet and meters. Adjust wastage and bag yields, or price a ready-mix order." },
  "plywood-calculator": { title: "Plywood Calculator – Sheets Needed, Area & Cost", description: "Estimate plywood sheets from surface area, or total sheets you already need. Choose standard or custom sizes, add wastage, and calculate volume and cost." },
  "wood-cft-calculator": { title: "Wood CFT Calculator – Timber List & Cost", description: "Add multiple timber sizes with mixed units, quantities and prices per CFT. Calculate row and grand totals in cubic feet, cubic meters and board feet." },
};
export function toolMetadata(tool: PublishedTool) {
  const override = seoOverrides[tool.id];
  const metadata = pageMetadata(override?.title ?? tool.name, override?.description ?? tool.description, tool.href);
  return isSearchIndexEligible(tool) ? metadata : { ...metadata, robots: { index: false, follow: false } };
}
// A published route must supply working functionality and meaningful examples.
export function ToolPageTemplate({ tool, interactiveArea, instructions, examples, introduction, method, relatedToolIds, descriptionBelowTool = false, faqs, constructionNavigation, instructionHeading }: { tool: PublishedTool; interactiveArea: ReactElement; instructions: NonEmpty<string>; examples: NonEmpty<Example>; introduction?: string; method?: ReactNode; relatedToolIds?: readonly string[]; descriptionBelowTool?: boolean; faqs?: readonly [string, string][]; constructionNavigation?: boolean; instructionHeading?: string }) {
  const category = getCategory(tool.category)!;
  const related = getRelatedTools(tool, relatedToolIds);
  return <div className="page-width page-section tool-page">
    <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Tools", href: "/tools" }, { name: category.name, href: "/tools/category/" + category.id }, { name: tool.name, href: tool.href }]} />
    <div className={descriptionBelowTool ? "page-heading tool-heading-compact" : "page-heading"}><h1>{tool.name}</h1>{!descriptionBelowTool && <p>{tool.description}</p>}</div>
    {constructionNavigation && <nav className="construction-page-nav" aria-label="On this calculator page"><a href="#tool-calculator">Calculator</a><a href="#tool-instructions">How to measure</a><a href="#construction-method-title">Calculation explained</a><a href="#tool-examples">Worked examples</a><a href="#tool-faq-heading">Questions</a></nav>}
    <section id="tool-calculator" className="interactive-area" aria-label={tool.name}>{interactiveArea}</section>
    {descriptionBelowTool && <p className="tool-page-description">{tool.description}</p>}
    <section className="content-section" id="tool-instructions"><h2>{instructionHeading ?? `How to use ${tool.name}`}</h2>{introduction && <p className="tool-introduction">{introduction}</p>}<ol className="instruction-list">{instructions.map((step, index) => <li key={index}>{step}</li>)}</ol></section>
    {method}
    <EnhancementGuidance id={tool.id} />
    <section className="content-section" id="tool-examples"><h2>Practical examples</h2><div className="tool-grid">{examples.map((example) => <article className="tool-card" key={example.title}><h3>{example.title}</h3><dl><dt>Input</dt><dd>{example.input}</dd><dt>Result</dt><dd>{example.result}</dd></dl><p>{example.explanation}</p></article>)}</div></section>
    {faqs && faqs.length > 0 && <section className="content-section tool-faq" aria-labelledby="tool-faq-heading"><h2 id="tool-faq-heading">Frequently asked questions</h2>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>}
    {related.length > 0 && <section className="content-section"><h2>Related tools</h2><div className="tool-grid">{related.map((item) => <ToolCard key={item.id} tool={item} />)}</div></section>}
  </div>;
}
