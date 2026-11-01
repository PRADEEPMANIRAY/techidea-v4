import type { PublishedTool } from "@/data/tools/registry";
import { calculateConstruction, constructionDefaults, type ConstructionDefinition } from "@/lib/calculators/construction";
import { ToolPageTemplate } from "./tool-page-template";
import { ConstructionCalculator } from "./construction-calculator";
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
  const [first, second, third] = definition.examples;
  return <>
    <StructuredData value={{ "@context": "https://schema.org", "@type": "WebApplication", name: tool.name, url: absoluteUrl(tool.href), description: tool.description, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", browserRequirements: "Requires JavaScript for interactive calculation", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }} />
    <ToolPageTemplate tool={tool} introduction={definition.intro} interactiveArea={<ConstructionCalculator key={tool.id} definition={definition} title={tool.name} />}
      instructions={[
        "Enter the measured dimensions and choose the unit beside each measurement. Quantities and counts must be positive whole numbers.",
        "Adjust any wastage and coverage inputs to match your estimate. Leave optional prices blank if you only need quantities.",
        "Review the results and assumptions below. Copy results includes labels and units; Reset defaults restores the starting example.",
      ]}
      examples={[example(first), example(second), example(third)]}
      faqs={definition.faqs}
      method={<section className="content-section construction-method" aria-labelledby="construction-method-title">
        <h2 id="construction-method-title">Calculation explanation</h2>
        <h3>Formulas</h3><ul className="construction-formulas">{definition.formulas.map((formula) => <li key={formula}>{formula}</li>)}</ul>
        <h3>Assumptions and measurement notes</h3><ul className="construction-notes">{definition.notes.map((note) => <li key={note}>{note}</li>)}</ul>
        <p>Units are normalized before calculation: 1 in = 0.0254 m, 1 ft = 0.3048 m, 1 ft² = 0.09290304 m² and 1 ft³ = 0.028316846592 m³. Decimal arithmetic is retained through quantity rounding; dimensions and prices are limited to 1,000,000,000 per input.</p>
      </section>} />
  </>;
}
