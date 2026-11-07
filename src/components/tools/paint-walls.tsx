"use client";

import { useEffect, useRef, useState } from "react";
import { ConstructionCalculator } from "./construction-calculator";
import { calculatePaintWalls, constructionDefaults, constructionSummary, constructionUnits, type ConstructionDefinition, type ConstructionState } from "@/lib/calculators/construction";

export function PaintWalls({ definition, title }: { definition: ConstructionDefinition; title: string }) {
  const defaults = () => constructionDefaults(definition);
  const surface = (): ConstructionState => ({ values: { length: "4", height: "3" }, units: { length: "m", height: "m" } });
  const [multiple, setMultiple] = useState(false), [common, setCommon] = useState(defaults);
  const [walls, setWalls] = useState(() => [surface()]), [ceiling, setCeiling] = useState(surface), [includeCeiling, setIncludeCeiling] = useState(false);
  const [status, setStatus] = useState(""), [manual, setManual] = useState(false);
  const revision = useRef(0);
  const focusTarget = useRef<string | null>(null);
  useEffect(() => { if (focusTarget.current) { document.getElementById(focusTarget.current)?.focus(); focusTarget.current = null; } }, [walls.length]);
  const result = calculatePaintWalls(definition, common, walls, includeCeiling ? ceiling : undefined);
  const summary = result.ok ? constructionSummary(title, result.rows) : "";
  function clear() { revision.current++; setStatus(""); setManual(false); }
  async function copy() { const request = ++revision.current; try { await navigator.clipboard.writeText(summary); if (request === revision.current) setStatus("Results copied with units."); } catch { if (request === revision.current) { setManual(true); setStatus("Select and copy the estimate below."); } } }
  function fields(state: ConstructionState, change: (state: ConstructionState) => void, ids: string[], prefix: string, errorPrefix: string, groupLabel: string, ceilingFields = false) {
    return <div className="construction-input-grid">{definition.fields.filter(field => ids.includes(field.id)).map(field => {
      const id = `${prefix}-${field.id}`, error = !result.ok ? result.errors[`${errorPrefix}${field.id}`] : undefined;
      const label = ceilingFields ? (field.id === "length" ? "Ceiling length" : "Ceiling width") : field.label;
      return <div className="field" key={id}><label htmlFor={id}>{label}{field.optional ? " (optional)" : ""}</label><div className={field.unitKind ? "measurement-input" : undefined}><input id={id} type="text" inputMode={field.integer ? "numeric" : "decimal"} maxLength={64} value={state.values[field.id]} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => { clear(); change({ ...state, values: { ...state.values, [field.id]: event.target.value } }); }} />{field.unitKind && <select aria-label={`${groupLabel} ${label} unit`} value={state.units[field.id]} onChange={event => { clear(); change({ ...state, units: { ...state.units, [field.id]: event.target.value } }); }}>{constructionUnits(field.unitKind).map(unit => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select>}</div>{error && <p id={`${id}-error`} className="construction-error">{error}</p>}</div>;
    })}</div>;
  }
  return <>
    <div className="field"><label htmlFor="paint-mode">Wall measurement mode</label><select id="paint-mode" value={multiple ? "multiple" : "equal"} onChange={event => { clear(); setMultiple(event.target.value === "multiple"); }}><option value="equal">Equal walls or total perimeter</option><option value="multiple">Separate walls and optional ceiling</option></select></div>
    {!multiple ? <ConstructionCalculator definition={definition} title={title} /> : <div className="construction-calculator">
      <h2>Measure each wall</h2><p>Use one row per rectangular wall, up to 20. Walls and ceiling share the same paint, coats, coverage and price. Estimate separately if the ceiling needs a different product or number of coats.</p>
      {walls.map((wall, index) => <fieldset key={index}><legend>Wall {index + 1}</legend>{fields(wall, state => setWalls(walls.map((item, i) => i === index ? state : item)), ["length", "height"], `wall-${index}`, `${index}-`, `Wall ${index + 1}`)}<button className="button button-light" type="button" disabled={walls.length === 1} onClick={() => { clear(); focusTarget.current = "wall-0-length"; setWalls(walls.filter((_, i) => i !== index)); }}>Remove wall {index + 1}</button></fieldset>)}
      <button className="button button-light" type="button" disabled={walls.length >= 20} onClick={() => { clear(); focusTarget.current = `wall-${walls.length}-length`; setWalls([...walls, surface()]); }}>Add wall</button>
      <div className="field"><label><input type="checkbox" checked={includeCeiling} onChange={event => { clear(); setIncludeCeiling(event.target.checked); }} /> Include a rectangular ceiling</label></div>
      {includeCeiling && <fieldset><legend>Ceiling</legend>{fields(ceiling, setCeiling, ["length", "height"], "ceiling", `${walls.length}-`, "Ceiling", true)}</fieldset>}
      <h3>Openings and paint coverage</h3><p>Enter the combined door and window area once. It is deducted from walls only. Coverage is area per liter per coat; divide a coverage figure per US gallon by 3.785411784 first.</p>
      {fields(common, setCommon, ["deduction", "coats", "coverage", "wastage", "price"], "paint-shared", "", "Paint settings")}
      <button type="button" className="button button-light" onClick={() => { clear(); setCommon(defaults()); setWalls([surface()]); setCeiling(surface()); setIncludeCeiling(false); }}>Reset wall list</button>
      <div className="construction-print-inputs"><h2>{title}</h2>{[...walls, ...(includeCeiling ? [ceiling] : [])].map((state, index) => <p key={index}>{index < walls.length ? `Wall ${index + 1}` : "Ceiling"}: {state.values.length} {state.units.length} × {state.values.height} {state.units.height}</p>)}<p>{definition.fields.filter(field => ["deduction", "coats", "coverage", "wastage", "price"].includes(field.id)).map(field => `${field.label}: ${common.values[field.id] || "not entered"} ${common.units[field.id] || ""}`).join("; ")}</p></div>
      <section className="construction-results"><h2>Your paint estimate</h2><p role="status" className={result.ok ? "sr-only" : "construction-error"}>{result.ok ? `Estimate updated for ${walls.length} walls${includeCeiling ? " and a ceiling" : ""}.` : result.errors._form || "Check the highlighted inputs."}</p>{result.ok && <dl className="construction-result-list">{result.rows.map(row => <div key={row.id} data-result={row.id}><dt>{row.label}</dt><dd><strong>{row.value}</strong><span>{row.unit}</span></dd></div>)}</dl>}
        <p>Use the coverage on the chosen paint label. Rough, porous or repaired surfaces may need more paint. Results use unrounded areas; buy available can sizes after checking the estimate.</p>
        <div className="construction-actions"><button className="button button-dark" type="button" disabled={!result.ok} onClick={copy}>Copy results</button><button className="button button-light" type="button" disabled={!result.ok} onClick={() => window.print()}>Print results</button></div><p role="status">{status}</p>{manual && <label>Estimate for copying<textarea rows={10} readOnly value={summary} onFocus={event => event.target.select()} /></label>}
      </section>
    </div>}
  </>;
}
