import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {handleApi} from '../src/lib/api/handler.ts';
import {readApiConfig} from '../src/lib/api/security.ts';
const secret='a'.repeat(64),config=readApiConfig({NODE_ENV:'production',API_RATE_LIMIT_MODE:'nginx',API_PROXY_SECRET:secret});
const request=()=>new Request('http://localhost/api/v1/cities?country=IN&state=WB&search=kol&limit=20',{headers:{'x-techidea-proxy-token':secret}});
const before=process.memoryUsage(),coldStart=performance.now();
const cold=await handleApi(request(),'cities',{config});assert.equal(cold.status,200);await cold.arrayBuffer();const coldMs=performance.now()-coldStart,loaded=process.memoryUsage();
const times=[];for(let i=0;i<500;i++){const start=performance.now();const response=await handleApi(request(),'cities',{config});assert.equal(response.status,200);await response.arrayBuffer();times.push(performance.now()-start);}
times.sort((a,b)=>a-b);const after=process.memoryUsage();
console.log(JSON.stringify({requests:501,coldMs:+coldMs.toFixed(2),warmP50Ms:+times[249].toFixed(2),warmP95Ms:+times[474].toFixed(2),coldHeapDeltaMiB:+((loaded.heapUsed-before.heapUsed)/1048576).toFixed(2),coldRssDeltaMiB:+((loaded.rss-before.rss)/1048576).toFixed(2),finalHeapMiB:+(after.heapUsed/1048576).toFixed(2),finalRssMiB:+(after.rss/1048576).toFixed(2),note:'Local process observations, includes JS/Request initialization; not a VPS capacity or leak guarantee.'},null,2));
assert.ok(after.heapUsed-before.heapUsed<64*1024*1024,'Unexpectedly high heap growth');
