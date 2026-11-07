"use client";
import { FinancialComparison } from "./financial-comparison";
import { useState, useRef, useEffect } from "react";
import { calculateFinancial, financialDefaults, formatFinancial, percentageLabels, emiCsv, type FinancialDefinition } from "@/lib/calculators/financial";
export function FinancialCalculator({ definition }: { definition: FinancialDefinition }) {
 const [input,setInput]=useState(()=>financialDefaults(definition));
 const [message,setMessage]=useState(""); const [fallback,setFallback]=useState(""); const [expanded,setExpanded]=useState(false);
 const form=useRef<HTMLFormElement>(null);
 const result=calculateFinancial(definition,input);
 const [announcement,setAnnouncement]=useState("");
 const summary = result.ok ? result.rows.slice(0,3).map(row => `${row.label}: ${formatFinancial(row.value,row.format,result.currency)}`).join(". ") : "Review the highlighted inputs.";
 useEffect(()=>{const timer=setTimeout(()=>setAnnouncement(summary),600);return ()=>clearTimeout(timer);},[summary]);
 const money=(cents:number)=>formatFinancial(cents/100,"money",result.ok?result.currency:"INR");
 function update(id:string,value:string){setInput(previous=>({...previous,[id]:value}));setMessage("");setFallback("");}
 async function copy(){if(!result.ok)return;const text=result.rows.map(row=>`${row.label}: ${formatFinancial(row.value,row.format,result.currency)}`).join("\n");try{await navigator.clipboard.writeText(text);setMessage("Results copied.");}catch{setFallback(text);setMessage("Select and copy the results below.");}}
 function download(){if(!result.ok||!result.amortization)return;const url=URL.createObjectURL(new Blob([emiCsv(result.amortization,result.currency)],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="techidea-emi-schedule.csv";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage("CSV download requested.");}
 const labels=percentageLabels(input.mode);
 return <div className="financial-calculator">
 <p className="notice">{definition.disclaimer}</p>
 <form ref={form} onSubmit={event=>event.preventDefault()} noValidate>
 <div className="finance-inputs">{definition.fields.map(field=>{const error=!result.ok?result.errors[field.id]:undefined;const label=definition.id==="percentage-calculator"&&field.id==="x"?labels[0]:definition.id==="percentage-calculator"&&field.id==="y"?labels[1]:field.label;return <div className="finance-field" key={field.id}>
 <label htmlFor={`finance-${field.id}`}>{label}</label>
 {field.options?<select className="field" id={`finance-${field.id}`} value={input[field.id]} onChange={e=>update(field.id,e.target.value)} aria-invalid={!!error} aria-describedby={error?`error-${field.id}`:field.help?`help-${field.id}`:undefined}>{field.options.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}</select>:<input className="field" id={`finance-${field.id}`} type="text" inputMode={(field.min??0)<0?"text":"decimal"} autoComplete="off" value={input[field.id]} onChange={e=>update(field.id,e.target.value)} aria-invalid={!!error} aria-describedby={[field.help?`help-${field.id}`:"",error?`error-${field.id}`:""].filter(Boolean).join(" ")||undefined}/>}
 {field.help&&<small id={`help-${field.id}`}>{field.help}</small>}{error&&<p className="finance-error" id={`error-${field.id}`}>{error}</p>}
 </div>})}</div>
 <div className="finance-actions"><button type="button" className="button button-light" onClick={()=>{setInput(financialDefaults(definition));setExpanded(false);setMessage("Defaults restored.");setFallback("");form.current?.querySelector<HTMLElement>("input,select")?.focus();}}>Reset defaults</button><button type="button" className="button button-dark" disabled={!result.ok} onClick={copy}>Copy results</button></div>
 </form>
 <p role="status" aria-live="polite" aria-atomic="true" className="finance-status">{message || announcement}</p>
 {fallback&&<label>Results to copy<textarea className="field" readOnly value={fallback} onFocus={e=>e.target.select()}/></label>}
 {!result.ok?result.errors._form&&<p role="alert" className="finance-error">{result.errors._form}</p>:<>
 <section aria-label="Calculation results"><div className="finance-results">{result.rows.map(row=><div className="finance-result" key={row.id}><span>{row.label}</span><strong data-result={row.id}>{formatFinancial(row.value,row.format,result.currency)}</strong></div>)}</div></section>
 <div className="finance-method"><h2>Calculation explanation</h2><p>{result.formula}</p><p>{result.note}</p></div>
 {result.amortization&&<section className="finance-schedule"><h2>Principal versus interest</h2><div className="finance-bar" role="img" aria-label={`Principal ${formatFinancial(result.values.principal,"money",result.currency)}; interest ${formatFinancial(result.values.interest,"money",result.currency)}`}><span style={{width:`${result.values.principal/result.values.repayment*100}%`}}/></div><p>Dark: principal · Light: interest</p>
 <h2>Monthly amortization schedule</h2><div className="finance-actions"><button type="button" className="button button-light" onClick={download}>Download CSV schedule</button>{result.amortization.length>12&&<button type="button" className="button button-light" aria-expanded={expanded} aria-controls="emi-table" onClick={()=>setExpanded(!expanded)}>{expanded?"Show first 12 months":"Show all months"}</button>}</div>
 <div className="finance-table" role="region" aria-label="Monthly repayments, scroll horizontally" tabIndex={0} id="emi-table"><table><caption>{expanded?"All payments":"First 12 payments (or fewer for shorter loans)"}; amounts in {result.currency}</caption><thead><tr>{["Month","Opening balance","Payment","Principal","Interest","Closing balance"].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{(expanded?result.amortization:result.amortization.slice(0,12)).map(row=><tr key={row.month}><th scope="row">{row.month}</th>{[row.openingCents,row.paymentCents,row.principalCents,row.interestCents,row.closingCents].map((v,i)=><td key={i}>{money(v)}</td>)}</tr>)}</tbody></table></div></section>}
 <FinancialComparison result={result}/>
 {result.projection&&<section className="finance-schedule"><h2>Year-wise investment projection</h2><div className="finance-table" role="region" aria-label="Annual investment projection, scroll horizontally" tabIndex={0}><table><caption>Estimated year-end amounts in {result.currency}</caption><thead><tr>{["Year","Monthly contribution","Invested this year","Total invested","Estimated value","Gains / losses"].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{result.projection.map(row=><tr key={row.year}><th scope="row">{row.year}</th>{[row.monthlyCents,row.yearInvestedCents,row.investedCents,row.valueCents,row.gainsCents].map((v,i)=><td key={i}>{money(v)}</td>)}</tr>)}</tbody></table></div></section>}
 </>}
 </div>;
}
