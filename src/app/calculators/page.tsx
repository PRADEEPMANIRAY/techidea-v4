import { Directory } from "@/components/tools/directory";
import { tools } from "@/data/tools/registry";
import { calculatorCategoryIds } from "@/data/tools/categories";
import { pageMetadata } from "@/lib/seo/metadata";
const description = "Calculate material estimates, loan repayments, investment projections and everyday percentages. Choose a category to narrow your search.";
export const metadata = pageMetadata("Free calculators", description, "/calculators");
export default function CalculatorsPage() {
  return <Directory title="Free Online Calculators" description={description} items={tools.filter((tool) => calculatorCategoryIds.includes(tool.category))} path="/calculators" allowedCategories={calculatorCategoryIds} />;
}
