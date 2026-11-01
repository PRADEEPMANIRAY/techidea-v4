import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateGpa,exampleGrades,hundredths} from '../src/lib/pakistan/gpa.ts';
import {calculateZakat,zakatDefaults,paisa,formatPkr} from '../src/lib/pakistan/zakat.ts';
import {searchPakistanPostal} from '../src/lib/pakistan/postal.ts';
import {pakistanPostalRecords,postalSource} from '../src/data/pakistan/postal.ts';
import {tolaDefinition,GRAMS_PER_TOLA} from '../src/lib/pakistan/tola.ts';
import {convert,formatResult,swapUnits} from '../src/lib/converters/calculate.ts';
import {pakistanTools} from '../src/data/tools/pakistan.ts';
import {getPublishedTools} from '../src/data/tools/registry.ts';
const course=(gradeId='a',credits='3',excluded=false)=>({id:'c',name:'Subject',gradeId,credits,excluded});
const semester=(courses,name='Semester')=>({id:'s',name,courses});
const gpa=(courses,grades=exampleGrades,maximum='4')=>calculateGpa([semester(courses)],grades,maximum);
const zakat=(patch={})=>calculateZakat({...zakatDefaults(),cash:'1000000',liabilities:'100000',nisab:'500000',holding:'yes',...patch});
test('weighted GPA: 3-credit A and 1-credit B',()=>{const r=gpa([course('a','3'),course('b','1')]);assert.equal(r.cgpa,3.75);assert.equal(r.totalCredits,4);assert.equal(r.totalQualityPoints,15);});
test('CGPA weights semesters rather than averaging GPAs',()=>{const r=calculateGpa([semester([course('a','3'),course('b','1')]),semester([course('c','1')])],exampleGrades,'4');assert.equal(r.cgpa,3.4);assert.equal(r.semesters[1].gpa,2);assert.equal(r.totalQualityPoints,17);});
test('custom five-point scale',()=>assert.equal(gpa([course('x','2'),course('y','3')],[{id:'x',label:'X',points:'5'},{id:'y',label:'Y',points:'4'}],'5').cgpa,4.4));
test('fractional points and credits use full quality products',()=>{const r=gpa([course('x','1.25'),course('y','2.5')],[{id:'x',label:'A-',points:'3.67'},{id:'y',label:'B+',points:'3.33'}]);assert.equal(r.totalQualityPoints,12.9125);assert.ok(Math.abs(r.cgpa-3.4433333333333334)<1e-12);});
test('zero-point failure remains in denominator',()=>assert.equal(gpa([course('a','3'),course('f','3')]).cgpa,2));
test('all included failures produce zero GPA',()=>assert.equal(gpa([course('f','3')]).cgpa,0));
test('explicit exclusion removes numerator and denominator',()=>{const r=gpa([course('a','3'),course('f','3',true)]);assert.equal(r.cgpa,4);assert.equal(r.totalCredits,3);assert.equal(r.semesters[0].courses[1].excluded,true);});
test('excluded course can have zero credits and no grade',()=>assert.equal(gpa([course('a'),course('','0',true)]).totalCredits,3));
test('semester with only excluded credits has null GPA',()=>{const r=calculateGpa([semester([course('a')]),semester([course('','0',true)])],exampleGrades,'4');assert.equal(r.semesters[1].gpa,null);assert.equal(r.cgpa,4);});
test('duplicate subject names do not trigger invented replacement policy',()=>assert.equal(gpa([course('a','3'),course('b','3')]).cgpa,3.5));
test('maximum supported 360 courses',()=>{const r=calculateGpa(Array.from({length:12},()=>semester(Array.from({length:30},()=>course('a','30')))),exampleGrades,'4');assert.equal(r.totalCredits,10800);assert.equal(r.cgpa,4);});
for(const [label,semesters,grades,max] of [
 ['no semesters',[],exampleGrades,'4'],['too many semesters',Array(13).fill(semester([course()])),exampleGrades,'4'],
 ['empty semester',[semester([])],exampleGrades,'4'],['31 courses',[semester(Array(31).fill(course()))],exampleGrades,'4'],
 ['missing grade',[semester([course('')])],exampleGrades,'4'],['unknown grade',[semester([course('missing')])],exampleGrades,'4'],
 ['zero included credits',[semester([course('a','0')])],exampleGrades,'4'],['negative credits',[semester([course('a','-1')])],exampleGrades,'4'],
 ['over 30 credits',[semester([course('a','30.01')])],exampleGrades,'4'],['blank credits',[semester([course('a','')])],exampleGrades,'4'],
 ['all excluded',[semester([course('a','3',true)])],exampleGrades,'4'],['invalid scale',[semester([course()])],exampleGrades,'0'],
 ['points above scale',[semester([course()])],exampleGrades,'3'],['scale too large',[semester([course()])],exampleGrades,'11'],
 ['duplicate grade names',[semester([course()])],[{id:'a',label:'A',points:'4'},{id:'b',label:'a',points:'3'}],'4'],
 ['duplicate grade IDs',[semester([course()])],[{id:'a',label:'A',points:'4'},{id:'a',label:'B',points:'3'}],'4'],
 ['negative grade points',[semester([course()])],[{id:'a',label:'A',points:'-1'},{id:'b',label:'B',points:'0'}],'4'],
 ['overlong subject',[semester([{...course(),name:'x'.repeat(81)}])],exampleGrades,'4'],
]) test(`GPA rejects ${label}`,()=>assert.throws(()=>calculateGpa(semesters,grades,max)));
for(const value of ['NaN','Infinity','1e3','1,000','1.001','-0','']) test(`bounded decimal rejects ${value}`,()=>assert.throws(()=>hundredths(value,'test',30)));
test('decimal parsing retains hundredths',()=>assert.equal(hundredths('0.29','test',30),29));
test('standard Zakat on net wealth',()=>{const r=zakat();assert.equal(r.gross,1000000);assert.equal(r.net,900000);assert.equal(r.estimate,22500);assert.equal(r.status,'estimated');});
test('Zakat includes each eligible asset once',()=>{const r=zakat({cash:'100',savings:'200',gold:'300',silver:'400',investments:'500',other:'600',liabilities:'100',nisab:'1000'});assert.equal(r.gross,2100);assert.equal(r.net,2000);assert.equal(r.estimate,50);});
test('exact Nisab equality qualifies in chosen model',()=>{const r=zakat({cash:'500000',liabilities:'0'});assert.equal(r.aboveNisab,true);assert.equal(r.estimate,12500);});
test('one paisa below Nisab is below',()=>{const r=zakat({cash:'499999.99',liabilities:'0'});assert.equal(r.status,'below-nisab');assert.equal(r.estimate,0);});
test('liabilities exceeding assets clamp net to zero',()=>{const r=zakat({liabilities:'2000000'});assert.equal(r.net,0);assert.equal(r.estimate,0);});
test('zero assets',()=>assert.equal(zakat({cash:'0',liabilities:'0'}).estimate,0));
test('unknown holding period does not claim payable amount',()=>{const r=zakat({holding:'unsure'});assert.equal(r.estimate,null);assert.equal(r.conditionalEstimate,22500);assert.equal(r.status,'needs-review');});
test('holding period not met keeps conditional amount separate',()=>{const r=zakat({holding:'no'});assert.equal(r.estimate,0);assert.equal(r.conditionalEstimate,22500);assert.equal(r.status,'holding-not-met');});
test('custom Zakat rate',()=>assert.equal(zakat({rate:'3'}).estimate,27000));
test('final paisa rounds half up exactly',()=>assert.equal(zakat({cash:'1',liabilities:'0',nisab:'0.01',rate:'2.5'}).estimate,.03));
test('threshold comparison avoids floating rounding',()=>assert.equal(zakat({cash:'0.10',savings:'0.20',liabilities:'0',nisab:'0.30'}).aboveNisab,true));
test('large exact PKR input',()=>assert.equal(zakat({cash:'1000000000000',liabilities:'0',nisab:'1'}).estimate,25000000000));
test('fractional PKR value and rate',()=>assert.equal(zakat({cash:'1234.56',liabilities:'0',nisab:'1',rate:'2.5'}).estimate,30.86));
for(const patch of [{nisab:''},{nisab:'0'},{nisab:'-1'},{cash:'-1'},{cash:'1.001'},{cash:'Infinity'},{cash:'1000000000000.01'},{liabilities:'-1'},{rate:'0'},{rate:'100.01'},{rate:'2.555'},{rate:'NaN'},{holding:'invalid'}]) test(`Zakat rejects ${JSON.stringify(patch)}`,()=>assert.throws(()=>zakat(patch)));
test('Nisab is blank and holding status unsure by default',()=>{assert.equal(zakatDefaults().nisab,'');assert.equal(zakatDefaults().rate,'2.5');assert.equal(zakatDefaults().holding,'unsure');});
test('paisa representation and explicit PKR formatting',()=>{assert.equal(paisa('0.29','cash'),BigInt(29));assert.match(formatPkr(22500),/PKR/);});
// These expected source facts are independent of the search implementation.
for(const [code,office,province] of [['44000','ISLAMABAD GPO','Federal Capital'],['44210','ISLAMABAD F-7 MARKAZ','Federal Capital'],['44220','ISLAMABAD F-8 MARKAZ','Federal Capital'],['44100','ISLAMABAD G-10 MARKAZ','Federal Capital'],['54000','LAHORE GPO','Punjab'],['54810','LAHORE CANTT. GPO','Punjab'],['54700','LAHORE MODEL TOWN','Punjab'],['74200','KARACHI GPO','Sindh'],['75580','KARACHI GOVERNOR HOUSE','Sindh'],['75300','KARACHI GULSHAN-E-IQBAL','Sindh']]) test(`verified postal fact ${code}`,()=>{const rows=searchPakistanPostal(code,'code');assert.equal(rows.length,1);assert.equal(rows[0].office,office);assert.equal(rows[0].province,province);});
test('postal name supports multiple selected offices',()=>assert.equal(searchPakistanPostal('islamabad','name').length,4));
test('Lahore has three selected entries, not full-city coverage',()=>assert.equal(searchPakistanPostal('LAHORE','name').length,3));
test('postal punctuation and case normalization',()=>assert.equal(searchPakistanPostal('lahore cantt','name').length,2));
test('postal unknown code is empty, not invalid format',()=>assert.deepEqual(searchPakistanPostal('99999','code'),[]));
test('postal leading-zero code keeps five-digit validation',()=>assert.deepEqual(searchPakistanPostal('04402','code'),[]));
test('unknown office yields no fabricated result',()=>assert.deepEqual(searchPakistanPostal('Unlisted office','name'),[]));
for(const [query,mode] of [['','code'],['4400','code'],['440000','code'],['44A00','code'],['۴۴۰۰۰','code'],['a','name'],['x'.repeat(81),'name'],['a\0b','name'],['44000','invalid'],['---','name']]) test(`postal rejects ${JSON.stringify([query,mode])}`,()=>assert.throws(()=>searchPakistanPostal(query,mode)));
test('postal lookup remains functional when network fetch fails',t=>{const fetchMock=t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('Network unavailable');});assert.equal(searchPakistanPostal('74200','code')[0].office,'KARACHI GPO');assert.equal(fetchMock.mock.callCount(),0);});
test('source and coverage are explicit and bounded',()=>{assert.equal(pakistanPostalRecords.length,10);assert.equal(new Set(pakistanPostalRecords.map(r=>r.code)).size,10);assert.match(postalSource.url,/^https:\/\/www\.pakpost\.gov\.pk\//);assert.equal(postalSource.checkedOn,'2026-10-30');assert.match(postalSource.coverage,/10 selected/);});
for(const [value,from,to,expected] of [['1','tola','g',11.6638038],['.25','tola','g',2.91595095],['100','tola','kg',1.16638038],['11.6638038','g','tola',1],['1.16638038','kg','tola',100],['0','tola','g',0],['-1','tola','g',-11.6638038],['1000000000','tola','g',11663803800]]) test(`tola ${value} ${from} to ${to}`,()=>{const r=convert(tolaDefinition,value,from,to);assert.equal(r.ok,true);assert.ok(Math.abs(r.value-expected)<Math.max(1e-10,Math.abs(expected)*1e-14));});
for(const value of ['','NaN','1e999','12 grams','1,000']) test(`tola invalid ${value}`,()=>assert.equal(convert(tolaDefinition,value,'tola','g').ok,false));
test('tola factor precision and reversible unit selection',()=>{assert.equal(GRAMS_PER_TOLA,11.6638038);assert.equal(formatResult(11.6638038,7),'11.6638038');assert.equal(formatResult(11.6638038,2),'11.66');assert.deepEqual(swapUnits({from:'tola',to:'g'}),{from:'g',to:'tola'});});
for(const tool of pakistanTools) test(`complete registered Pakistan tool ${tool.id}`,()=>{assert.ok(getPublishedTools().some(t=>t.id===tool.id&&t.href===`/tools/${tool.id}`));assert.equal(tool.examples.length,3);assert.equal(tool.faqs.length,3);assert.ok(tool.instructions.length>=3);assert.ok(tool.description.length>70);});
test('all 25 baseline tools preserved with 29 pre-Nepal tools',()=>{const ids=getPublishedTools().map(t=>t.id);assert.equal(ids.filter(id=>!id.startsWith('bhutan-')&&!id.startsWith('nepal')).length,29);for(const id of ['india-pin-code-finder','ifsc-code-finder','photo-signature-resizer','age-calculator','cgpa-to-percentage','xml-to-json','csv-to-json','qr-code-generator','emi-calculator','sip-calculator','gst-calculator','length-converter','weight-converter','temperature-converter','volume-converter','area-converter','plywood-calculator','wood-cft-calculator','paint-calculator','concrete-calculator','tile-calculator','image-compressor','json-formatter','discount-calculator','percentage-calculator'])assert.ok(ids.includes(id),id);});
test('GPA controls include semester legends and labelled removal',()=>{const source=readFileSync(new URL('../src/components/tools/pakistan-gpa.tsx',import.meta.url),'utf8');assert.match(source,/<legend>/);assert.match(source,/aria-label=/);assert.match(source,/role="alert"/);});
test('new layout has mobile course stacking and keyboard focus',()=>{const css=readFileSync(new URL('../src/styles/pakistan-tools.css',import.meta.url),'utf8');assert.match(css,/@media\(max-width:650px\)/);assert.match(css,/:focus-visible/);});
