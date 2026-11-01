import { financialInstructions } from "@/data/tools/financial-instructions";
import type { PublishedTool } from "@/data/tools/registry";
import { financialDefinitions } from "@/data/tools/financial";
import { calculateFinancial, financialDefaults, formatFinancial, type FinancialDefinition } from "@/lib/calculators/financial";
import { ToolPageTemplate } from "./tool-page-template";
import { FinancialCalculator } from "./financial-calculator";
import { StructuredData } from "@/components/ui/structured-data";
import { absoluteUrl } from "@/lib/seo/site";
import "@/styles/financial.css";

export function FinancialPage({ tool, definition }: { tool: PublishedTool; definition: FinancialDefinition }) {
  function example(item: FinancialDefinition["examples"][number]) {
    const result = calculateFinancial(definition, { ...financialDefaults(definition), ...item.values });
    if (!result.ok) throw new Error(`Invalid financial example: ${tool.id}`);
    return {
      title: item.title,
      input: item.input,
      explanation: item.explanation,
      result: item.resultIds.map(id => {
        const row = result.rows.find(row => row.id === id)!;
        return `${row.label}: ${formatFinancial(row.value, row.format, result.currency)}`;
      }).join("; ")
    };
  }
  return <>
    <StructuredData value={{ "@context": "https://schema.org", "@type": "WebApplication", name: tool.name, url: absoluteUrl(tool.href), description: tool.description, applicationCategory: "FinanceApplication", operatingSystem: "Any", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }} />
    <ToolPageTemplate tool={tool} introduction={definition.intro} relatedToolIds={financialDefinitions.map(d => d.id)} interactiveArea={<FinancialCalculator key={tool.id} definition={definition} />} instructions={financialInstructions[tool.id]} examples={[example(definition.examples[0]), example(definition.examples[1]), example(definition.examples[2])]} faqs={definition.faqs} method={<section className="content-section finance-method"><h2>Formulas and assumptions</h2><ul>{definition.formulas.map(text => <li key={text}>{text}</li>)}</ul><ul>{definition.notes.map(text => <li key={text}>{text}</li>)}</ul>{tool.id === "gst-calculator" && <p>Consult <a href="https://cbic-gst.gov.in/about-gst.html">CBIC GST information</a> for the regulatory framework; confirm the current treatment for your transaction.</p>}</section>} />
  </>;
}
