import type {PublishedTool} from '@/data/tools/registry';
import {utilities,type UtilityContent} from '@/data/tools/utilities';
import {ToolPageTemplate} from './tool-page-template';
import {TextUtility} from './text-utility';
import {QrUtility} from './qr-utility';
import {ImageUtility} from './image-utility';
import {StructuredData} from '@/components/ui/structured-data';
import {absoluteUrl} from '@/lib/seo/site';
import '@/styles/utilities.css';

export function UtilityPage({tool,content}:{tool:PublishedTool;content:UtilityContent}){
  return <>
    <StructuredData value={{'@context':'https://schema.org','@type':'WebApplication',name:tool.name,description:tool.description,url:absoluteUrl(tool.href),applicationCategory:'UtilitiesApplication',operatingSystem:'Any',browserRequirements:'Requires JavaScript and a modern browser',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'}}}/>
    <ToolPageTemplate tool={tool} introduction={content.intro} instructions={content.instructions} examples={content.examples} faqs={content.faqs} relatedToolIds={tool.id === 'image-compressor' ? undefined : utilities.map(item=>item.id)} descriptionBelowTool={content.id==='json-formatter'} interactiveArea={content.id==='qr-code-generator'?<QrUtility/>:content.id==='image-compressor'?<ImageUtility/>:<TextUtility key={content.id} id={content.id}/>} method={<section className="content-section utility-notes"><h2>{content.id==='xml-to-json'?'XML mapping, security and limitations':'Privacy and limitations'}</h2><ul>{content.notes.map(note=><li key={note}>{note}</li>)}</ul><p>Processing uses browser memory only. Nothing you enter is sent to a conversion service or stored by these tools. Downloads are saved by your browser, and copied results remain on your clipboard until replaced.</p></section>}/>
  </>;
}
