import type {PublishedTool} from '@/data/tools/registry';
import {getBhutanTool} from '@/data/tools/bhutan';
import {paritySource,bhutanLandUnits} from '@/lib/bhutan/conversions';
import {BhutanParity,BhutanLand} from './bhutan-converters';
import {ToolPageTemplate} from './tool-page-template';
import {StructuredData} from '@/components/ui/structured-data';
import {absoluteUrl} from '@/lib/seo/site';
import '@/styles/utilities.css';
import '@/styles/bhutan-tools.css';
export function BhutanPage({tool}:{tool:PublishedTool}){
 const content=getBhutanTool(tool.id)!,currency=tool.id==='bhutan-btn-inr-converter';
 return <><StructuredData value={{'@context':'https://schema.org','@type':'WebApplication',name:tool.name,description:tool.description,url:absoluteUrl(tool.href),applicationCategory:'UtilitiesApplication',operatingSystem:'Any',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:currency?'BTN':'USD'}}}/><ToolPageTemplate tool={tool} introduction={content.intro} instructions={content.instructions} examples={content.examples} interactiveArea={currency?<BhutanParity/>:<BhutanLand/>} method={<section className="content-section bhutan-method"><h2>Calculation rules and sources</h2><p>{content.method}</p>{currency?<p>Parity reference: <a href={paritySource.url}>Royal Monetary Authority — Monetary Policy</a>. Verified {paritySource.checkedOn}.</p>:<><p>For a single conversion or smaller square units, use the <a href="/tools/area-converter">Area Converter</a>. Reference: <a href="https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9">NIST Guide to the SI — area conversion factors</a>. The international-foot acre is used.</p><dl className="bhutan-factors">{bhutanLandUnits.map(u=><div key={u.id}><dt>1 {u.symbol}</dt><dd>{u.factor} m²</dd></div>)}</dl></>}<h2>Practical questions</h2>{content.faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>}/></>;
}
