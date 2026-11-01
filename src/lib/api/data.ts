import {readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
export type Country={name:string;code:string;alpha3:string|null;currencyCode:string|null;callingCode:string|null};
export type State={id:string;countryCode:string;name:string;code:string|null;type:string|null;level:string|null};
export type City={id:string;countryCode:string;stateCode:string;name:string};
const root=join(process.cwd(),'public','datasets','v1');
const fileLimit=2*1024*1024;
async function load<T>(name:string):Promise<T>{const path=join(root,name);if((await stat(path)).size>fileLimit)throw new Error('Dataset size exceeded');return JSON.parse(await readFile(path,'utf8')) as T;}
export type Reference={countries:Country[];states:State[];countryMap:Map<string,Country>;stateMap:Map<string,State[]>};
let reference:Promise<Reference>|undefined;
export function loadReference(){return reference??=(async()=>{const [countries,states]=await Promise.all([load<Country[]>('countries.json'),load<State[]>('states.json')]);const stateMap=new Map<string,State[]>();for(const state of states){const list=stateMap.get(state.countryCode)??[];list.push(state);stateMap.set(state.countryCode,list);}return {countries,states,countryMap:new Map(countries.map(c=>[c.code,c])),stateMap};})().catch(error=>{reference=undefined;throw error;});}
// Explicit allowlist prevents request values becoming file paths. One India shard,
// loaded once and indexed by state; never load a global city database per request.
const cityFiles:Readonly<Record<string,string>>={IN:'cities-IN.json'};
let india:Promise<Map<string,City[]>>|undefined;
export function cityCoverage(country:string){return Object.hasOwn(cityFiles,country);}
export async function loadCities(country:string,state:string):Promise<City[]>{if(!cityCoverage(country))return [];india??=(async()=>{const rows=await load<City[]>(cityFiles.IN);const byState=new Map<string,City[]>();for(const row of rows){const list=byState.get(row.stateCode)??[];list.push(row);byState.set(row.stateCode,list);}return byState;})().catch(error=>{india=undefined;throw error;});return (await india).get(state)??[];}
export const datasetMeta={source:'Countries States Cities Database — Darshan Gada and contributors',license:'ODbL-1.0',revision:'a5078ba91302953cf17ff39c683344e09072c2f8',manifest:'/datasets/v1/manifest.json',licenseUrl:'/datasets/v1/LICENSE.txt'};
