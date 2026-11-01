export const assetFields = [ ['cash','Cash'], ['savings','Savings'], ['gold','Eligible gold value'], ['silver','Eligible silver value'], ['investments','Eligible investments'], ['other','Other eligible wealth'] ] as const;
export type ZakatInput = Record<(typeof assetFields)[number][0] | 'liabilities' | 'nisab' | 'rate',string> & { holding: 'yes'|'no'|'unsure' };
const ZERO=BigInt(0), HUNDRED=BigInt(100);
export function paisa(raw: string, label: string) {
  if (raw.length > 20 || !/^\d+(?:\.\d{1,2})?$/.test(raw.trim())) throw new Error(`${label}: enter PKR with up to two decimal places, without commas.`);
  const [whole, fraction=''] = raw.trim().split('.');
  const value=BigInt(whole)*HUNDRED+BigInt(fraction.padEnd(2,'0'));
  if (value>BigInt('100000000000000')) throw new Error(`${label}: maximum PKR 1 trillion per field.`);
  return value;
}
export function calculateZakat(input: ZakatInput) {
  const rows=assetFields.map(([id,label])=>({id,label,paisa:paisa(input[id],label)}));
  const gross=rows.reduce((sum,row)=>sum+row.paisa,ZERO), liabilities=paisa(input.liabilities,'Eligible liabilities'), nisab=paisa(input.nisab,'Nisab');
  if (nisab===ZERO) throw new Error('Enter a positive, verified Nisab threshold in PKR.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(input.rate.trim()) || input.rate.length>6) throw new Error('Rate must have at most two decimal places.');
  const [whole,fraction='']=input.rate.trim().split('.'), rate=BigInt(whole)*HUNDRED+BigInt(fraction.padEnd(2,'0'));
  if (rate<=ZERO||rate>BigInt(10000)) throw new Error('Rate must be above 0% and at most 100%.');
  if (!['yes','no','unsure'].includes(input.holding)) throw new Error('Choose the applicable holding-period status.');
  const net=gross>liabilities?gross-liabilities:ZERO, aboveNisab=net>=nisab;
  // Half-up at the final paisa; inputs and threshold comparisons stay exact.
  const conditional=aboveNisab?(net*rate+BigInt(5000))/BigInt(10000):ZERO;
  const status=!aboveNisab?'below-nisab':input.holding==='yes'?'estimated':input.holding==='no'?'holding-not-met':'needs-review';
  const money=(value:bigint)=>Number(value)/100;
  return { assets:rows.map(row=>({label:row.label,value:money(row.paisa)})),gross:money(gross),liabilities:money(liabilities),net:money(net),nisab:money(nisab),rate:Number(rate)/100,aboveNisab,status,conditionalEstimate:money(conditional),estimate:status==='estimated'?money(conditional):status==='needs-review'?null:0 };
}
export function zakatDefaults(): ZakatInput { return {cash:'0',savings:'0',gold:'0',silver:'0',investments:'0',other:'0',liabilities:'0',nisab:'',rate:'2.5',holding:'unsure'}; }
export const formatPkr = (value:number)=>new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
