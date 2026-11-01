"use client";

import { useRef, useState } from "react";
import { calculateConstruction, constructionDefaults, constructionSummary, constructionUnits, type ConstructionDefinition } from "@/lib/calculators/construction";

export function ConstructionCalculator({ definition, title }: { definition: ConstructionDefinition; title: string }) {
  const [state, setState] = useState(() => constructionDefaults(definition));
  const [copyStatus, setCopyStatus] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const copyArea = useRef<HTMLTextAreaElement>(null);
  const revision = useRef(0);
  const result = calculateConstruction(definition, state);
  const errors = result.ok ? {} : result.errors;
  const summary = result.ok ? constructionSummary(title, result.rows) : "";
  const lastResult = result.ok ? result.rows.filter((row) => row.numericValue !== null).at(-1) : undefined;

  function clearCopy() { revision.current++; setCopyStatus(""); setManualCopy(false); }
  async function copyResults() {
    if (!result.ok) return;
    const request = ++revision.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(summary);
      if (request === revision.current) setCopyStatus("Results copied with units.");
    } catch {
      if (request === revision.current) {
        setManualCopy(true);
        setCopyStatus("Clipboard access is unavailable. Select and copy the results below.");
      }
    }
  }

  return <div className="construction-calculator">
    <div className="construction-heading"><h2>Calculate your quantities</h2><span className="badge badge-live">Runs in your browser</span></div>
    <p className="construction-help">Results update as you edit. Use decimal points without commas. Costs use the same currency as your entered price.</p>
    <form ref={form} noValidate onSubmit={(event) => event.preventDefault()} aria-label={`${title} inputs`}>
      <div className="construction-input-grid">{definition.fields.map((field) => {
        const inputId = `construction-${field.id}`;
        const description = [field.help && `${inputId}-help`, errors[field.id] && `${inputId}-error`].filter(Boolean).join(" ") || undefined;
        return <div className="field construction-field" key={field.id}>
          <label htmlFor={inputId}>{field.label}{field.optional && <span className="optional-label"> (optional)</span>}</label>
          <div className={field.unitKind ? "measurement-input" : undefined}>
            <input id={inputId} name={field.id} type="text" inputMode={field.integer ? "numeric" : "decimal"} autoComplete="off" maxLength={64}
              value={state.values[field.id]} aria-required={!field.optional} aria-invalid={Boolean(errors[field.id])} aria-describedby={description}
              onChange={(event) => { setState({ ...state, values: { ...state.values, [field.id]: event.target.value } }); clearCopy(); }} />
            {field.unitKind && <select aria-label={`${field.label} unit`} value={state.units[field.id]} onChange={(event) => {
              setState({ ...state, units: { ...state.units, [field.id]: event.target.value } }); clearCopy();
            }}>{constructionUnits(field.unitKind).map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select>}
          </div>
          {field.help && <p id={`${inputId}-help`} className="construction-help">{field.help}</p>}
          {errors[field.id] && <p id={`${inputId}-error`} className="construction-error">{errors[field.id]}</p>}
        </div>;
      })}</div>
      <button type="button" className="button button-light reset-construction" onClick={() => {
        setState(constructionDefaults(definition)); clearCopy(); form.current?.querySelector("input")?.focus();
      }}>Reset defaults</button>
    </form>
    <section className="construction-results" aria-labelledby="construction-results-title">
      <div className="construction-heading"><h3 id="construction-results-title">Your estimate</h3><button type="button" className="button button-dark" onClick={copyResults} disabled={!result.ok}>Copy results</button></div>
      <p role="status" aria-live="polite" aria-atomic="true" className={result.ok ? "sr-only" : "construction-error"}>{result.ok ? `Estimate updated. ${lastResult?.label}: ${lastResult?.value} ${lastResult?.unit}.` : errors._form || "Check the highlighted inputs to calculate an estimate."}</p>
      {result.ok && <dl className="construction-result-list">{result.rows.map((row) => <div key={row.id} data-result={row.id}><dt>{row.label}</dt><dd><strong>{row.value}</strong><span>{row.unit}</span></dd></div>)}</dl>}
      <p className="construction-help">Display values are rounded; calculations and costs use unrounded quantities. Tile and box counts always round up. A “&lt;” result is positive but smaller than the displayed decimal precision.</p>
      <p className="construction-copy-status" role="status" aria-live="polite">{copyStatus}</p>
      {manualCopy && <div className="field"><label htmlFor="construction-copy">Results for manual copying</label><textarea ref={copyArea} id="construction-copy" readOnly rows={8} value={summary} onFocus={(event) => event.currentTarget.select()} /><button type="button" className="button button-light" onClick={() => { copyArea.current?.focus(); copyArea.current?.select(); }}>Select results</button></div>}
    </section>
    <noscript><p className="notice">Enable JavaScript for interactive calculation. Formulas and worked examples remain available below.</p></noscript>
  </div>;
}
