"use client";
import { useEffect, useRef, useState } from 'react';
import { inspectImage, MAX_IMAGE_BYTES, type ImageFormat } from '@/lib/utilities/image';
import { resizeImage, type ResizeMode } from '@/lib/india/resize';
import { downloadBlob, useObjectUrl } from './utility-actions';
export function PhotoResizer() {
  const [file, setFile] = useState<File | null>(null), [width, setWidth] = useState('200'), [height, setHeight] = useState('230'), [kb, setKb] = useState('50'), [mode, setMode] = useState<ResizeMode>('fit'), [format, setFormat] = useState<ImageFormat>('image/jpeg'), [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState<Awaited<ReturnType<typeof resizeImage>> | null>(null);
  const version = useRef(0), locked = useRef(false), picker = useRef<HTMLInputElement>(null);
  const original = useObjectUrl(file), output = useObjectUrl(result?.blob ?? null);
  useEffect(() => () => { version.current++; }, []);
  function clearResult() { version.current++; setError(''); setResult(null); }
  async function load(selected?: File) {
    clearResult(); setFile(null); if (!selected) return;
    const current = version.current; setBusy(true);
    try { if (selected.size > MAX_IMAGE_BYTES) throw new Error('Choose an image of at most 10 MiB.'); inspectImage(new Uint8Array(await selected.arrayBuffer()), selected.type); if (current === version.current) setFile(selected); }
    catch (e) { if (current === version.current) setError((e as Error).message); } finally { if (current === version.current) setBusy(false); }
  }
  async function resize() {
    if (!file || locked.current) return;
    clearResult(); const current = version.current; locked.current = true; setBusy(true);
    try { const next = await resizeImage(file, Number(width), Number(height), Number(kb), mode, format); if (current === version.current) setResult(next); }
    catch (e) { if (current === version.current) setError((e as Error).message); } finally { locked.current = false; if (current === version.current) setBusy(false); }
  }
  return <div className="india-tool utility-tool"><span className="india-eyebrow">PRIVATE • ON YOUR DEVICE</span><p>Prepare a photo or signature without uploading it. Still JPG, PNG or WebP only; up to 10 MiB and 12 megapixels.</p><label className="field">Choose photo or signature<input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => void load(e.target.files?.[0])}/></label>
    <div className="utility-actions"><button className="button button-light" disabled={busy} onClick={() => { clearResult(); setWidth('200'); setHeight('230'); setKb('50'); }}>Photo preset</button><button className="button button-light" disabled={busy} onClick={() => { clearResult(); setWidth('140'); setHeight('60'); setKb('20'); }}>Signature preset</button></div><p>Presets are editable starting points, not requirements for any exam, bank or government form. Read the receiving portal’s current instructions.</p>
    <div className="utility-options">{[['Width (pixels)', width, setWidth], ['Height (pixels)', height, setHeight], ['Maximum file size (KB)', kb, setKb]].map(([label, value, setter]) => <label className="field" key={label as string}>{label as string}<input type="number" min="1" step="1" disabled={busy} value={value as string} onChange={e => { clearResult(); (setter as (v: string) => void)(e.target.value); }}/></label>)}<label className="field">Framing<select value={mode} disabled={busy} onChange={e => { clearResult(); setMode(e.target.value as ResizeMode); }}><option value="fit">Fit entire image (preserve ratio, white padding)</option><option value="crop">Center crop (preserve ratio, trim edges)</option></select></label><label className="field">Output format<select value={format} disabled={busy} onChange={e => { clearResult(); setFormat(e.target.value as ImageFormat); }}><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></label></div>
    <p>1 KB = 1,024 bytes. Output uses the exact canvas dimensions; neither mode stretches the image. Transparency becomes white. PNG has no adjustable lossy quality. Metadata is not retained.</p>
    <div className="utility-actions"><button className="button button-dark" disabled={!file || busy} onClick={() => void resize()}>{busy ? 'Processing locally…' : 'Resize and preview'}</button><button className="button button-light" disabled={busy} onClick={() => { clearResult(); setFile(null); setWidth('200'); setHeight('230'); setKb('50'); setMode('fit'); setFormat('image/jpeg'); if (picker.current) picker.current.value = ''; }}>Reset</button></div>
    {error && <p className="utility-error" role="alert">{error}</p>}<div role="status">{result && <p className={result.achieved ? 'notice' : 'utility-error'}>{result.achieved ? 'Within the requested size limit.' : 'The requested size limit could not be achieved at these dimensions with the available encodings. Reduce dimensions or choose another format.'} Output: {result.blob.size.toLocaleString()} bytes / limit {result.limit.toLocaleString()} bytes · {result.width} × {result.height} px.</p>}</div>
    <div className="utility-previews">{file && original && <figure><figcaption>Original · {file.size.toLocaleString()} bytes</figcaption><img src={original} alt="Original photo or signature"/></figure>}{result && output && <figure><figcaption>Resized preview {result.blob.size > (file?.size ?? Infinity) ? '— larger than original' : ''}</figcaption><img src={output} alt="Resized photo or signature preview"/></figure>}</div>
    {result && <button className="button button-dark" onClick={() => downloadBlob(result.blob, `techidea-resized.${format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp'}`)}>{result.achieved ? 'Download resized image' : 'Download over-limit image'}</button>}
  </div>;
}
