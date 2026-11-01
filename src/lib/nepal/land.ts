import {formatResult} from '../converters/calculate.ts';
export const landUnits=[{id:'ropani',name:'Ropani',squareFeet:5476},{id:'aana',name:'Aana',squareFeet:5476/16},{id:'paisa',name:'Paisa',squareFeet:5476/64},{id:'daam',name:'Daam',squareFeet:5476/256},{id:'ft2',name:'Square Feet',squareFeet:1},{id:'m2',name:'Square Meters',squareFeet:1/0.09290304},{id:'yd2',name:'Square Yards',squareFeet:9}] as const;
export type LandUnit=(typeof landUnits)[number]['id'];
export function landNumber(raw:string){
 if(raw.length>24||! /^(?:\d+(?:\.\d{1,8})?|\.\d{1,8})$/.test(raw.trim()))throw new Error('Enter a nonnegative decimal with at most 8 decimal places, without commas or unit labels.');
 const value=Number(raw);if(!Number.isFinite(value)||value>1e12)throw new Error('Use a value from 0 to 1 trillion per field.');return value;
}
export function convertLand(raw:string,from:LandUnit,to:LandUnit){
 const source=landUnits.find(u=>u.id===from),target=landUnits.find(u=>u.id===to);if(!source||!target)throw new Error('Choose supported land units.');
 const value=landNumber(raw);return from===to?value:value*(source.squareFeet/target.squareFeet);
}
export function combinedLand(values:readonly string[]){
 if(values.length!==4)throw new Error('Enter Ropani, Aana, Paisa and Daam.');
 const [ropani,aana,paisa,daam]=values.map(landNumber);
 // Sum without intermediate display rounding; decimal components are additive.
 return (ropani+aana/16+paisa/64+daam/256)*5476;
}
export function allLandEquivalents(squareFeet:number){if(!Number.isFinite(squareFeet)||squareFeet<0||squareFeet>1e16)throw new Error('Area is outside the supported range.');return landUnits.map(unit=>({...unit,value:unit.id==='m2'?squareFeet*0.09290304:squareFeet/unit.squareFeet}));}
export function formatLand(value:number,precision:number){if(!Number.isInteger(precision)||precision<0||precision>8)throw new Error('Choose 0–8 decimal places.');return formatResult(value,precision);}
