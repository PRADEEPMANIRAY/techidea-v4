import Link from "next/link";
import type { PublishedTool } from "@/data/tools/registry";
import { calculateConstruction, constructionDefaults, type ConstructionDefinition } from "@/lib/calculators/construction";
import { ToolPageTemplate } from "./tool-page-template";
import { ConstructionCalculator } from "./construction-calculator";
import { MultiConstruction } from "./multi-construction";
import { PaintWalls } from "./paint-walls";
import { StructuredData } from "@/components/ui/structured-data";
import { absoluteUrl } from "@/lib/seo/site";
import "@/styles/construction.css";

export function ConstructionPage({ tool, definition }: { tool: PublishedTool; definition: ConstructionDefinition }) {
  function example(item: (typeof definition.examples)[number]) {
    const defaults = constructionDefaults(definition);
    const result = calculateConstruction(definition, { values: { ...defaults.values, ...item.values }, units: { ...defaults.units, ...item.units } });
    if (!result.ok) throw new Error(`Invalid example for ${tool.id}: ${JSON.stringify(result.errors)}`);
    return { title: item.title, input: item.input, explanation: item.explanation, result: item.resultIds.map((id) => {
      const row = result.rows.find((row) => row.id === id);
      if (!row) throw new Error(`Unknown example result ${id}`);
      return `${row.label}: ${row.value} ${row.unit}`;
    }).join("; ") };
  }
  const guidance: Record<string, string> = {
    "tile-calculator": "Measure the floor, or enter its total area. Add tile dimensions and the grout gap you plan to use. Enter tiles per box to see how many boxes to buy.",
    "paint-calculator": "Enter the size and count of equal walls. Deduct openings once, then set coats and coverage per liter from the paint label. Divide a US gallon coverage figure by 3.785411784 before entering it.",
    "concrete-calculator": "Choose your slab, footing or column shape, then enter its dimensions. Set the allowance and choose a bag yield. For a ready-mix quote, select pricing per cubic meter or cubic yard.",
    "plywood-calculator": "Choose a sheet preset or enter your own length, width and thickness. Choose a known sheet count or enter the surface area to cover, then add an allowance and an optional price per sheet.",
    "wood-cft-calculator": "Measure the actual length, width and thickness of one timber piece. Enter the number of identical pieces and the supplier’s price per cubic foot, if known.",
  };
  const [first, second, third, ...additionalExamples] = definition.examples;
  const estimateGuidance: Record<string, string> = {
    "tile-calculator": "Set a wastage allowance for cuts and spares. Enter an optional price per box only after setting tiles per box.",
    "paint-calculator": "Set the wastage allowance and optional price per liter. Coverage is the area one liter covers for one coat, not the total area of your room.",
    "concrete-calculator": "Set wastage and check the bag yield against your product. Leave the material price blank if you only need quantities.",
    "plywood-calculator": "Set Wastage percentage for your purchasing allowance. Leave Price per sheet blank if you only need quantities. The area estimate does not plan cuts or panel joints.",
    "wood-cft-calculator": "For several timber sizes, choose Multiple timber sizes and enter each size on its own row. Leave prices blank if you only need volumes; this tool has no wastage input.",
  };
  const instructionHeadings: Record<string, string> = {
    "tile-calculator": "Measure the floor and read the tile box",
    "paint-calculator": "Set up your wall paint estimate",
    "concrete-calculator": "Measure your slab, footing or column",
    "plywood-calculator": "Choose a surface area or a known sheet count",
    "wood-cft-calculator": "Measure your timber before applying a CFT rate",
  };
  return <>
    <StructuredData value={{ "@context": "https://schema.org", "@type": "WebApplication", name: tool.name, url: absoluteUrl(tool.href), description: tool.description, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", browserRequirements: "Requires JavaScript for interactive calculation", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }} />
    <ToolPageTemplate tool={tool} constructionNavigation instructionHeading={instructionHeadings[tool.id]} introduction={definition.intro} interactiveArea={tool.id === "wood-cft-calculator" ? <MultiConstruction definition={definition} title={tool.name} /> : tool.id === "paint-calculator" ? <PaintWalls definition={definition} title={tool.name} /> : <ConstructionCalculator key={tool.id} definition={definition} title={tool.name} />}
      instructions={[
        guidance[tool.id],
        estimateGuidance[tool.id],
        "Review the results and assumptions below. Copy results includes labels and units. Print results creates a paper estimate with your inputs; The reset button restores the starting inputs for the selected mode.",
      ]}
      examples={[example(first), example(second), example(third), ...additionalExamples.map(example)]}
      faqs={definition.faqs}
      method={<section className="content-section construction-method" aria-labelledby="construction-method-title">
        <h2 id="construction-method-title">Calculation explanation</h2>
        {tool.id === "concrete-calculator" && <p>For reusable slab forms, use the <Link href="/tools/plywood-calculator">plywood calculator</Link> to total the panels. Bag assumptions of 0.30, 0.45 and 0.60 ft³ follow the <a href="https://www.quikrete.com/pdfs/data_sheet-concrete%201101.pdf">QUIKRETE Concrete Mix data sheet</a>; check the product you buy.</p>}
        {tool.id === "plywood-calculator" && <p>Working with solid timber as well? The <Link href="/tools/wood-cft-calculator">wood CFT calculator</Link> prices rectangular pieces by cubic foot. Sheet presets are nominal choices; check your supplier’s actual panel size.</p>}
        {tool.id === "wood-cft-calculator" && <p>For flat panels priced per sheet, use the <Link href="/tools/plywood-calculator">plywood area and cost calculator</Link>.</p>}
        {tool.id === "tile-calculator" && <p>Planning the rest of the room? Estimate wall finishes separately with the <Link href="/tools/paint-calculator">paint calculator</Link>.</p>}
        {tool.id === "paint-calculator" && <p>If the same room needs a new floor, use the <Link href="/tools/tile-calculator">tile and box calculator</Link> for the flooring order.</p>}
        {definition.guide && <><h3>{definition.guide.heading}</h3>{definition.guide.paragraphs.map((paragraph) => <p className="construction-guide-paragraph" key={paragraph}>{paragraph}</p>)}</>}
        <h3>Formulas</h3><ul className="construction-formulas">{definition.formulas.map((formula) => <li key={formula}>{formula}</li>)}</ul>
        <h3>Before you order</h3><ul className="construction-notes">{definition.notes.map((note) => <li key={note}>{note}</li>)}</ul>
        <p>Worked-example prices are illustrative inputs, not current US or Indian market quotes. Costs use the currency of your entered price.</p>
        <p>Units are normalized before calculation: 1 in = 0.0254 m, 1 ft = 0.3048 m, 1 ft² = 0.09290304 m² and 1 ft³ = 0.028316846592 m³. Decimal arithmetic is retained through quantity rounding; dimensions and prices are limited to 1,000,000,000 per input.</p>
      </section>} />
  </>;
}
