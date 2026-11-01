import type { PublishedTool } from '@/data/tools/registry';
import { getIndiaTool } from '@/data/tools/india';
import { ToolPageTemplate } from './tool-page-template';
import { IndiaLookup } from './india-lookup';
import { AgeCalculator, CgpaCalculator } from './india-calculators';
import { PhotoResizer } from './photo-resizer';
import { StructuredData } from '@/components/ui/structured-data';
import { absoluteUrl } from '@/lib/seo/site';
import '@/styles/utilities.css';
import '@/styles/india-tools.css';
export function IndiaPage({ tool }: { tool: PublishedTool }) {
  const content = getIndiaTool(tool.id)!;
  const interactive = tool.id === 'india-pin-code-finder' ? <IndiaLookup kind="pin"/> : tool.id === 'ifsc-code-finder' ? <IndiaLookup kind="ifsc"/> : tool.id === 'photo-signature-resizer' ? <PhotoResizer/> : tool.id === 'age-calculator' ? <AgeCalculator/> : <CgpaCalculator/>;
  return <><StructuredData value={{ '@context': 'https://schema.org', '@type': 'WebApplication', name: tool.name, description: tool.description, url: absoluteUrl(tool.href), applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } }}/><ToolPageTemplate tool={tool} introduction={content.intro} instructions={content.instructions} examples={content.examples} interactiveArea={interactive} method={<section className="content-section india-faq"><h2>{tool.id.includes('finder') ? 'Data source and lookup limitations' : 'Calculation explanation'}</h2><p>{content.method}</p>{tool.id === 'india-pin-code-finder' && <p>Source: <a href="https://www.postalpincode.in/">Postal PIN Code API</a> · <a href="https://www.indiapost.gov.in/">Verify with India Post</a>. Requests are user-initiated, with no bulk fetching or automatic retries. The provider does not publish a freshness guarantee in its response.</p>}{tool.id === 'ifsc-code-finder' && <p>Source: <a href="https://github.com/razorpay/ifsc/wiki/API">Razorpay IFSC API documentation</a> · <a href="https://github.com/razorpay/ifsc">Dataset and license</a>. Availability and source usage restrictions can change; this is a reference lookup, not a payment service.</p>}<h2>Questions before you use the result</h2>{content.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>}/></>;
}
