import { categories } from "./categories.ts";
import { bhutanTools } from "./bhutan.ts";
import { nepalTools } from "./nepal.ts";
import { pakistanTools } from "./pakistan.ts";
import { indiaTools } from "./india.ts";
import type { ToolCategoryId } from "./categories";
type ToolBase = Readonly<{ id: string; name: string; description: string; category: ToolCategoryId; featured?: boolean }>;
export type Tool = ToolBase & ({ status: "planned"; href?: never } | { status: "published"; href: `/tools/${string}` });
export type PublishedTool = Extract<Tool, { status: "published" }>;
// Publish only after a working route, instructions and examples are reviewed.
export const tools: readonly Tool[] = [
  ...bhutanTools.map(({id,name,description,category}): PublishedTool => ({id,name,description,category,status: "published",href: `/tools/${id}`})),
  {id:"bhutan-postal-code-finder",name:"Bhutan Postal Code Finder",description:"Awaiting a verified postal dataset with established reuse permission. No lookup is published.",category:"business-tools",status:"planned"},
  ...nepalTools.map(({id,name,description,category}): PublishedTool => ({id,name,description,category,status: "published",href: `/tools/${id}`})),
  ...pakistanTools.map(({id,name,description,category}): PublishedTool => ({id,name,description,category,status: "published",href: `/tools/${id}`})),
  ...indiaTools.map(({id,name,description,category}): PublishedTool => ({id,name,description,category,status: "published",href: `/tools/${id}`})),
  { id: "xml-to-json", name: "XML to JSON Converter", description: "Convert XML into an ordered JSON tree with attributes, namespaces and mixed text preserved. Reject malformed XML and external entity declarations.", category: "developer-tools", status: "published", href: "/tools/xml-to-json" },
  { id: "csv-to-json", name: "CSV to JSON Converter", description: "Convert UTF-8 CSV into JSON with quoted fields, embedded commas, header validation and string values preserved. Process files locally.", category: "developer-tools", status: "published", href: "/tools/csv-to-json" },
  { id: "qr-code-generator", name: "QR Code Generator", description: "Generate static QR codes locally from text or URLs, with Unicode support, error correction and PNG or SVG downloads.", category: "developer-tools", status: "published", href: "/tools/qr-code-generator" },

  { id: "emi-calculator", name: "EMI Calculator", description: "Calculate reducing-balance loan payments, total interest and a monthly amortization schedule with a downloadable CSV.", category: "financial-calculators", status: "published", href: "/tools/emi-calculator" },
  { id: "sip-calculator", name: "SIP Calculator", description: "Project monthly investments with effective annual returns, optional yearly contribution increases and year-wise gains or losses.", category: "financial-calculators", status: "published", href: "/tools/sip-calculator" },
  { id: "gst-calculator", name: "GST Calculator", description: "Add or extract GST at a user-entered rate, with reconciled CGST and SGST or IGST amounts and clear decimal rounding.", category: "financial-calculators", status: "published", href: "/tools/gst-calculator" },

  { id: "length-converter", name: "Length Converter", description: "Convert length between eight metric and customary units, including meters, feet and miles, with adjustable precision and clear formulas.", category: "unit-converters", status: "published", href: "/tools/length-converter", featured: true },
  { id: "weight-converter", name: "Weight Converter", description: "Convert mass between milligrams, grams, kilograms, metric tons, ounces and pounds. Compare precise results and choose your decimal places.", category: "unit-converters", status: "published", href: "/tools/weight-converter" },
  { id: "temperature-converter", name: "Temperature Converter", description: "Convert Celsius, Fahrenheit and Kelvin readings with correct offsets, absolute-zero validation and practical temperature examples.", category: "unit-converters", status: "published", href: "/tools/temperature-converter" },
  { id: "volume-converter", name: "Volume Converter", description: "Convert liters, milliliters, cubic units, US liquid gallons and Imperial gallons with clearly distinguished gallon definitions.", category: "unit-converters", status: "published", href: "/tools/volume-converter" },
  { id: "area-converter", name: "Area Converter", description: "Convert square units, international acres and hectares using accurate area factors, with formulas and practical examples.", category: "unit-converters", status: "published", href: "/tools/area-converter" },
  { id: "plywood-calculator", name: "Plywood Calculator", description: "Calculate plywood face area, solid volume and optional sheet cost from length, width, thickness and quantity, using metric or imperial dimensions.", category: "construction-calculators", status: "published", href: "/tools/plywood-calculator" },
  { id: "wood-cft-calculator", name: "Wood CFT Calculator", description: "Calculate rectangular timber volume per piece and in total, in cubic feet and cubic meters, with optional pricing per CFT.", category: "construction-calculators", status: "published", href: "/tools/wood-cft-calculator" },
  { id: "paint-calculator", name: "Paint Calculator", description: "Estimate paint liters and cost from wall area, opening deductions, coats, adjustable product coverage and a wastage allowance.", category: "construction-calculators", status: "published", href: "/tools/paint-calculator" },
  { id: "concrete-calculator", name: "Concrete Calculator", description: "Calculate wet concrete volume for rectangular pours in cubic meters and cubic feet, with a separate wastage allowance and mixed-unit dimensions.", category: "construction-calculators", status: "published", href: "/tools/concrete-calculator", featured: true },
  { id: "tile-calculator", name: "Tile Calculator", description: "Estimate floor tiles, wastage-adjusted quantities, whole boxes and purchase cost with accurate upward rounding and metric or imperial dimensions.", category: "construction-calculators", status: "published", href: "/tools/tile-calculator" },
  { id: "loan-calculator", name: "Loan Calculator", description: "Explore estimated repayments for a loan amount, rate and term.", category: "financial-calculators", status: "planned", featured: true },
  { id: "compound-interest-calculator", name: "Compound Interest Calculator", description: "Explore how an initial balance grows with compound interest.", category: "financial-calculators", status: "planned" },
  { id: "merge-pdf", name: "Merge PDF", description: "Combine selected PDF documents in a chosen page order.", category: "pdf-tools", status: "planned", featured: true },
  { id: "split-pdf", name: "Split PDF", description: "Extract a selected page range into a separate PDF document.", category: "pdf-tools", status: "planned" },
  { id: "image-resizer", name: "Image Resizer", description: "Adjust image dimensions while keeping the original aspect ratio.", category: "image-tools", status: "planned", featured: true },
  { id: "image-compressor", name: "Image Compressor", description: "Compare browser-side JPEG, PNG and WebP encoding with quality controls, size comparisons and local previews. No image upload required.", category: "image-tools", status: "published", href: "/tools/image-compressor" },
  { id: "json-formatter", name: "JSON Formatter & Validator", description: "Format, minify and validate JSON without rounding large numbers or changing string escapes. Copy or download the result locally.", category: "developer-tools", status: "published", href: "/tools/json-formatter", featured: true },
  { id: "url-encoder", name: "URL Encoder", description: "Encode or decode text for use in URL components.", category: "developer-tools", status: "planned" },
  { id: "margin-calculator", name: "Margin Calculator", description: "Compare profit margin and markup from cost and selling price.", category: "business-tools", status: "planned" },
  { id: "discount-calculator", name: "Discount Calculator", description: "Calculate sequential percentage discounts, savings and final price, with optional tax on a purchase amount.", category: "business-tools", status: "published", href: "/tools/discount-calculator" },
  { id: "percentage-calculator", name: "Percentage Calculator", description: "Calculate X% of Y, proportions, percentage increases or decreases, and symmetric percentage differences with the calculation base shown.", category: "everyday-calculators", status: "published", href: "/tools/percentage-calculator" },
  { id: "date-difference", name: "Date Difference Calculator", description: "Count the time between two calendar dates.", category: "everyday-calculators", status: "planned" },
];
export function getToolsByCategory(category: ToolCategoryId) { return tools.filter((tool) => tool.category === category); }
export function getPublishedTools(): readonly PublishedTool[] { return tools.filter((tool): tool is PublishedTool => tool.status === "published"); }
export function isSearchIndexEligible(tool: Pick<PublishedTool, "id">): boolean {
  return tool.id !== "pakistan-postal-code-finder";
}

