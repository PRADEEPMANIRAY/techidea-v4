"use client";
import dynamic from 'next/dynamic';
import {useState} from 'react';
const Demo=dynamic(()=>import('./location-demo').then(m=>m.LocationDemo),{loading:()=> <p role="status">Loading location demo…</p>});
export function LocationDemoLoader(){const [open,setOpen]=useState(false);return <div id="location-demo">{open?<Demo/>:<section className="dev-panel"><h2>Try a connected location selector</h2><p>Load countries, then regions, then a paginated Indian locality list. This demo uses the real same-origin APIs.</p><button className="button button-dark" onClick={()=>setOpen(true)}>Open location demo</button></section>}</div>;}
