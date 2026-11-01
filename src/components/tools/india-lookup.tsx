"use client";
import { useEffect, useRef, useState } from 'react';
import { lookup, LookupLimitError, lookupCode, lookupSources, type LookupKind, type LookupRecord } from '@/lib/india/lookups';
import { OutputActions } from './utility-actions';
export function IndiaLookup({ kind }: { kind: LookupKind }) {
  const [value, setValue] = useState(''), [rows, setRows] = useState<LookupRecord[] | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [wait, setWait] = useState(0), [retrieved, setRetrieved] = useState('');
  const controller = useRef<AbortController | null>(null), version = useRef(0), until = useRef(0);
  useEffect(() => { const timer = setInterval(() => setWait(Math.max(0, Math.ceil((until.current - Date.now()) / 1000))), 500); return () => { clearInterval(timer); controller.current?.abort(); version.current++; }; }, []);
  function clear() { controller.current?.abort(); version.current++; setRows(null); setError(''); setBusy(false); setRetrieved(''); }
  async function search() {
    if (Date.now() < until.current || busy) return;
    clear(); try { lookupCode(kind, value); } catch (e) { setError((e as Error).message); return; }
    const current = version.current, abort = new AbortController(); controller.current = abort; setBusy(true);
    until.current = Date.now() + 3000; setWait(3);
    try { const result = await lookup(kind, value, abort.signal); if (current === version.current) { setRows(result); setRetrieved(new Date().toLocaleString()); } }
    catch (e) { if (current === version.current) { setError((e as Error).message); if (e instanceof LookupLimitError) { until.current = Date.now() + e.retrySeconds * 1000; setWait(e.retrySeconds); } } }
    finally { if (current === version.current) setBusy(false); }
  }
  const source = lookupSources[kind];
  return <div className="india-tool utility-tool"><span className="india-eyebrow">INDIA REFERENCE LOOKUP</span><form onSubmit={e => { e.preventDefault(); void search(); }}>
    <label className="field">{kind === 'pin' ? 'Six-digit PIN code' : 'IFSC code'}<input value={value} maxLength={kind === 'pin' ? 6 : 11} inputMode={kind === 'pin' ? 'numeric' : 'text'} autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-describedby="lookup-help" onChange={e => { clear(); setValue(e.target.value.toUpperCase()); }} /></label>
    <p id="lookup-help">{kind === 'pin' ? 'Search one PIN to see every post office returned by the source.' : 'Use the 11-character code from your bank document. No account number is needed.'}</p>
    <div className="utility-actions"><button className="button button-dark" disabled={busy || wait > 0}>{busy ? 'Searching…' : wait ? `Wait ${wait}s` : 'Search'}</button><button type="button" className="button button-light" onClick={() => { clear(); setValue(''); }}>Reset</button></div></form>
    <p className="india-privacy">Searching sends only the entered code to <a href={source.url}>{source.name}</a>. The provider receives your IP address. No account details are requested. Searches are not automatic.</p>
    {error && <p role="alert" className="utility-error">{error}</p>}
    <p role="status">{busy ? 'Waiting for the external source…' : rows ? rows.length ? `${rows.length} record${rows.length === 1 ? '' : 's'} returned. Retrieved ${retrieved}; this is not the dataset update date.` : 'No records found in this source. Check the code with the post office or bank.' : ''}</p>
    {rows && rows.length > 0 && <><OutputActions output={JSON.stringify(rows, null, 2)} name={`techidea-${kind}-results.json`}/><div className="india-records">{rows.map((row, index) => <article className="india-record" key={index}><h3>{row['Post office'] || row.Branch}</h3><dl>{Object.entries(row).map(([key, val]) => <div key={key}><dt>{key}</dt><dd>{val}</dd></div>)}</dl></article>)}</div></>}
  </div>;
}
