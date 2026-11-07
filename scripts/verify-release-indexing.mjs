// Run from the project root with Node 22: node --experimental-strip-types
// scripts/verify-release-indexing.mjs --mode preview|production [--dir .next]
// Supply --server http://127.0.0.1:3104 for the dynamic /tools route.
// Never infers intent from the current environment or contacts production.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DOMParser } from '@xmldom/xmldom';
import { apis } from '../src/data/apis/registry.ts';
import { getAvailableCategories, getPublishedTools, isSearchIndexEligible } from '../src/data/tools/registry.ts';

const { values } = parseArgs({options: {mode: {type:'string'}, dir: {type:'string', default:'.next'}, server: {type:'string'}}});
if (!['preview','production'].includes(values.mode)) {
  throw new Error('Specify the intended release mode: --mode preview or --mode production.');
}
const production = values.mode === 'production';
const origin = 'https://techidea.online';
const app = path.resolve(values.dir, 'server/app');
const server = new URL(values.server ?? 'http://127.0.0.1:3104');
if (server.protocol!=='http:' || !['localhost','127.0.0.1','[::1]'].includes(server.hostname) || server.href!==server.origin+'/') {
  throw new Error('--server must be a bare loopback HTTP origin for next start.');
}
const buildId = (await readFile(path.join(values.dir,'BUILD_ID'),'utf8')).trim();
const buildManifest = await fetch(new URL('/_next/static/'+encodeURIComponent(buildId)+'/_buildManifest.js',server), {redirect:'error'});
const expectedManifest = await readFile(path.join(values.dir,'static',buildId,'_buildManifest.js'),'utf8');
if (!buildManifest.ok || await buildManifest.text()!==expectedManifest) throw new Error('Loopback server does not serve this build manifest.');
const errors = [];
const read = file => readFile(path.join(app, file), 'utf8');
const requireMatch = (condition, message) => { if (!condition) errors.push(message); };
const eligible = new Set([
  '/', '/tools', '/calculators', '/apis', '/apis/docs', '/about', '/contact', '/privacy-policy', '/terms', '/disclaimer',
  ...apis.map(api => '/apis/docs/'+api.id),
  ...getAvailableCategories().map(category => '/tools/category/'+category.id),
  ...getPublishedTools().filter(isSearchIndexEligible).map(tool => tool.href),
]);
const excluded = getPublishedTools().filter(tool => !isSearchIndexEligible(tool)).map(tool => tool.href);
const absolute = route => new URL(route, origin).href;

async function checkMetadata(file, allowIndex) {
  const metadata = JSON.parse(await read(file+'.meta'));
  requireMatch((metadata.status ?? 200) === 200, file+' has non-200 artifact status');
  const headers = Object.entries(metadata.headers ?? {});
  const robots = headers.filter(([key])=>key.toLowerCase()==='x-robots-tag').map(([,v])=>String(v)).join(',');
  if (allowIndex) requireMatch(!/\b(noindex|nofollow|none|unavailable_after)\b/i.test(robots), file+' restrictive X-Robots-Tag: '+robots);
  requireMatch(!headers.some(([key])=>key.toLowerCase()==='location'), file+' has a redirect header');
}

// This site's generated robots policy has one wildcard group. Fail closed on
// extra groups/rules rather than guessing how an arbitrary policy applies.
const policy = (await read('robots.txt.body')).split(/\r?\n/).map(line=>line.split('#')[0].trim()).filter(Boolean);
const expected = ['User-Agent: *', ...(production ? ['Allow: /','Disallow: /api/'] : ['Disallow: /']), 'Sitemap: '+origin+'/sitemap.xml'];
requireMatch(policy.join('\n') === expected.join('\n'), 'robots.txt differs from intended '+values.mode+' policy: '+policy.join(' | '));
await checkMetadata('robots.txt', production);
await checkMetadata('sitemap.xml', production);
const xml = new DOMParser({onError: (_level,message)=>{throw new Error('Invalid sitemap: '+message);}})
  .parseFromString(await read('sitemap.xml.body'), 'application/xml');
const ns = 'http://www.sitemaps.org/schemas/sitemap/0.9';
requireMatch(xml.documentElement.localName==='urlset' && xml.documentElement.namespaceURI===ns, 'Invalid sitemap root');
const listed = new Set();
for (const url of Array.from(xml.getElementsByTagNameNS(ns,'url'))) {
  const loc = url.getElementsByTagNameNS(ns,'loc');
  requireMatch(loc.length===1, 'Each sitemap entry needs exactly one loc');
  const href = new URL(loc.item(0)?.textContent ?? '').href;
  const route = new URL(href).pathname;
  requireMatch(eligible.has(route) && href===absolute(route) && !listed.has(route), 'Unexpected, duplicate or noncanonical sitemap entry '+href);
  listed.add(route);
}
for (const route of eligible) requireMatch(listed.has(route), 'Missing sitemap entry '+route);

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/\s([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),m[2]??m[3]]));
}
for (const route of [...eligible,...excluded]) {
  const file = route==='/' ? 'index' : route.slice(1);
  const index = production && eligible.has(route);
  let html;
  if (route==='/tools') {
    // Search results are rendered on request, so this route has no .html/.meta.
    const response = await fetch(new URL(route,server),{redirect:'error'});
    requireMatch(response.status===200 && response.headers.get('content-type')?.includes('text/html'), '/tools did not return a successful HTML response');
    if (index) requireMatch(!/\b(noindex|nofollow|none|unavailable_after)\b/i.test(response.headers.get('x-robots-tag')??''), '/tools restrictive X-Robots-Tag');
    html = await response.text();
  } else {
    await checkMetadata(file, index);
    html = await read(file+'.html');
  }
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]?.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<!--[\s\S]*?-->/gi,'') ?? '';
  const canonicals = [...head.matchAll(/<link\b[^>]*>/gi)].map(m=>attributes(m[0])).filter(a=>a.rel==='canonical');
  requireMatch(canonicals.length===1 && new URL(canonicals[0].href).href===absolute(route), route+' needs one self-canonical on '+origin);
  const meta = [...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>attributes(m[0]));
  const robots = meta.filter(a=>a.name?.toLowerCase()==='robots');
  const tokens = (robots[0]?.content??'').toLowerCase().split(/[\s,]+/);
  const expectedTokens = index ? ['index','follow'] : ['noindex','nofollow'];
  requireMatch(robots.length===1 && tokens.length===2 && expectedTokens.every(t=>tokens.includes(t)), route+' unexpected robots directive: '+tokens.join(','));
  if (index) {
    const crawlerRules = meta.filter(a=>['robots','googlebot','bingbot'].includes(a.name?.toLowerCase()));
    requireMatch(!crawlerRules.some(a=>/\b(noindex|nofollow|none|unavailable_after)\b/i.test(a.content)), route+' has a restrictive crawler directive');
  }
}
if (errors.length) {
  console.error('FAIL '+values.mode+' release gate\n'+errors.join('\n')); process.exitCode=1;
} else {
  console.log('PASS '+values.mode+' artifact: '+listed.size+' sitemap URLs, '+excluded.length+' deliberately excluded tool(s), canonical origin '+origin+'.');
}
