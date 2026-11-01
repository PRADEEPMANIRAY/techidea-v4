import type {PublishedTool} from '@/data/tools/registry';
import {getPakistanTool} from '@/data/tools/pakistan';
import {postalSource} from '@/data/pakistan/postal';
import {PakistanGpa} from './pakistan-gpa';
import {PakistanZakat} from './pakistan-zakat';
import {PakistanPostal} from './pakistan-postal';
import {UnitConverter} from './unit-converter';
import {tolaDefinition} from '@/lib/pakistan/tola';
import {ToolPageTemplate} from './tool-page-template';
import {StructuredData} from '@/components/ui/structured-data';
import {absoluteUrl} from '@/lib/seo/site';
import '@/styles/utilities.css';
import '@/styles/pakistan-tools.css';
export function PakistanPage({tool}:{tool:PublishedTool}){
 const content=getPakistanTool(tool.id)!;
 const area=tool.id==='pakistan-gpa-calculator'?<PakistanGpa/>:tool.id==='pakistan-zakat-calculator'?<PakistanZakat/>:tool.id==='pakistan-postal-code-finder'?<PakistanPostal/>:<UnitConverter definition={tolaDefinition}/>;
 return <><StructuredData value={{'@context':'https://schema.org','@type':'WebApplication',name:tool.name,description:tool.description,url:absoluteUrl(tool.href),applicationCategory:'UtilitiesApplication',operatingSystem:'Any',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'PKR'}}}/><ToolPageTemplate tool={tool} introduction={content.intro} instructions={content.instructions} examples={content.examples} interactiveArea={area} method={<section className="content-section pk-faq"><h2>{tool.id==='pakistan-postal-code-finder'?'Verified coverage and source limitations':'Calculation explanation'}</h2><p>{content.method}</p>{tool.id==='pakistan-postal-code-finder'&&<p>Sources: <a href={postalSource.url}>Pakistan Post directory</a> and <a href={postalSource.karachiSource}>official delivery-office directory</a>. Selected office facts are attributed to Pakistan Post; no open license or permission to redistribute its full database is asserted. Consult the original for offices outside this reference.</p>}{tool.id==='pakistan-zakat-calculator'&&<p>Background reading: <a href="https://islamic-relief.org/zakat/">Islamic Relief’s explanation of Zakat, Nisab and the lunar holding period</a>. This calculator does not import the monetary thresholds shown on that page or endorse them as current PKR values.</p>}<h2>Practical questions</h2>{content.faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>}/></>;
}
