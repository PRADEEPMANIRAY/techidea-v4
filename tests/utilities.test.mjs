import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import jsQR from 'jsqr';
import {formatJson,csvToJson,xmlToJson,checkXml,validateCsvFile,decodeCsv,TEXT_LIMIT} from '../src/lib/utilities/text.ts';
import {createQr,qrPixels} from '../src/lib/utilities/qr.ts';
import {inspectImage,validateDimensions,compressionSummary,MAX_IMAGE_BYTES,validateImageBatch,resizedDimensions,compressImage} from '../src/lib/utilities/image.ts';
import {utilities} from '../src/data/tools/utilities.ts';
import {getPublishedTools} from '../src/data/tools/registry.ts';
const parse=text=>new DOMParser({onError:(level,message)=>{throw new Error(message);}}).parseFromString(text,'application/xml');
const xml=text=>JSON.parse(xmlToJson(text,parse));
for(const value of ['null','true','false','0','-0','1.2300e+10','9007199254740993','1e400','"Hello 世界 👋"','"escaped\\n\\t\\\"\\\\"','[]','{}','[1,null,{"a":[true,false]}]','{"__proto__":{"polluted":true}}','{"a":1,"a":2}'])test(`JSON preserves ${value}`,()=>{const pretty=formatJson(value);assert.equal(formatJson(pretty,false),value);});
for(const value of ['', ' ', '{', '{"a":1,}', '[1,]', 'undefined','NaN','01','[1 2]','{"a":}', '"unclosed','{"a":/*comment*/1}','true false'])test(`JSON rejects ${JSON.stringify(value)}`,()=>assert.throws(()=>formatJson(value)));
test('JSON exact pretty layout',()=>assert.equal(formatJson('{"a":[1,{}],"b":[]}'),'{\n  "a": [\n    1,\n    {}\n  ],\n  "b": []\n}'));
test('JSON large valid input',()=>assert.equal(formatJson('['+'0,'.repeat(100000)+'0]',false).length,200003));
test('JSON input limit',()=>assert.throws(()=>formatJson('"'+'x'.repeat(TEXT_LIMIT)+'"'),/limit/));
test('JSON nesting limit',()=>assert.throws(()=>formatJson('['.repeat(129)+'0'+']'.repeat(129)),/nesting/));
const csvCases=[
 ['basic','a,b\n1,2',[{a:'1',b:'2'}]],['CRLF','a,b\r\n1,2\r\n',[{a:'1',b:'2'}]],['CR','a,b\r1,2\r',[{a:'1',b:'2'}]],['quoted comma','a,b\n"x,y",z',[{a:'x,y',b:'z'}]],['escaped quote','a\n"say ""hi"""',[{a:'say "hi"'}]],['embedded LF','a,b\n"x\ny",z',[{a:'x\ny',b:'z'}]],['embedded CRLF','a\n"x\r\ny"',[{a:'x\r\ny'}]],['Unicode','name\n日本語 👋',[{name:'日本語 👋'}]],['empty fields','a,b,c\n,,',[{a:'',b:'',c:''}]],['BOM','\ufeffa\n001',[{a:'001'}]],['spaces',' a ,b\n x , y ',[{' a ':' x ',b:' y '}]],['header only','a,b',[]],['empty quoted','a\n""',[{a:''}]],['prototype key','__proto__\nvalue',[JSON.parse('{"__proto__":"value"}')]],['blank row','a\n\n',[{a:''}]],
];
for(const [name,input,expected]of csvCases)test(`CSV ${name}`,()=>assert.deepEqual(JSON.parse(csvToJson(input)),expected));
for(const input of ['', 'a,a\n1,2', ',b\n1,2','a,b\n1','a\n1,2','a\n"unclosed','a\n"ok"x','a\nx"y','a,b\n\n'])test(`CSV rejects ${JSON.stringify(input)}`,()=>assert.throws(()=>csvToJson(input)));
test('CSV without header',()=>assert.deepEqual(JSON.parse(csvToJson('a,a\n1,2',false)),[['a','a'],['1','2']]));
test('CSV 10000 rows',()=>assert.equal(JSON.parse(csvToJson('a\n'+'x\n'.repeat(10000))).length,10000));
test('CSV row limit',()=>assert.throws(()=>csvToJson('a\n'+'x\n'.repeat(10001)),/rows/));
test('CSV column limit',()=>assert.throws(()=>csvToJson('a,'.repeat(1000)+'z',false),/columns/));
for(const [name,size] of [['file.txt',20],['file.csv',0],['file.csv',TEXT_LIMIT+1]])test(`CSV file validation ${name} ${size}`,()=>assert.throws(()=>validateCsvFile(name,size)));
test('CSV UTF8 file decode',()=>{validateCsvFile('FILE.CSV',10);assert.equal(decodeCsv(new TextEncoder().encode('name\nJosé').buffer),'name\nJosé');assert.throws(()=>decodeCsv(new Uint8Array([255]).buffer),/UTF-8/);});
test('XML attribute and text mapping',()=>assert.deepEqual(xml('<item id="7">Tea</item>'),{name:'item',namespace:null,attributes:[{name:'id',namespace:null,value:'7'}],children:['Tea']}));
test('XML nested repeated elements stay ordered',()=>assert.deepEqual(xml('<r><x>A</x><x>B</x></r>').children.map(c=>c.children[0]),['A','B']));
test('XML mixed content',()=>{const r=xml('<p>Hello <b>world</b>!</p>');assert.equal(r.children[0],'Hello ');assert.equal(r.children[1].name,'b');assert.equal(r.children[2],'!');});
test('XML namespaces and rebinding',()=>{const r=xml('<r xmlns="urn:a" xmlns:p="urn:b"><p:x p:id="1" plain="2"/><p:x xmlns:p="urn:c"/></r>');assert.equal(r.namespace,'urn:a');assert.equal(r.children[0].namespace,'urn:b');assert.equal(r.children[0].attributes[0].namespace,'urn:b');assert.equal(r.children[0].attributes[1].namespace,null);assert.equal(r.children[1].namespace,'urn:c');});
test('XML CDATA Unicode and entities',()=>assert.deepEqual(xml('<r>日本語 &amp; <![CDATA[<x>]]>&#x1F44B;</r>').children,['日本語 & <x>👋']));
test('XML whitespace retained comments omitted',()=>assert.deepEqual(xml('<r> a <!-- skip --> b </r>').children,[' a  b ']));
test('XML empty element',()=>assert.deepEqual(xml('<r/>').children,[]));
for(const input of ['', '<a>','<a></b>','<a x=1/>','<r>&unknown;</r>','<a/><b/>'])test(`XML invalid ${input}`,()=>assert.throws(()=>xml(input)));
for(const input of ['<!DOCTYPE r SYSTEM "https://example.com/test.dtd"><r/>','<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r>&x;</r>','<!DOCTYPE r [<!ENTITY x "boom">]><r>&x;</r>','<!ENTITY x "x"><r/>'])test('XML security rejects '+input.slice(0,45),()=>{let called=false;assert.throws(()=>xmlToJson(input,()=>{called=true;throw new Error('parser called');}),/DOCTYPE|ENTITY/);assert.equal(called,false);});
test('XML depth limit',()=>assert.throws(()=>xml('<r>'.repeat(65)+'</r>'.repeat(65)),/64/));
test('XML node limit',()=>assert.throws(()=>xml('<r>'+'<x/>'.repeat(20000)+'</r>'),/20,000/));
test('XML size limit',()=>assert.throws(()=>checkXml('<r>'+'x'.repeat(TEXT_LIMIT)+'</r>'),/limit/));
for(const level of ['L','M','Q','H'])for(const value of ['https://techidea.online','Hello 世界 — नमस्ते 👋'])test(`QR independently decodes ${level}: ${value}`,()=>{const qr=createQr(value,level,320);const result=jsQR(qrPixels(qr),qr.size,qr.size,{inversionAttempts:'dontInvert'});assert.equal(result?.data,value);assert.equal(qr.size%qr.scale,0);assert.ok(qr.scale>=4);assert.match(qr.svg,/viewBox/);});
for(const [text,level,size,kind]of [['','M',320,'text'],['x'.repeat(1201),'M',320,'text'],['😀'.repeat(301),'M',320,'text'],['\ud800','M',320,'text'],['hi','X',320,'text'],['hi','M',127,'text'],['hi','M',2049,'text'],['javascript:alert(1)','M',320,'url'],['not a url','M',320,'url']])test(`QR rejects ${text.slice(0,20)} ${level} ${size}`,()=>assert.throws(()=>createQr(text,level,size,kind)));
test('QR maximum byte input decodes',()=>{const qr=createQr('x'.repeat(1200),'H',1024);assert.equal(jsQR(qrPixels(qr),qr.size,qr.size)?.data,'x'.repeat(1200));});
test('QR SVG does not include entered markup',()=>assert.ok(!createQr('<script>alert(1)</script>').svg.includes('script')));
const png=(w,h)=>{const b=new Uint8Array(45);b.set([137,80,78,71,13,10,26,10]);const v=new DataView(b.buffer);v.setUint32(8,13);b.set(new TextEncoder().encode('IHDR'),12);v.setUint32(16,w);v.setUint32(20,h);b.set(new TextEncoder().encode('IEND'),37);return b;};
test('Image PNG dimensions before decode',()=>assert.deepEqual(inspectImage(png(640,480),'image/png'),{type:'image/png',width:640,height:480}));
test('Image JPEG dimensions before decode',()=>{const b=new Uint8Array([255,216,255,192,0,17,8,1,224,2,128,3,1,17,0,2,17,0,3,17,0]);assert.deepEqual(inspectImage(b,'image/jpeg'),{type:'image/jpeg',width:640,height:480});});
test('Image WebP dimensions before decode',()=>{const b=new Uint8Array(30);b.set(new TextEncoder().encode('RIFF'));new DataView(b.buffer).setUint32(4,22,true);b.set(new TextEncoder().encode('WEBPVP8X'),8);new DataView(b.buffer).setUint32(16,10,true);b[24]=127;b[25]=2;b[27]=223;b[28]=1;assert.deepEqual(inspectImage(b,'image/webp'),{type:'image/webp',width:640,height:480});b[20]=2;assert.throws(()=>inspectImage(b,'image/webp'),/Animated/);});
for(const [w,h]of [[0,1],[-1,10],[8193,1],[4000,4000],[1.1,3],[Infinity,1]])test(`Image invalid dimensions ${w}x${h}`,()=>assert.throws(()=>validateDimensions(w,h)));
test('Image maximum dimensions accepted',()=>validateDimensions(4000,3000));
test('Image MIME mismatch',()=>assert.throws(()=>inspectImage(png(1,1),'image/jpeg'),/match/));
test('Image fake image rejected',()=>assert.throws(()=>inspectImage(new TextEncoder().encode('<svg/>'),'image/png'),/genuine/));
test('Image oversized file rejected',()=>assert.throws(()=>inspectImage(new Uint8Array(MAX_IMAGE_BYTES+1),'image/png'),/10 MiB/));
test('Image empty file rejected',()=>assert.throws(()=>inspectImage(new Uint8Array(),'image/png')));
test('Image oversized dimensions rejected before decoding',()=>assert.throws(()=>inspectImage(png(100000,100000),'image/png'),/megapixels/));
test('Image animated PNG rejected',()=>{const b=png(10,10);b.set(new TextEncoder().encode('acTL'),37);assert.throws(()=>inspectImage(b,'image/png'),/Animated/);});
for(const [original,output,smaller,label]of [[1000,750,true,'25.0% smaller'],[1000,1000,false,'Same size — no reduction'],[1000,1200,false,'20.0% larger — no size reduction']])test(`Image size reporting ${original}/${output}`,()=>{const s=compressionSummary(original,output);assert.equal(s.smaller,smaller);assert.equal(s.label,label);});
test('All five tools are published and have content',()=>{assert.equal(utilities.length,5);for(const item of utilities){assert.ok(getPublishedTools().some(t=>t.id===item.id));assert.equal(item.examples.length,3);}});
test('Published CSV examples match conversion',()=>{for(const ex of utilities.find(u=>u.id==='csv-to-json').examples)assert.deepEqual(JSON.parse(csvToJson(ex.input)),JSON.parse(ex.result));});
test('XML valid element named parsererror is allowed',()=>assert.equal(xml('<parsererror>ordinary data</parsererror>').name,'parsererror'));
test('CSV repeated long headers cannot amplify output unboundedly',()=>assert.throws(()=>csvToJson('x'.repeat(10000)+'\n'+'v\n'.repeat(1000)),/8 MiB/));
test('JSON pretty output bounded before excessive allocation',()=>assert.throws(()=>formatJson('['.repeat(127)+'0,'.repeat(40000)+'0'+']'.repeat(127)),/8 MiB/));