export function getAvailableCategories() {
  return categories.filter(category => getPublishedTools().some(tool => tool.category === category.id));
}

const explicitRelatedMap: Record<string, readonly string[]> = {
  "image-compressor": ["photo-signature-resizer", "qr-code-generator", "json-formatter", "xml-to-json"],
  "photo-signature-resizer": ["image-compressor", "qr-code-generator", "age-calculator", "india-pin-code-finder"],
  "length-converter": ["area-converter", "volume-converter", "weight-converter", "temperature-converter"],
  "weight-converter": ["tola-to-gram-converter", "length-converter", "volume-converter", "temperature-converter"],
  "temperature-converter": ["length-converter", "weight-converter", "volume-converter", "area-converter"],
  "volume-converter": ["area-converter", "length-converter", "weight-converter", "temperature-converter"],
  "area-converter": ["nepal-land-area-converter", "bhutan-land-area-converter", "length-converter", "volume-converter"],
  "bhutan-land-area-converter": ["area-converter", "nepal-land-area-converter", "length-converter", "volume-converter"],
  "nepal-land-area-converter": ["area-converter", "bhutan-land-area-converter", "nepali-date-converter", "length-converter"],
  "tola-to-gram-converter": ["weight-converter", "pakistan-zakat-calculator", "length-converter", "area-converter"],
};

export function getRelatedTools(tool: PublishedTool, relatedIds: readonly string[] = [], registry: readonly Tool[] = tools): PublishedTool[] {
  const published = registry.filter((item): item is PublishedTool => item.status === "published" && item.id !== tool.id);
  const preferred = relatedIds.length > 0 ? relatedIds : (explicitRelatedMap[tool.id] ?? []);
  const ordered = [...preferred.map(id => published.find(item => item.id === id)), ...published.filter(item => item.category === tool.category)];
  const seen = new Set<string>();
  return ordered.filter((item): item is PublishedTool => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id); return true;
  }).slice(0, 4);
}
