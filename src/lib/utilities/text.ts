export const TEXT_LIMIT = 1024 * 1024;
export const OUTPUT_LIMIT = 8 * 1024 * 1024;
export function checkText(text: string) {
 if (!text.trim()) throw new Error("Enter some input first.");
 if (text.length > TEXT_LIMIT || new TextEncoder().encode(text).length > TEXT_LIMIT) throw new Error("Input exceeds the 1 MiB UTF-8 limit.");
}
// Validate syntax, but retain lexical tokens instead of converting numbers to doubles.
export function formatJson(text: string, pretty = true): string {
 checkText(text);
 try { JSON.parse(text); } catch (error) { throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : "check the syntax"}`); }
 const tokens = text.match(/"(?:[^"\\]|\\[\s\S])*"|[^\s\[\]{},:]+|[\[\]{},:]/g)!;
 let depth=0, outputLength=0; const output:string[]=[];
 const append=(part:string)=>{outputLength+=part.length;if(outputLength>OUTPUT_LIMIT)throw new Error("Formatted output exceeds 8 MiB. Minify or reduce the input.");output.push(part);};
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i];
  if(token==='{'||token==='['){if(++depth>128)throw new Error("JSON nesting exceeds 128 levels.");append(token);if(pretty&&tokens[i+1]!=='}'&&tokens[i+1]!==']')append('\n'+'  '.repeat(depth));}
  else if(token==='}'||token===']'){depth--;if(pretty&&tokens[i-1]!=='{'&&tokens[i-1]!=='[')append('\n'+'  '.repeat(depth));append(token);}
  else if(token===',')append(pretty?',\n'+'  '.repeat(depth):',');
  else if(token===':')append(pretty?': ':':');else append(token);
 }
 return output.join('');
}
export function csvToJson(source:string,headers=true):string {
 checkText(source); const text=source.replace(/^\uFEFF/,'');
 const rows:string[][]=[];let row:string[]=[],value='',state:'start'|'plain'|'quoted'|'closed'='start',ended=false;
 const field=()=>{row.push(value);value='';state='start';if(row.length>1000)throw new Error('CSV exceeds 1,000 columns.');};
 const record=()=>{field();rows.push(row);row=[];if(rows.length>10001)throw new Error('CSV exceeds 10,000 data rows.');};
 for(let i=0;i<text.length;i++){
  const c=text[i];ended=false;
  if(state==='quoted'){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else state='closed';}else value+=c;continue;}
  if(c===','){field();continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;record();ended=true;continue;}
  if(state==='closed')throw new Error(`Unexpected character after closing quote at character ${i+1}.`);
  if(c==='"'){if(state!=='start')throw new Error(`Quote inside an unquoted field at character ${i+1}.`);state='quoted';}
  else{value+=c;state='plain';}
 }
 if(state==='quoted')throw new Error('Unclosed quoted field.');
 if(!ended)record();
 const width=rows[0].length;
 const keyCost=headers?rows[0].reduce((sum,key)=>sum+JSON.stringify(key).length+8,0):0;
 let estimated=2;for(const r of rows){estimated+=keyCost+8;for(const value of r)estimated+=JSON.stringify(value).length+8;if(estimated>OUTPUT_LIMIT)throw new Error("JSON output would exceed 8 MiB. Reduce the CSV or shorten its headers.");}
 rows.forEach((r,i)=>{if(r.length!==width)throw new Error(`Row ${i+1} has ${r.length} fields; expected ${width}.`);});
 if(!headers){if(rows.length>10000)throw new Error('CSV exceeds 10,000 data rows.');return JSON.stringify(rows,null,2);}
 const names=rows.shift()!;
 if(names.some(n=>!n.trim()))throw new Error('Every header must have a nonblank name. Disable headers for an array of rows.');
 if(new Set(names).size!==names.length)throw new Error('Duplicate header names would overwrite data. Use unique headers or disable headers.');
 return JSON.stringify(rows.map(r=>Object.fromEntries(names.map((n,i)=>[n,r[i]]))),null,2);
}
export function checkXml(text:string){checkText(text);if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text))throw new Error('DOCTYPE and ENTITY declarations are not supported. External resources are never loaded.');}
export type XmlNode = {name:string;namespace:string|null;attributes:{name:string;namespace:string|null;value:string}[];children:(string|XmlNode)[]};
export function xmlToJson(text:string,parse:(text:string)=>Document = text=>new DOMParser().parseFromString(text,'application/xml')):string {
 checkXml(text);const document=parse(text);
 if(!document.documentElement || document.getElementsByTagNameNS('http://www.mozilla.org/newlayout/xml/parsererror.xml','parsererror').length)throw new Error('Malformed XML. Check matching tags, quoted attributes, namespaces and entity references.');
 if(document.doctype)throw new Error('Document types are not supported.');
 let count=0;
 function element(el:Element,depth:number):XmlNode {
  if(depth>64||++count>20000)throw new Error('XML exceeds 64 levels or 20,000 nodes.');
  const children:(string|XmlNode)[]=[];
  for(let node=el.firstChild;node;node=node.nextSibling){if(node.nodeType===1)children.push(element(node as Element,depth+1));else if(node.nodeType===3||node.nodeType===4){if(++count>20000)throw new Error('XML exceeds 20,000 nodes.');const text=node.nodeValue??'';if(typeof children.at(-1)==='string')children[children.length-1]=(children.at(-1) as string)+text;else children.push(text);}}
  return {name:el.tagName,namespace:el.namespaceURI||null,attributes:Array.from(el.attributes).map(a=>({name:a.name,namespace:a.namespaceURI||null,value:a.value})),children};
 }
 const output=JSON.stringify(element(document.documentElement,1),null,2);
 if(output.length>OUTPUT_LIMIT)throw new Error("XML tree output exceeds 8 MiB. Reduce the input.");
 return output;
}
export function validateCsvFile(name:string,size:number){if(!/\.csv$/i.test(name))throw new Error('Choose a .csv file encoded as UTF-8.');if(!size||size>TEXT_LIMIT)throw new Error('CSV files must be nonempty and at most 1 MiB.');}
export function decodeCsv(bytes:ArrayBuffer):string {try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('The CSV is not valid UTF-8. Export it as UTF-8 and try again.');}}
