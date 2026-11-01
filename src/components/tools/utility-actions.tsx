"use client";
import {useEffect,useState,useRef,useId} from 'react';
export function useObjectUrl(blob:Blob|null){const [url,setUrl]=useState('');useEffect(()=>{if(!blob){setUrl('');return;}const next=URL.createObjectURL(blob);setUrl(next);return()=>URL.revokeObjectURL(next);},[blob]);return url;}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function OutputActions({output,name='result.json'}:{output:string;name?:string}) {
 const [status,setStatus]=useState(''); const [fallback,setFallback]=useState(false);
 const field=useRef<HTMLTextAreaElement>(null); const id=useId();
 useEffect(()=>{setStatus('');setFallback(false);},[output]);
 useEffect(()=>{if(fallback){field.current?.focus();field.current?.select();}},[fallback]);
 return <><div className="utility-actions"><button className="button button-dark" disabled={!output} onClick={async()=>{try{await navigator.clipboard.writeText(output);setFallback(false);setStatus('Copied result.');}catch{setFallback(true);setStatus('Clipboard unavailable. The result below is selected; use your browser copy command.');field.current?.focus();field.current?.select();}}}>Copy result</button><button className="button button-light" disabled={!output} onClick={()=>{downloadBlob(new Blob([output],{type:'application/json;charset=utf-8'}),name);setStatus('Download requested.');}}>Download JSON</button></div><p role="status">{status}</p>{fallback&&<div><label htmlFor={id}>Result to copy</label><textarea id={id} className="field" ref={field} readOnly rows={6} value={output} onFocus={event=>event.target.select()}/></div>}</>;
}
