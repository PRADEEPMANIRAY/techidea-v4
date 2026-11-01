import type {Country,State,City} from '../api/data';
export type LocationState={countries:Country[];states:State[];cities:City[];country:string;state:string;city:string;page:number;total:number};
export const emptyLocation:LocationState={countries:[],states:[],cities:[],country:'',state:'',city:'',page:1,total:0};
export function selectCountry(previous:LocationState,country:string):LocationState{return {...previous,country,state:'',city:'',states:[],cities:[],page:1,total:0};}
export function selectState(previous:LocationState,state:string):LocationState{return {...previous,state,city:'',cities:[],page:1,total:0};}
export function citySupported(country:string){return country==='IN';}
export function selectedLocation(state:LocationState){return {country:state.countries.find(c=>c.code===state.country)??null,state:state.states.find(s=>s.code===state.state)??null,city:state.cities.find(c=>c.id===state.city)??null};}
