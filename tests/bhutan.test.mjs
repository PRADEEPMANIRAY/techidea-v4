import test from 'node:test';
import assert from 'node:assert/strict';
import {parityAmount,swapCurrency,bhutanLand,bhutanLandUnits,formatArea,paritySource} from '../src/lib/bhutan/conversions.ts';
import {bhutanTools} from '../src/data/tools/bhutan.ts';
import {bhutanPostalStatus} from '../src/data/bhutan/postal-status.ts';
import {getPublishedTools,tools} from '../src/data/tools/registry.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(Math.abs(b)*1e-14,1e-25),`${a} != ${b}`);
for(const currency of ['BTN','INR']){
 for(const [raw,precision,expected] of [['0',2,'0.00'],['2500',2,'2500.00'],['875.50',2,'875.50'],['1.005',2,'1.01'],['.000001',6,'0.000001'],['999.999999',2,'1000.00'],['1000000000000',6,'1000000000000.000000'],['0.5',0,'1'],['1.004999',2,'1.00'],['0.000001',0,'0']])test(`${currency} parity ${raw} at ${precision}`,()=>assert.equal(parityAmount(raw,currency,precision),expected));
 test(`${currency} swap keeps exact amount`,()=>{const target=swapCurrency(currency);assert.notEqual(target,currency);assert.equal(swapCurrency(target),currency);assert.equal(parityAmount('123.456789',target,6),parityAmount('123.456789',currency,6));});
}
for(const raw of ['', ' ', '-1','-0','Infinity','NaN','1,000','1e4','0x10','1.0000001','1000000000000.000001','1000000000001','9'.repeat(33),'₹ 100','1/2','1..2'])test(`parity rejects ${JSON.stringify(raw)}`,()=>assert.throws(()=>parityAmount(raw,'BTN',2)));
for(const precision of [-1,7,1.5,NaN])test(`invalid currency precision ${precision}`,()=>assert.throws(()=>parityAmount('1','INR',precision)));
test('only two currencies supported',()=>{assert.throws(()=>parityAmount('1','USD',2));assert.throws(()=>swapCurrency('USD'));});
test('parity source is authoritative and review dated',()=>{assert.equal(new URL(paritySource.url).hostname,'www.rma.org.bt');assert.equal(paritySource.checkedOn,'2026-10-31');});
// Independently derived from 1 international foot = 0.3048 m;
// 1 yard = 3 feet; 1 acre = 43,560 ft²; hectare = 100 m × 100 m.
const expected={ft2:0.3048**2,m2:1,yd2:(3*0.3048)**2,acre:43560*0.3048**2,ha:100**2,km2:1000**2};
for(const from of Object.keys(expected))for(const to of Object.keys(expected))test(`land ${from} to ${to} and reverse`,()=>{
 const value=bhutanLand('2.75',from).find(r=>r.id===to).value;
 close(value,2.75*expected[from]/expected[to]);
 close(bhutanLand(String(value),to).find(r=>r.id===from).value,2.75);
});
for(const unit of bhutanLandUnits){
 test(`zero ${unit.id}`,()=>assert.ok(bhutanLand('0',unit.id).every(r=>r.value===0)));
 test(`upper bound ${unit.id}`,()=>assert.ok(bhutanLand('1e12',unit.id).every(r=>Number.isFinite(r.value)&&r.value>0)));
 test(`lower bound ${unit.id}`,()=>assert.ok(bhutanLand('1e-12',unit.id).every(r=>Number.isFinite(r.value)&&r.value>0)));
}
for(const raw of ['',' ','-1','-0','1e13','1e-13','1e-999','Infinity','NaN','1,000','<script>','0x10','9'.repeat(129)])test(`land rejects ${JSON.stringify(raw)}`,()=>assert.throws(()=>bhutanLand(raw,'m2')));
test('unknown land unit rejected',()=>assert.throws(()=>bhutanLand('1','ropani')));
test('quarter-acre example exact within floating precision',()=>{const rows=bhutanLand('.25','acre');close(rows.find(r=>r.id==='ft2').value,10890);close(rows.find(r=>r.id==='m2').value,1011.7141056);});
test('metric plan example',()=>{const rows=bhutanLand('600','m2');close(rows.find(r=>r.id==='ha').value,0.06);close(rows.find(r=>r.id==='km2').value,.0006);});
test('square yards example',()=>close(bhutanLand('100','yd2').find(r=>r.id==='ft2').value,900));
test('area precision only changes formatting',()=>{const r=bhutanLand('1','acre').find(r=>r.id==='m2').value;assert.equal(formatArea(r,2),'4046.86');assert.equal(formatArea(r,7),'4046.8564224');});
test('tiny area retains nonzero scientific notation',()=>assert.notEqual(Number(formatArea(bhutanLand('1e-12','ft2').find(r=>r.id==='km2').value,6)),0));
test('rounded nonzero can be distinguished from zero',()=>{const v=bhutanLand('1','ft2').find(r=>r.id==='km2').value;assert.ok(v>0);assert.equal(formatArea(v,0),'0');assert.ok(Number(formatArea(v,10))>0);});
for(const precision of [-1,11,NaN,1.5])test(`invalid area precision ${precision}`,()=>assert.throws(()=>formatArea(1,precision)));
for(const tool of bhutanTools)test(`complete registered Bhutan tool ${tool.id}`,()=>{assert.ok(getPublishedTools().some(t=>t.id===tool.id));assert.equal(tool.examples.length,3);assert.equal(tool.faqs.length,3);assert.ok(tool.intro.length>100);assert.match(tool.method,/browser/);});
test('32 prior tools retained, two completed Bhutan tools added',()=>{assert.equal(getPublishedTools().length,34);assert.equal(getPublishedTools().filter(t=>!t.id.startsWith('bhutan-')).length,32);});
test('postal data limitation prevents publication',()=>{assert.equal(bhutanPostalStatus.coverage,0);assert.match(bhutanPostalStatus.limitation,/reuse permission/);assert.equal(tools.find(t=>t.id===bhutanPostalStatus.id).status,'planned');assert.ok(!getPublishedTools().some(t=>t.id===bhutanPostalStatus.id));});
