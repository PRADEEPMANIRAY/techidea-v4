import {parseValue,formatResult} from '../converters/calculate.ts';

export const paritySource = {url:'https://www.rma.org.bt/mpolicy/',checkedOn:'2026-10-31',rate:1} as const;
export type Currency = 'BTN'|'INR';
export function swapCurrency(from:Currency):Currency {
  if(from!=='BTN'&&from!=='INR')throw new Error('Choose BTN or INR.');
  return from==='BTN'?'INR':'BTN';
}
// Exact decimal rounding: parity must not introduce binary floating-point rounding.
export function parityAmount(raw:string,from:Currency,precision:number):string {
  swapCurrency(from);
  if(!Number.isInteger(precision)||precision<0||precision>6)throw new Error('Choose 0–6 decimal places.');
  const input=raw.trim();
  if(raw.length>32||!/^(?:\d+(?:\.\d{1,6})?|\.\d{1,6})$/.test(input))throw new Error('Enter a nonnegative amount with up to 6 decimal places, without commas.');
  const [whole,fraction='']=input.split('.');
  const micros=BigInt(whole||'0')*BigInt(1000000)+BigInt(fraction.padEnd(6,'0'));
  if(micros>BigInt("1000000000000000000"))throw new Error('The maximum amount is 1 trillion.');
  const divisor=BigInt(10)**BigInt(6-precision),rounded=(micros+divisor/BigInt(2))/divisor;
  const digits=rounded.toString().padStart(precision+1,'0');
  return precision?`${digits.slice(0,-precision)}.${digits.slice(-precision)}`:digits;
}
export const bhutanLandUnits=[
  {id:'ft2',name:'Square Feet',symbol:'ft²',factor:0.09290304},
  {id:'m2',name:'Square Meters',symbol:'m²',factor:1},
  {id:'yd2',name:'Square Yards',symbol:'yd²',factor:0.83612736},
  {id:'acre',name:'Acres',symbol:'ac',factor:4046.8564224},
  {id:'ha',name:'Hectares',symbol:'ha',factor:10000},
  {id:'km2',name:'Square Kilometers',symbol:'km²',factor:1000000},
] as const;
export type BhutanLandUnit=(typeof bhutanLandUnits)[number]['id'];
export function bhutanLand(raw:string,from:BhutanLandUnit){
  const unit=bhutanLandUnits.find(u=>u.id===from);
  if(!unit)throw new Error('Choose a supported area unit.');
  const parsed=parseValue(raw);
  if(!parsed.ok)throw new Error(parsed.error);
  const value=parsed.value;
  if(value<0||raw.trim().startsWith('-'))throw new Error('Area cannot be negative.');
  if(value>1e12||(value>0&&value<1e-12))throw new Error('Enter zero or an area from 1e-12 to 1 trillion.');
  return bhutanLandUnits.map(target=>({...target,value:target.id===from?value:value*(unit.factor/target.factor)}));
}
export function formatArea(value:number,precision:number){return formatResult(value,precision);}