test('QR branding retains independently decodable colored modules',()=>{
 for(const text of ['https://techidea.online','Hello 世界 नमस्ते']){
  const qr=createQr(text,'M',512,'text',{foreground:'#123456',background:'#ffffff'});
  assert.equal(jsQR(qrPixels(qr),qr.size,qr.size)?.data,text);
  assert.equal(qr.warnings.length,0);
 }
});
test('QR logo forces H and bounds overlay without accepting SVG injection',()=>{
 const logo='data:image/png;base64,iVBORw0KGgo=';
 const qr=createQr('https://techidea.online','L',512,'url',{logoDataUrl:logo,logoPercent:10});
 assert.equal(qr.effectiveLevel,'H');assert.ok(qr.warnings.length>0);
 assert.equal(jsQR(qrPixels(qr),qr.size,qr.size)?.data,'https://techidea.online');
 for(const brand of [{foreground:'red" onload="x'},{logoDataUrl:'data:image/svg+xml,<svg/>'},{logoPercent:16},{logoPercent:NaN}])assert.throws(()=>createQr('test','M',320,'text',brand));
});
test('QR low contrast and inverted colors warn rather than claiming scan reliability',()=>{
 assert.ok(createQr('test','M',320,'text',{foreground:'#eeeeee'}).warnings.length);
 assert.ok(createQr('test','M',320,'text',{foreground:'#ffffff',background:'#000000'}).warnings.length);
});

