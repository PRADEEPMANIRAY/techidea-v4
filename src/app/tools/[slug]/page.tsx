import { getBhutanTool } from "@/data/tools/bhutan";
import { BhutanPage } from "@/components/tools/bhutan-page";
import { getNepalTool } from "@/data/tools/nepal";
import { NepalPage } from "@/components/tools/nepal-page";
import { getPakistanTool } from "@/data/tools/pakistan";
import { PakistanPage } from "@/components/tools/pakistan-page";
import { getIndiaTool } from "@/data/tools/india";
import { IndiaPage } from "@/components/tools/india-page";
import { getUtility } from "@/data/tools/utilities";
import { UtilityPage } from "@/components/tools/utility-page";
import { getFinancial } from "@/data/tools/financial";
import { FinancialPage } from "@/components/tools/financial-page";
import { notFound } from "next/navigation";
import { UnitConverter } from "@/components/tools/unit-converter";
import { ToolPageTemplate, toolMetadata } from "@/components/tools/tool-page-template";
import { StructuredData } from "@/components/ui/structured-data";
import { getPublishedTools } from "@/data/tools/registry";
import { converterContent } from "@/data/tools/converter-content";
import { getConverter } from "@/lib/converters/definitions";
import { convert, conversionFormula, formatResult } from "@/lib/converters/calculate";
import { absoluteUrl } from "@/lib/seo/site";
import "@/styles/converters.css";
import { getConstruction } from "@/data/tools/construction";
import { ConstructionPage } from "@/components/tools/construction-page";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;

function getPage(slug: string) {
  const tool = getPublishedTools().find((item) => item.id === slug);
  const definition = getConverter(slug);
  const content = converterContent[slug];
  const construction = getConstruction(slug);
  const financial = getFinancial(slug);
  const utility = getUtility(slug);
  const india = getIndiaTool(slug);
  const pakistan = getPakistanTool(slug);
  const nepal = getNepalTool(slug);
  const bhutan = getBhutanTool(slug);
  if (!tool || ((!definition || !content) && !construction && !financial && !utility && !india && !pakistan && !nepal && !bhutan)) notFound();
  return { tool, definition, content, construction, financial, utility, india, pakistan, nepal, bhutan };
}

export function generateStaticParams() {
  return getPublishedTools().filter((tool) => (getConverter(tool.id) && converterContent[tool.id]) || getConstruction(tool.id) || getFinancial(tool.id) || getUtility(tool.id) || getIndiaTool(tool.id) || getPakistanTool(tool.id) || getNepalTool(tool.id) || getBhutanTool(tool.id)).map((tool) => ({ slug: tool.id }));
}

export async function generateMetadata({ params }: Props) {
  return toolMetadata(getPage((await params).slug).tool);
}

export default async function ConverterPage({ params }: Props) {
  const { tool, definition, content, construction, financial, utility, india, pakistan, nepal, bhutan } = getPage((await params).slug);
  if (bhutan) return <BhutanPage tool={tool}/>;
  if (nepal) return <NepalPage tool={tool}/>;
  if (pakistan) return <PakistanPage tool={tool}/>;
  if (india) return <IndiaPage tool={tool}/>;
  if (utility) return <UtilityPage tool={tool} content={utility} />;
  if (financial) return <FinancialPage tool={tool} definition={financial} />;
  if (construction) return <ConstructionPage tool={tool} definition={construction} />;
  if (!definition || !content) notFound();
  const conversionDefinition = definition;
  function example(item: (typeof content.examples)[number]) {
    const from = conversionDefinition.units.find((unit) => unit.id === item.from)!;
    const to = conversionDefinition.units.find((unit) => unit.id === item.to)!;
    const result = convert(conversionDefinition, item.value, item.from, item.to);
    if (!result.ok) throw new Error(`Invalid example for ${tool.id}: ${result.error}`);
    return { title: item.title, input: `${item.value} ${from.symbol}`, result: `${formatResult(result.value, item.precision)} ${to.symbol}`, explanation: item.explanation };
  }
  const [first, second, third, ...rest] = content.examples;

  return <>
    <StructuredData value={{
      "@context": "https://schema.org", "@type": "WebApplication", name: tool.name,
      url: absoluteUrl(tool.href), description: tool.description, applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any", browserRequirements: "Requires JavaScript for interactive conversion",
      isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    }} />
    <ToolPageTemplate tool={tool} introduction={content.intro}
      interactiveArea={<UnitConverter definition={definition} />}
      instructions={[
        "Enter a value, then choose the source and destination units. The result updates as you type.",
        "Use Swap to exchange the units while keeping your input unchanged. Use ± to change the input sign.",
        "Choose 0–10 decimal places for display. Copy result copies the displayed number and its unit.",
      ]}
      examples={[example(first), example(second), example(third), ...rest.map(example)]}
      faqs={content.faqs}
      method={<section className="content-section converter-method" aria-labelledby="method-title">
        <h2 id="method-title">How the conversion works</h2>
        <p>{content.formulaExplanation}</p>
        {definition.kind === "temperature" ? <ul className="temperature-formulas">{definition.units.flatMap((from) => definition.units.filter((to) => to.id !== from.id).map((to) => <li key={`${from.id}:${to.id}`}>{conversionFormula(definition, from.id, to.id)}</li>))}</ul> :
          <div className="conversion-table"><table><caption>Base-unit factors for {tool.name.toLowerCase()}</caption><thead><tr><th scope="col">Unit</th><th scope="col">One unit in {definition.baseSymbol}</th></tr></thead><tbody>{definition.units.map((unit) => <tr key={unit.id}><th scope="row">{unit.name} ({unit.symbol})</th><td>{unit.factor} {definition.baseSymbol}</td></tr>)}</tbody></table></div>}
        <ul className="converter-notes">{content.notes.map((note) => <li key={note}>{note}</li>)}</ul>
        <p className="converter-help">Calculations use browser number precision (about 15–16 significant digits). Extremely large or small results use scientific notation; values outside the numeric range show an error.</p>
        <p className="converter-source">Reference: <a href="https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9">NIST unit conversion factors and temperature formulas</a>. Squared and cubed units are derived from the international inch and foot; the acre uses 43,560 international square feet.</p>
      </section>} />
  </>;
}
