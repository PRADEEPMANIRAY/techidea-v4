import {writeFileSync} from 'node:fs';
import {apis} from '../src/data/apis/registry.ts';
import {buildApiPath} from '../src/lib/apis/client.ts';
import {handleApi} from '../src/lib/api/handler.ts';
import {readApiConfig,LocalLimiter} from '../src/lib/api/security.ts';
const config=readApiConfig({NODE_ENV:'test',API_RATE_LIMIT_MODE:'local'}),examples={};
for(const api of apis){const request=buildApiPath(api.id,api.example);if(!request.ok)throw new Error('Invalid example');const call=async path=>{const response=await handleApi(new Request('http://offline.invalid'+path),api.id,{config,limiter:new LocalLimiter()});return {status:response.status,body:await response.json()};};examples[api.id]={request:request.path,...await call(request.path),error:{request:api.endpoint+api.errorQuery,...await call(api.endpoint+api.errorQuery)}};}
writeFileSync('src/data/apis/examples.json',JSON.stringify(examples,null,2)+'\n');
console.log('Generated five documentation fixtures directly from existing M4A handlers; no network calls.');
