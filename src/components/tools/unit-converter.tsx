"use client";

import { useRef, useState } from "react";
import type { ConverterDefinition } from "@/lib/converters/definitions";
import { convert, conversionFormula, formatResult, swapUnits } from "@/lib/converters/calculate";

export function UnitConverter({ definition }: { definition: ConverterDefinition }) {
  const [selection, setSelection] = useState({ from: definition.defaultFrom, to: definition.defaultTo });
  const [input, setInput] = useState("1");
  const [precision, setPrecision] = useState(6);
  const [copyStatus, setCopyStatus] = useState("");
  const version = useRef(0);
  const resultInput = useRef<HTMLInputElement>(null);
  const result = convert(definition, input, selection.from, selection.to);
  const to = definition.units.find((unit) => unit.id === selection.to)!;
  const formatted = result.ok ? formatResult(result.value, precision) : "";
  const roundedToZero = result.ok && result.value !== 0 && Number(formatted) === 0;

  function clearCopyStatus() {
    version.current += 1;
    setCopyStatus("");
  }
  async function copyResult() {
    if (!result.ok) return;
    const requestVersion = ++version.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(`${formatted} ${to.symbol}`);
      if (version.current === requestVersion) setCopyStatus(`Copied ${formatted} ${to.symbol}.`);
    } catch {
      if (version.current === requestVersion) {
        setCopyStatus("Copy is unavailable. The numeric result is selected; copy it manually and include the unit shown below.");
        resultInput.current?.focus();
        resultInput.current?.select();
      }
    }
  }

  return <div className="converter">
    <div className="converter-heading"><h2>Convert your value</h2><span className="badge badge-live">Runs in your browser</span></div>
    <div className="converter-fields">
      <div className="field converter-value">
        <label htmlFor="converter-value">Value to convert</label>
        <div className="converter-input-row">
          <input id="converter-value" type="text" inputMode="decimal" autoComplete="off" spellCheck={false} maxLength={128}
            value={input} aria-invalid={!result.ok} aria-describedby={`value-help${!result.ok ? " conversion-error" : ""}`}
            onChange={(event) => { setInput(event.target.value); clearCopyStatus(); }} />
          <button type="button" className="button button-light sign-button" aria-label="Change input sign" onClick={() => {
            const trimmed = input.trim();
            setInput(trimmed.startsWith("-") ? trimmed.slice(1) : `-${trimmed.replace(/^\+/, "")}`);
            clearCopyStatus();
          }}>±</button>
        </div>
        <p id="value-help" className="converter-help">Use a decimal point, without commas. Scientific notation such as 1e6 is accepted.</p>
      </div>
      <div className="converter-unit-row">
        <div className="field"><label htmlFor="from-unit">From unit</label><select id="from-unit" value={selection.from} onChange={(event) => {
          setSelection({ ...selection, from: event.target.value }); clearCopyStatus();
        }}>{definition.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>)}</select></div>
        <button className="button button-light swap-button" type="button" aria-label="Swap units" aria-describedby="swap-help" onClick={() => {
          setSelection(swapUnits); clearCopyStatus();
        }}><span aria-hidden="true">⇄</span><span>Swap</span></button>
        <div className="field"><label htmlFor="to-unit">To unit</label><select id="to-unit" value={selection.to} onChange={(event) => {
          setSelection({ ...selection, to: event.target.value }); clearCopyStatus();
        }}>{definition.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>)}</select></div>
      </div>
      <p id="swap-help" className="converter-help">Swap exchanges the units and keeps your entered value.</p>
      <div className="field precision-field"><label htmlFor="decimal-precision">Decimal places</label><select id="decimal-precision" value={precision} onChange={(event) => {
        setPrecision(Number(event.target.value)); clearCopyStatus();
      }}>{Array.from({ length: 11 }, (_, value) => <option key={value} value={value}>{value}</option>)}</select></div>
    </div>
    <div className={`converter-result${result.ok ? "" : " has-error"}`}>
      <label htmlFor="conversion-result">Converted value</label>
      <input ref={resultInput} id="conversion-result" className="result-number" readOnly value={formatted} placeholder="—"
        aria-describedby="result-unit rounding-help" onFocus={(event) => event.currentTarget.select()} />
      <p id="result-unit" className="result-unit">{to.name} ({to.symbol})</p>
      <div className="result-status" role="status" aria-live="polite" aria-atomic="true">
        {result.ok ? <span className="sr-only">Result: {formatted} {to.symbol}</span> : <p id="conversion-error">{result.error}</p>}
      </div>
      <p id="rounding-help" className="converter-help">{roundedToZero ? "This nonzero result rounds to zero. Increase the decimal places to see more detail." : formatted.includes("e") ? "Scientific notation is used for very large or tiny results. Decimal places apply to its coefficient." : `Displayed to ${precision} decimal places. Display rounding does not change the calculation.`}</p>
      <div className="copy-row"><button type="button" className="button button-dark" disabled={!result.ok} onClick={copyResult}>Copy result</button><p role="status" aria-live="polite">{copyStatus}</p></div>
    </div>
    <section className="converter-formula" aria-labelledby="formula-title"><h3 id="formula-title">Conversion formula</h3><p className="formula-expression">{conversionFormula(definition, selection.from, selection.to)}</p><p className="converter-help">{definition.kind === "temperature" ? "Scale and offset are applied to the temperature reading. Values below absolute zero are not allowed." : `The factors express each unit in ${definition.baseSymbol}. Negative inputs represent signed changes.`}</p></section>
    <noscript><p className="notice">Enable JavaScript to calculate conversions and copy results. The formulas and practical examples below remain available.</p></noscript>
  </div>;
}
