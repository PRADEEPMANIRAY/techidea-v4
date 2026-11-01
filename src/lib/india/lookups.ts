export type LookupKind = 'pin' | 'ifsc';
export type LookupRecord = Record<string, string>;
export const lookupSources = { pin: { name: 'Postal PIN Code API', url: 'https://www.postalpincode.in/' }, ifsc: { name: 'Razorpay IFSC', url: 'https://github.com/razorpay/ifsc/wiki/API' } };
export function lookupCode(kind: LookupKind, input: string) {
  if (kind !== 'pin' && kind !== 'ifsc') throw new Error('Unsupported lookup.');
  const code = input.trim().toUpperCase();
  if (!(kind === 'pin' ? /^[1-9]\d{5}$/ : /^[A-Z]{4}0[A-Z0-9]{6}$/).test(code)) throw new Error(kind === 'pin' ? 'Enter a six-digit Indian PIN starting with 1–9.' : 'Enter 11 IFSC characters: four letters, zero, then six letters or digits.');
  return code;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The source returned an unexpected record.');
  return value as Record<string, unknown>;
}
function field(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (value === null || value === undefined || value === '') return 'Not supplied';
  if (typeof value !== 'string' || value.length > 2000) throw new Error('The source returned an invalid field.');
  return value.trim() || 'Not supplied';
}
export function parseLookup(kind: LookupKind, code: string, body: unknown): LookupRecord[] {
  if (kind === 'ifsc') {
    const row = object(body);
    if (row.IFSC !== code || !row.BANK || !row.BRANCH) throw new Error('The source returned mismatched or incomplete bank data.');
    return [{ IFSC: field(row, 'IFSC'), Bank: field(row, 'BANK'), Branch: field(row, 'BRANCH'), Address: field(row, 'ADDRESS'), District: field(row, 'DISTRICT'), State: field(row, 'STATE') }];
  }
  if (!Array.isArray(body) || body.length !== 1) throw new Error('The source returned an unexpected postal response.');
  const envelope = object(body[0]);
  if (envelope.Status === 'Error' && (envelope.PostOffice === null || (Array.isArray(envelope.PostOffice) && !envelope.PostOffice.length))) return [];
  if (envelope.Status !== 'Success' || !Array.isArray(envelope.PostOffice) || envelope.PostOffice.length > 500) throw new Error('The postal source is unavailable or returned invalid data.');
  return envelope.PostOffice.map(value => {
    const row = object(value);
    if (row.Pincode !== code || !row.Name) throw new Error('The source returned mismatched postal data.');
    return { 'Post office': field(row, 'Name'), PIN: field(row, 'Pincode'), District: field(row, 'District'), State: field(row, 'State'), 'Office type': field(row, 'BranchType'), Delivery: field(row, 'DeliveryStatus') };
  });
}
export async function boundedJson(response: Response) {
  const cap = 262144;
  if (Number(response.headers.get('content-length')) > cap) { await response.body?.cancel(); throw new Error('Source response exceeds the 256 KiB safety limit.'); }
  if (!response.body) throw new Error('The source returned an empty response.');
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > cap) throw new Error('Source response exceeds the 256 KiB safety limit.'); chunks.push(value); } }
  catch (error) { await reader.cancel().catch(() => {}); throw error; } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown; } catch { throw new Error('The source returned invalid JSON. Try again later.'); }
}
export class LookupLimitError extends Error { retrySeconds: number; constructor(retrySeconds: number) { super(`Source rate limit reached. Wait ${retrySeconds} seconds before searching again.`); this.retrySeconds = retrySeconds; } }
export async function lookup(kind: LookupKind, input: string, signal?: AbortSignal, transport: typeof fetch = fetch) {
  const code = lookupCode(kind, input), controller = new AbortController();
  const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort();
  const timer = setTimeout(abort, 12000);
  try {
    const url = kind === 'pin' ? `https://api.postalpincode.in/pincode/${code}` : `https://ifsc.razorpay.com/${code}`;
    const response = await transport(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', headers: { Accept: 'application/json' } });
    if (response.status === 429) { const raw = response.headers.get('retry-after'); const seconds = raw && /^\d+$/.test(raw) ? Number(raw) : raw ? Math.ceil((Date.parse(raw) - Date.now()) / 1000) : 60; await response.body?.cancel(); throw new LookupLimitError(Number.isFinite(seconds) ? Math.max(1, Math.min(86400, seconds)) : 60); }
    if (response.status === 404 && kind === 'ifsc') { await response.body?.cancel(); return []; }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Source unavailable (HTTP ${response.status}). Try again later.`); }
    return parseLookup(kind, code, await boundedJson(response));
  } catch (error) {
    if (signal?.aborted) throw new Error('Search cancelled.');
    if (controller.signal.aborted) throw new Error('The source did not respond within 12 seconds. Try again later.');
    if (error instanceof TypeError) throw new Error('Cannot reach the source. Check your connection or try again later.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
