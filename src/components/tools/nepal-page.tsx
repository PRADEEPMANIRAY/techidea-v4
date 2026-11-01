import type {PublishedTool} from '@/data/tools/registry';
import {getNepalTool} from '@/data/tools/nepal';
import {calendarSource} from '@/lib/nepal/calendar';
import {NepaliDateConverter} from './nepali-date';
import {NepalLand} from './nepal-land';
import {NepalGpa} from './nepal-gpa';
import {ToolPageTemplate} from './tool-page-template';
import {StructuredData} from '@/components/ui/structured-data';
import {absoluteUrl} from '@/lib/seo/site';
import '@/styles/utilities.css';
import '@/styles/nepal-tools.css';
export function NepalPage({tool}:{tool:PublishedTool}){
 const content=getNepalTool(tool.id)!;
 return <>
  <StructuredData value={{'@context':'https://schema.org','@type':'WebApplication',name:tool.name,description:tool.description,url:absoluteUrl(tool.href),applicationCategory:'UtilitiesApplication',operatingSystem:'Any',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'NPR'}}}/>
  <ToolPageTemplate
   tool={tool}
   introduction={content.intro}
   instructions={content.instructions}
   examples={content.examples}
   descriptionBelowTool={tool.id==='nepal-neb-gpa-calculator'}
   interactiveArea={tool.id==='nepali-date-converter'?<NepaliDateConverter/>:tool.id==='nepal-land-area-converter'?<NepalLand/>:<NepalGpa/>}
   method={<section className="content-section nepal-faq">
    <h2>Calculation rules and sources</h2>
    <p>{content.method}</p>
    {tool.id==='nepali-date-converter'
     ? <p><a href={calendarSource.url}>Pinned calendar dataset</a> · <a href={calendarSource.license}>MIT license and attribution</a> · <a href="https://eg.nepalembassy.gov.np/pages/holidays/">Embassy of Nepal reference dates</a> · <a href="https://nta.gov.np/uploads/contents/MIS%20Report_2081%20Baisakh.pdf">NTA Baisakh 2081 reference</a>. The upstream project contains later years; this release exposes only the stated range.</p>
     : tool.id==='nepal-land-area-converter'
      ? <p>Reference: <a href="https://www.lamahimun.gov.np/sites/lamahimun.gov.np/files/documents/%E0%A4%B6%E0%A4%B9%E0%A4%B0%E0%A5%80.pdf">Nepal municipal construction guidance</a> lists the Ropani/Aana/Paisa/Daam relationships and square-foot convention. Rounded metric figures in printed tables are not chained together here.</p>
      : <p>Policy sources reviewed: <a href="https://lib.moecdc.gov.np/catalog/opac_css/index.php?id=12248&amp;lvl=notice_display">CDC’s Letter Grading Directive 2078 catalogue</a> and <a href="https://neb.gov.np/neb-notice-file/Notices-202509271000503094.pdf">NEB’s Grade 10 supplementary-results notice</a>. These references are not a claim that this custom calculator implements their complete rules.</p>}
    <h2>Practical questions</h2>
    {content.faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
   </section>}
  />
 </>;
}
