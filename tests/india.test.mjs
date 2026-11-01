import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAge, cgpaPercentage } from '../src/lib/india/calculations.ts';
import { lookup, lookupCode, parseLookup, boundedJson, LookupLimitError } from '../src/lib/india/lookups.ts';
import { resizeGeometry, validateTarget, encodeTarget } from '../src/lib/india/resize.ts';
import { indiaTools } from '../src/data/tools/india.ts';
import { getPublishedTools } from '../src/data/tools/registry.ts';
// Synthetic transport fixtures test mapping, never serve as lookup fallbacks.
const pinFixture = [{Status:'Success',PostOffice:[{Name:'Test office A',Pincode:'110001',District:'Test district',State:'Test state',DeliveryStatus:'Delivery'},{Name:'Test office B',Pincode:'110001',District:null,State:null}]}];
const bankFixture = {IFSC:'TEST0000001',BANK:'Test bank',BRANCH:'Test branch',ADDRESS:'Test address',DISTRICT:null,STATE:'Test state'};
for (const [birth,on,expected] of [
  ['2000-06-15','2025-08-20',[25,2,5]], ['2000-02-29','2025-02-28',[25,0,0]],
  ['2000-02-29','2024-02-28',[23,11,31]], ['2000-02-29','2024-02-29',[24,0,0]],
  ['2024-01-31','2024-02-29',[0,1,0]], ['2023-01-31','2023-02-28',[0,1,0]],
  ['2000-06-15','2025-06-14',[24,11,30]], ['2025-01-01','2025-01-01',[0,0,0]],
  ['1900-01-01','2000-01-01',[100,0,0]], ['2000-01-01','9998-12-31',[7998,11,30]],
]) test(`age ${birth} to ${on}`,()=>{const r=calculateAge(birth,on);assert.deepEqual([r.years,r.months,r.days],expected);});
for (const [birth,on] of [['','2025-01-01'],['2023-02-29','2025-01-01'],['1900-02-29','2025-01-01'],['2025-04-31','2025-05-01'],['2025-01-02','2025-01-01'],['1899-01-01','2025-01-01'],['2020-01-01','9999-01-01'],['2020-1-1','2025-01-01']]) test(`invalid age ${birth} ${on}`,()=>assert.throws(()=>calculateAge(birth,on)));
test('birthday countdown on birthday is zero',()=>assert.equal(calculateAge('2000-06-15','2025-06-15').birthdayDays,0));
test('birthday countdown crosses year',()=>{const r=calculateAge('2000-01-01','2025-12-31');assert.equal(r.birthdayDays,1);assert.equal(r.nextBirthday,'2026-01-01');});
test('leap birthday countdown',()=>{const r=calculateAge('2000-02-29','2024-03-01');assert.equal(r.nextBirthday,'2025-02-28');assert.equal(r.birthdayDays,364);});
test('elapsed days include leap day without DST drift',()=>assert.equal(calculateAge('2024-02-28','2024-03-01').totalDays,2));
test('future birth rejected even for a later cutoff',()=>assert.throws(()=>calculateAge('2030-01-01','2031-01-01','2026-10-30'),/future/));
test('birth today accepted with explicit local today',()=>assert.equal(calculateAge('2026-10-30','2026-10-30','2026-10-30').totalDays,0));
for(const [args,expected] of [[['8','10','9.5','0'],76],[['8.2','10','10','-5'],77],[['3.6','4','25','0'],90],[['0','10','10','0'],0],[['10','10','10','0'],100],[['7.25','10','9.5','0'],68.875]]) test(`CGPA ${args}`,()=>assert.equal(cgpaPercentage(...args),expected));
for(const args of [['','10','10','0'],['-1','10','10','0'],['11','10','10','0'],['8','0','10','0'],['8','10','0','0'],['8','10','10','30'],['0','10','10','-5'],['8','10','NaN','0'],['8','10','10','Infinity'],['8','10','1e1','0'],['8','10','10','']]) test(`invalid CGPA ${args}`,()=>assert.throws(()=>cgpaPercentage(...args)));
for(const [kind,value,expected] of [['pin',' 110001 ','110001'],['ifsc','sbin0000691','SBIN0000691']]) test(`normalize ${kind}`,()=>assert.equal(lookupCode(kind,value),expected));
for(const [kind,value] of [['pin',''],['pin','012345'],['pin','12345'],['pin','1234567'],['pin','१२३४५६'],['ifsc','SBINO000691'],['ifsc','https://bad'],['ifsc','SBIN000069!']]) test(`invalid lookup ${kind} ${value}`,()=>assert.throws(()=>lookupCode(kind,value)));
test('multiple offices and missing fields preserved',()=>{const rows=parseLookup('pin','110001',pinFixture);assert.equal(rows.length,2);assert.equal(rows[0].Delivery,'Delivery');assert.equal(rows[1].District,'Not supplied');});
test('postal no records is distinct from source failure',()=>assert.deepEqual(parseLookup('pin','110001',[{Status:'Error',PostOffice:null}]),[]));
test('postal source failure rejected',()=>assert.throws(()=>parseLookup('pin','110001',[{Status:'ServiceUnavailable'}])));
test('postal code mismatch rejected',()=>assert.throws(()=>parseLookup('pin','110002',pinFixture)));
test('bank missing district handled',()=>assert.equal(parseLookup('ifsc','TEST0000001',bankFixture)[0].District,'Not supplied'));
test('bank mismatch rejected',()=>assert.throws(()=>parseLookup('ifsc','TEST0000002',bankFixture)));
test('invalid source field rejected',()=>assert.throws(()=>parseLookup('ifsc','TEST0000001',{...bankFixture,STATE:{html:'bad'}})));
test('too many postal rows rejected',()=>assert.throws(()=>parseLookup('pin','110001',[{Status:'Success',PostOffice:Array(501).fill(pinFixture[0].PostOffice[0])}])));
test('bounded JSON accepts Unicode',async()=>assert.deepEqual(await boundedJson(new Response(JSON.stringify({name:'दिल्ली'}))),{name:'दिल्ली'}));
test('bounded JSON rejects invalid JSON',async()=>assert.rejects(()=>boundedJson(new Response('<html>error</html>')),/invalid JSON/));
test('bounded JSON rejects declared oversized body',async()=>assert.rejects(()=>boundedJson(new Response('{}',{headers:{'Content-Length':'262145'}})),/safety limit/));
test('bounded JSON rejects streamed oversized body',async()=>assert.rejects(()=>boundedJson(new Response('x'.repeat(262145))),/safety limit/));
test('lookup uses fixed HTTPS host without credentials/referrer',async()=>{let args;const rows=await lookup('ifsc','test0000001',undefined,async(...a)=>{args=a;return Response.json(bankFixture);});assert.equal(rows[0].Bank,'Test bank');assert.equal(args[0],'https://ifsc.razorpay.com/TEST0000001');assert.equal(args[1].credentials,'omit');assert.equal(args[1].referrerPolicy,'no-referrer');assert.equal(args[1].redirect,'error');});
test('postal lookup maps real response contract',async()=>assert.equal((await lookup('pin','110001',undefined,async()=>Response.json(pinFixture))).length,2));
test('invalid input never reaches transport',async()=>{let calls=0;await assert.rejects(()=>lookup('pin','invalid',undefined,async()=>{calls++;return new Response();}));assert.equal(calls,0);});
test('bank 404 is empty result',async()=>assert.deepEqual(await lookup('ifsc','TEST0000001',undefined,async()=>new Response('Not found',{status:404})),[]));
test('postal 404 is service failure, not missing record',async()=>assert.rejects(()=>lookup('pin','110001',undefined,async()=>new Response('',{status:404})),/HTTP 404/));
test('upstream 500 handled',async()=>assert.rejects(()=>lookup('pin','110001',undefined,async()=>new Response('',{status:500})),/HTTP 500/));
test('network failure is actionable',async()=>assert.rejects(()=>lookup('pin','110001',undefined,async()=>{throw new TypeError('fetch failed');}),/connection/));
test('429 respects Retry-After',async()=>assert.rejects(()=>lookup('pin','110001',undefined,async()=>new Response('',{status:429,headers:{'Retry-After':'120'}})),e=>e instanceof LookupLimitError&&e.retrySeconds===120));
test('429 defaults to one minute',async()=>assert.rejects(()=>lookup('pin','110001',undefined,async()=>new Response('',{status:429})),e=>e.retrySeconds===60));
test('cancelled request aborts',async()=>{const controller=new AbortController();controller.abort();await assert.rejects(()=>lookup('pin','110001',controller.signal,async(_,options)=>{assert.equal(options.signal.aborted,true);throw new DOMException('Aborted','AbortError');}),/cancelled/);});
test('timeout aborts the request',async t=>{t.mock.timers.enable({apis:['setTimeout']});const pending=lookup('pin','110001',undefined,async(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))));t.mock.timers.tick(12000);await assert.rejects(pending,/12 seconds/);});
test('fit retains entire image and pads',()=>assert.deepEqual(resizeGeometry(400,200,200,230,'fit'),{x:0,y:65,width:200,height:100}));
test('crop centers and preserves aspect',()=>assert.deepEqual(resizeGeometry(400,200,100,100,'crop'),{x:-50,y:0,width:200,height:100}));
test('portrait fit padding',()=>assert.deepEqual(resizeGeometry(100,200,100,100,'fit'),{x:25,y:0,width:50,height:100}));
test('same aspect needs no padding',()=>assert.deepEqual(resizeGeometry(200,100,100,50,'fit'),{x:0,y:0,width:100,height:50}));
for(const args of [[0,200,50],[-1,200,50],[1.5,200,50],[8193,100,50],[4000,4000,50],[200,230,0],[200,230,NaN],[200,230,10241]]) test(`invalid resize target ${args}`,()=>assert.throws(()=>validateTarget(...args)));
test('KB target uses 1024 bytes',()=>assert.equal(validateTarget(200,230,50),51200));
test('JPEG chooses highest tested quality meeting target',async()=>{let calls=0;const r=await encodeTarget(async q=>{calls++;return new Blob(['x'.repeat(Math.round(q*1000))],{type:'image/jpeg'});},'image/jpeg',750);assert.equal(r.achieved,true);assert.equal(r.blob.size,750);assert.equal(r.quality,.75);assert.equal(calls,6);});
test('unreachable size returns honest failure and smallest tested file',async()=>{let calls=0;const r=await encodeTarget(async q=>{calls++;return new Blob(['x'.repeat(100+Math.round(q*100))],{type:'image/webp'});},'image/webp',100);assert.equal(r.achieved,false);assert.equal(r.blob.size,105);assert.equal(calls,20);});
test('PNG encoded only once',async()=>{let calls=0;const r=await encodeTarget(async()=>{calls++;return new Blob(['xxxx'],{type:'image/png'});},'image/png',2);assert.equal(calls,1);assert.equal(r.achieved,false);});
test('unsupported browser output format rejected',async()=>assert.rejects(()=>encodeTarget(async()=>new Blob(['x'],{type:'image/png'}),'image/webp',100),/cannot encode/));
test('empty encoded output rejected',async()=>assert.rejects(()=>encodeTarget(async()=>new Blob([],{type:'image/jpeg'}),'image/jpeg',100)));
for(const tool of indiaTools) test(`published complete tool ${tool.id}`,()=>{assert.ok(getPublishedTools().some(t=>t.id===tool.id));assert.equal(tool.examples.length,3);assert.equal(tool.faqs.length,3);assert.ok(tool.intro.length>100);});
test('five new tools plus all previous tools remain published',()=>assert.equal(getPublishedTools().filter(tool=>!tool.id.startsWith('bhutan-')&&!tool.id.startsWith('nepal')&&!tool.id.startsWith('pakistan-')&&tool.id!=='tola-to-gram-converter').length,25));
