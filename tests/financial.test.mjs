import assert from 'node:assert/strict';
import test from 'node:test';
import { financialDefinitions, getFinancial } from '../src/data/tools/financial.ts';
import { calculateFinancial, financialDefaults, emiCsv, formatFinancial } from '../src/lib/calculators/financial.ts';
const run=(id,input={})=>{const d=getFinancial(`${id}-calculator`);return calculateFinancial(d,{...financialDefaults(d),...input});};
const good=(id,input={})=>{const r=run(id,input);assert.equal(r.ok,true,JSON.stringify(r));return r;};
const cases=[
 ['emi','zero interest',{principal:'1200',rate:'0',tenure:'12',tenureUnit:'months'},{emi:100,interest:0,repayment:1200}],
 ['emi','one month',{principal:'1000',rate:'12',tenure:'1',tenureUnit:'months'},{emi:1010,interest:10,repayment:1010}],
 ['emi','standard reducing balance',{}, {emi:8884.88}],
 ['emi','decimal principal',{principal:'1234.56',rate:'0',tenure:'12',tenureUnit:'months'},{emi:102.88,repayment:1234.56}],
 ['emi','large loan',{principal:'10000000000',rate:'0',tenure:'1',tenureUnit:'months'},{emi:10000000000}],
 ['sip','zero returns',{monthly:'100',return:'0',years:'1'},{invested:1200,value:1200,gains:0}],
 ['sip','annual step up',{monthly:'100',return:'0',years:'2',stepUp:'10'},{invested:2520,value:2520}],
 ['sip','zero contribution',{monthly:'0',return:'12',years:'2'},{invested:0,value:0,gains:0}],
 ['sip','contribution rounding',{monthly:'0.05',return:'0',years:'2',stepUp:'10'},{invested:1.32,value:1.32}],
 ['gst','exclusive',{amount:'1000',rate:'18'},{taxable:1000,gst:180,final:1180,cgst:90,sgst:90}],
 ['gst','inclusive',{amount:'1180',rate:'18',taxMode:'inclusive'},{taxable:1000,gst:180,final:1180}],
 ['gst','custom rate',{amount:'2000',rate:'7.5',split:'igst'},{gst:150,igst:150,final:2150}],
 ['gst','half paise tie',{amount:'0.05',rate:'10'},{gst:0.01,cgst:0,sgst:0.01,final:0.06}],
 ['gst','zero tax',{amount:'99.99',rate:'0'},{taxable:99.99,gst:0,final:99.99}],
 ['gst','zero amount',{amount:'0'},{gst:0,final:0}],
 ['gst','inclusive small amount',{amount:'0.03',rate:'18',taxMode:'inclusive'},{taxable:0.03,gst:0,final:0.03}],
 ['discount','sequential discounts',{original:'1000',discount:'20',additional:'10',tax:'18'},{discount:200,afterFirst:800,additional:80,afterAll:720,tax:129.6,final:849.6,savings:280}],
 ['discount','optional blanks',{original:'80',discount:'25',additional:'',tax:''},{final:60,savings:20}],
 ['discount','full discount',{discount:'100',tax:'18'},{final:0,savings:1000}],
 ['discount','zero price',{original:'0'},{final:0}],
 ['discount','round half up',{original:'0.05',discount:'10',additional:'',tax:''},{discount:0.01,final:0.04}],
 ['percentage','of',{mode:'of',x:'15',y:'200'},{result:30}],
 ['percentage','ratio',{mode:'ratio',x:'25',y:'200'},{result:12.5}],
 ['percentage','increase',{mode:'increase',x:'80',y:'100'},{result:25}],
 ['percentage','decrease',{mode:'decrease',x:'100',y:'80'},{result:20}],
 ['percentage','negative original',{mode:'increase',x:'-100',y:'-50'},{result:50}],
 ['percentage','negative ratio',{mode:'ratio',x:'-25',y:'100'},{result:-25}],
 ['percentage','opposite signs',{mode:'difference',x:'-100',y:'100'},{result:200}],
 ['percentage','same signed numbers',{mode:'difference',x:'-50',y:'-50'},{result:0}],
 ['percentage','decimal arithmetic',{mode:'of',x:'12.5',y:'0.8'},{result:0.1}],
 ['percentage','zero percentage',{mode:'of',x:'0',y:'0'},{result:0}],
 ['percentage','large values',{mode:'of',x:'1000000000000',y:'1000000000000'},{result:1e22}],
];
for(const [id,name,input,expected]of cases)test(`${id}: ${name}`,()=>{const r=good(id,input);for(const [key,value]of Object.entries(expected))assert.ok(Math.abs(r.values[key]-value)<=Math.max(1e-10,Math.abs(value)*1e-14),`${key}: ${r.values[key]} != ${value}`);});
for(const [id,input]of [
 ['emi',{principal:'0'}],['emi',{principal:'-1'}],['emi',{rate:'-1'}],['emi',{tenure:'0'}],['emi',{tenure:'601',tenureUnit:'months'}],['emi',{tenure:'1.5',tenureUnit:'months'}],['emi',{principal:'0.001'}],
 ['sip',{return:'-100'}],['sip',{return:'-101'}],['sip',{years:'0'}],['sip',{years:'1.5'}],['sip',{monthly:'-1'}],['sip',{stepUp:'-1'}],['sip',{monthly:'10000000000',return:'100',years:'50',stepUp:'100'}],
 ['gst',{rate:'-1'}],['gst',{amount:'-1'}],['gst',{split:'invalid'}],['discount',{discount:'101'}],['discount',{additional:'-1'}],['percentage',{mode:'ratio',y:'0'}],['percentage',{mode:'increase',x:'0'}],['percentage',{mode:'decrease',x:'0'}],['percentage',{mode:'difference',x:'0',y:'0'}]
])test(`${id} rejects ${JSON.stringify(input)}`,()=>assert.equal(run(id,input).ok,false));
for(const d of financialDefinitions){
 for(const invalid of ['', 'NaN','Infinity','1,000','1e3','abc'])test(`${d.id} invalid input ${JSON.stringify(invalid)}`,()=>{const f=d.fields.find(f=>!f.options);assert.equal(calculateFinancial(d,{...financialDefaults(d),[f.id]:invalid}).ok,false);});
 for(const ex of d.examples)test(`${d.id} example: ${ex.title}`,()=>{const r=calculateFinancial(d,{...financialDefaults(d),...ex.values});assert.equal(r.ok,true);for(const id of ex.resultIds)assert.ok(r.rows.some(row=>row.id===id));});
}
test('EMI year/month equivalence',()=>assert.deepEqual(good('emi',{tenure:'1.5'}),good('emi',{tenure:'18',tenureUnit:'months'})));
test('EMI complete ledger reconciliation and CSV',()=>{for(const rate of ['0','0.01','12','99.99']){const r=good('emi',{principal:'123456.78',rate,tenure:'30'});let balance=12345678,principal=0,interest=0,payment=0;for(const row of r.amortization){assert.equal(row.openingCents,balance);assert.equal(row.paymentCents,row.principalCents+row.interestCents);assert.equal(row.closingCents,balance-row.principalCents);balance=row.closingCents;principal+=row.principalCents;interest+=row.interestCents;payment+=row.paymentCents;}assert.equal(balance,0);assert.equal(principal,12345678);assert.equal(r.values.interest,interest/100);assert.equal(r.values.repayment,payment/100);const csv=emiCsv(r.amortization,'INR');assert.equal(csv.trim().split('\r\n').length,r.amortization.length+1);assert.ok(csv.startsWith('Month,Opening balance (INR)'));}});
test('SIP annuity independent closed form positive and negative',()=>{for(const annual of [12,-50,-99.9]){const r=good('sip',{monthly:'100',return:String(annual),years:'1'});const factor=(1+annual/100)**(1/12);const expected=Math.round(100*(factor**12-1)/(factor-1)*100)/100;assert.equal(r.values.value,expected);assert.equal(r.values.invested,1200);assert.equal(r.values.gains,Math.round((expected-1200)*100)/100);}});
test('SIP step up is annual and projection reconciles',()=>{const r=good('sip',{monthly:'100',return:'0',years:'3',stepUp:'10'});assert.deepEqual(r.projection.map(y=>y.monthlyCents),[10000,11000,12100]);assert.equal(r.values.invested,3972);});
test('Percentage difference uses average magnitudes',()=>assert.ok(Math.abs(good('percentage',{mode:'difference',x:'80',y:'100'}).values.result-200/9)<1e-12));
test('Currency formatting and CSV validation',()=>{assert.match(formatFinancial(1234.5,'money','USD'),/1,234.50/);assert.equal(formatFinancial(-0,'percent'),'0%');assert.throws(()=>emiCsv([],'=BAD'));});