test('Image batch validates count, total and individual byte limits',()=>{
 assert.doesNotThrow(()=>validateImageBatch([{size:1024},{size:2048}]));
 for(const files of [[],Array(11).fill({size:1}),Array(6).fill({size:10*1024*1024}),[{size:0}],[{size:MAX_IMAGE_BYTES+1}]])assert.throws(()=>validateImageBatch(files));
});
test('Image resize preserves aspect ratio without enlargement',()=>{
 assert.deepEqual(resizedDimensions(1600,900,800,800),{width:800,height:450});
 assert.deepEqual(resizedDimensions(900,1600,800,800),{width:450,height:800});
 assert.deepEqual(resizedDimensions(100,50,800,800),{width:100,height:50});
 for(const bound of [0,-1,1.5,8193,NaN])assert.throws(()=>resizedDimensions(100,50,bound,800));
});
test('Image cancellation before work does not allocate or decode',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(compressImage(new File(['bad'],'bad.png',{type:'image/png'}),'image/png',.8,{signal:controller.signal}),{name:'AbortError'});
});

for (const input of ['{bad', '<root><child></root>', '<a/><b/>', '', '<r>&unknown;</r>']) {
 test('XML refuses invalid document '+JSON.stringify(input),()=>assert.throws(()=>xml(input)));
}
for (const [input, diagnostic] of [
 ['{bad','<html xmlns="http://www.w3.org/1999/xhtml"><body><parsererror/></body></html>'],
 ['<root><child></root>','<root><parsererror xmlns="http://www.w3.org/1999/xhtml"/></root>'],
]) {
 test('Chromium diagnostic DOM must not become JSON: '+input,()=>assert.throws(()=>xmlToJson(input,()=>parse(diagnostic)),/Malformed XML/));
}
for (const ns of ['', 'http://www.w3.org/1999/xhtml','http://www.mozilla.org/newlayout/xml/parsererror.xml']) {
 test('XML preserves an authored parsererror element in namespace '+ns,()=>{
   const r=xml('<parsererror xmlns="'+ns+'" id="p">before<parsererror_/>after</parsererror>');
   assert.equal(r.name,'parsererror');assert.equal(r.attributes.find(a=>a.name==='id').value,'p');
   assert.deepEqual(r.children.map(x=>typeof x==='string'?x:x.name),['before','parsererror_','after']);
 });
}
test('XML keeps prefixed names, parsererror text and repeated children in order',()=>{
 const r=xml('<r xmlns:p="urn:test">parsererror<p:parsererror/><p:parsererror/></r>');
 assert.deepEqual(r.children.map(x=>typeof x==='string'?x:[x.name,x.namespace]),['parsererror',['p:parsererror','urn:test'],['p:parsererror','urn:test']]);
});
test('XML validation does not rename a namespace prefix named parsererror',()=>{
 const r=xml('<r xmlns:parsererror="urn:example"><parsererror:other/><parsererror/></r>');
 assert.deepEqual(r.children.map(x=>x.name),['parsererror:other','parsererror']);
});
