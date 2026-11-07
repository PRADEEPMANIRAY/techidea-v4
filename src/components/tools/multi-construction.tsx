"use client";

import { useEffect, useRef, useState } from "react";
import { ConstructionCalculator } from "./construction-calculator";
import { calculateWoodBatch, constructionDefaults, constructionSummary, constructionUnits, type ConstructionDefinition, type ConstructionState } from "@/lib/calculators/construction";

export function MultiConstruction({ definition, title }: { definition: ConstructionDefinition; title: string }) {
  const [multiple, setMultiple] = useState(false);
  const [states, setStates] = useState<ConstructionState[]>(() => [constructionDefaults(definition)]);
  const [status, setStatus] = useState("");
  const [manual, setManual] = useState(false);
  const revision = useRef(0);
  const focusTarget = useRef<string | null>(null);
  useEffect(() => { if (focusTarget.current) { document.getElementById(focusTarget.current)?.focus(); focusTarget.current = null; } }, [states.length]);
  const form = useRef<HTMLDivElement>(null);
  const result = calculateWoodBatch(definition, states);
  const summary = result.ok ? constructionSummary(title, result.rows) : "";
  function clear() { revision.current++; setStatus(""); setManual(false); }
  function update(index: number, id: string, value: string, unit = false) {
    clear(); setStates(current => current.map((row, i) => i === index ? { ...row, [unit ? "units" : "values"]: { ...row[unit ? "units" : "values"], [id]: value } } : row));
  }
  async function copy() {
    const request = ++revision.current;
    try { await navigator.clipboard.writeText(summary); if (request === revision.current) setStatus("Results copied with units."); }
    catch { if (request === revision.current) { setManual(true); setStatus("Select and copy the estimate below."); } }
  }
  return <>
    <div className="field"><label htmlFor="timber-mode">Timber estimate mode</label><select id="timber-mode" value={multiple ? "multiple" : "single"} onChange={event => { clear(); setMultiple(event.target.value === "multiple"); }}><option value="single">One timber size</option><option value="multiple">Multiple timber sizes</option></select></div>
    {!multiple ? <ConstructionCalculator definition={definition} title={title} /> : <div className="construction-calculator" ref={form}>
      <h2>Build your timber list</h2><p>Use actual rectangular dimensions. Each row has its own units, quantity and optional price per CFT. For a common rate, enter the same price in every row. Up to 20 sizes.</p>
      {states.map((state, index) => <fieldset key={index}><legend>Timber size {index + 1}</legend><div className="construction-input-grid">
        {definition.fields.map(field => {
          const id = `batch-${index}-${field.id}`, error = !result.ok ? result.errors[`${index}-${field.id}`] : undefined;
          return <div className="field" key={field.id}><label htmlFor={id}>{field.label}{field.optional ? " (optional)" : ""}</label><div className={field.unitKind ? "measurement-input" : undefined}><input id={id} type="text" inputMode={field.integer ? "numeric" : "decimal"} maxLength={64} value={state.values[field.id]} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => update(index, field.id, event.target.value)} />{field.unitKind && <select aria-label={`Size ${index + 1} ${field.label} unit`} value={state.units[field.id]} onChange={event => update(index, field.id, event.target.value, true)}>{constructionUnits(field.unitKind).map(unit => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select>}</div>{error && <p className="construction-error" id={`${id}-error`}>{error}</p>}</div>;
        })}
      </div><button className="button button-light" type="button" disabled={states.length === 1} onClick={() => { clear(); focusTarget.current = "batch-0-length"; setStates(states.filter((_, i) => i !== index)); }}>Remove size {index + 1}</button></fieldset>)}
      <div className="construction-actions"><button type="button" className="button button-light" disabled={states.length >= 20} onClick={() => { clear(); focusTarget.current = `batch-${states.length}-length`; setStates([...states, constructionDefaults(definition)]); }}>Add timber size</button><button type="button" className="button button-light" onClick={() => { clear(); setStates([constructionDefaults(definition)]); }}>Reset timber list</button></div>
      <div className="construction-print-inputs"><h2>{title}</h2>{states.map((state, index) => <p key={index}>Size {index + 1}: {definition.fields.map(field => `${field.label}: ${state.values[field.id] || "not entered"} ${state.units[field.id] || ""}`).join("; ")}</p>)}</div>
      <section className="construction-results"><h2>Your timber estimate</h2><p role="status" className={result.ok ? "sr-only" : "construction-error"}>{result.ok ? `Estimate updated for ${states.length} timber sizes.` : result.errors._form || "Check the highlighted inputs."}</p>
        {result.ok && <dl className="construction-result-list">{result.rows.map(row => <div key={row.id} data-result={row.id}><dt>{row.label}</dt><dd><strong>{row.value}</strong><span>{row.unit}</span></dd></div>)}</dl>}
        <p>Totals use unrounded dimensions and quantities. A subtotal with missing prices is not the full purchase cost. CFT is solid rectangular volume; logs, nominal lumber sizes and cutting waste need separate allowances.</p>
        <div className="construction-actions"><button type="button" className="button button-dark" disabled={!result.ok} onClick={copy}>Copy results</button><button type="button" className="button button-light" disabled={!result.ok} onClick={() => window.print()}>Print results</button></div><p role="status">{status}</p>{manual && <label>Estimate for copying<textarea readOnly value={summary} rows={10} onFocus={event => event.target.select()} /></label>}
      </section>
    </div>}
  </>;
}
