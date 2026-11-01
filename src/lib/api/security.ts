import {timingSafeEqual} from 'node:crypto';
export class ApiError extends Error {status:number;code:string;constructor(status:number,code:string,message:string){super(message);this.status=status;this.code=code;}}
export type ApiConfig={mode:'local'|'nginx'|'disabled';proxySecret:string;origins:readonly string[];maxResponseBytes:number;localLimit:number;localWindowMs:number;production:boolean};
function integer(value:string|undefined,fallback:number,min:number,max:number){if(value===undefined)return fallback;if(!/^\d+$/.test(value))throw new Error('Invalid API configuration');const n=Number(value);if(n<min||n>max)throw new Error('Invalid API configuration');return n;}
export function readApiConfig(env:NodeJS.ProcessEnv=process.env):ApiConfig {
 const production=env.NODE_ENV==='production',mode=env.API_RATE_LIMIT_MODE??(production?'disabled':'local');
 if(!['local','nginx','disabled'].includes(mode)||production&&mode==='local')throw new Error('Unsafe API rate-limit configuration');
 const proxySecret=env.API_PROXY_SECRET??'';
 if(mode==='nginx'&&!/^[a-f0-9]{64}$/.test(proxySecret))throw new Error('Missing API proxy secret');
 const origins=(env.API_CORS_ORIGINS??'*').split(',').map(s=>s.trim());
 if(!origins.length||origins.some(s=>!s)||origins.includes('*')&&origins.length>1)throw new Error('Invalid CORS configuration');
 for(const origin of origins){if(origin==='*')continue;const url=new URL(origin);if(!['https:','http:'].includes(url.protocol)||url.origin!==origin)throw new Error('Invalid CORS origin');}
 return {mode:mode as ApiConfig['mode'],proxySecret,origins,maxResponseBytes:integer(env.API_MAX_RESPONSE_BYTES,262144,1024,1048576),localLimit:integer(env.API_LOCAL_RATE_LIMIT,60,1,1000),localWindowMs:60000,production};
}
// A single bounded bucket, used only for local development. No caller-controlled IP keys.
export class LocalLimiter {private start=0;private used=0;take(limit:number,windowMs:number,now=Date.now()){if(now<this.start||now>=this.start+windowMs){this.start=now;this.used=0;}if(this.used>=limit)return {allowed:false,retryAfter:Math.max(1,Math.ceil((this.start+windowMs-now)/1000))};this.used++;return {allowed:true,retryAfter:0};}}
export const localLimiter=new LocalLimiter();
export function checkGateway(request:Request,config:ApiConfig,limiter=localLimiter,now=Date.now()){
 if(config.mode==='disabled')throw new ApiError(503,'SERVICE_UNAVAILABLE','API access is not enabled.');
 if(config.mode==='nginx'){const supplied=request.headers.get('x-techidea-proxy-token')??'';if(!/^[a-f0-9]{64}$/.test(supplied)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(config.proxySecret)))throw new ApiError(503,'SERVICE_UNAVAILABLE','API access requires the configured gateway.');return 0;}
 const state=limiter.take(config.localLimit,config.localWindowMs,now);return state.allowed?0:state.retryAfter;
}
export function responseHeaders(request:Request,config:ApiConfig|null){const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Vary':'Origin'});const origin=request.headers.get('origin');if(config?.origins.includes('*'))headers.set('Access-Control-Allow-Origin','*');else if(origin&&config?.origins.includes(origin))headers.set('Access-Control-Allow-Origin',origin);return headers;}
export function validateOrigin(request:Request,config:ApiConfig){const origin=request.headers.get('origin');if(origin&&!config.origins.includes('*')&&!config.origins.includes(origin))throw new ApiError(403,'ORIGIN_NOT_ALLOWED','This origin is not allowed.');}
export function jsonResponse(body:unknown,status:number,headers:Headers,maxBytes=262144,head=false){let json=JSON.stringify(body);if(Buffer.byteLength(json)>maxBytes){status=500;json=JSON.stringify({success:false,error:{code:'RESPONSE_TOO_LARGE',message:'The response exceeds the configured size limit.'}});}return new Response(head?null:json,{status,headers});}
export function parameters(request:Request,allowed:readonly string[]){if(request.url.length>2048)throw new ApiError(414,'URI_TOO_LONG','Request URL is too long.');if(/%(?![a-f\d]{2})/i.test(request.url))throw new ApiError(400,'INVALID_PARAMETER','Invalid URL encoding.');const params=new URL(request.url).searchParams;const seen=new Set<string>();for(const [key,value]of params){if(!allowed.includes(key)||seen.has(key)||/[\u0000-\u001f\u007f\ufffd]/.test(value))throw new ApiError(400,'INVALID_PARAMETER','Unknown, repeated or invalid request parameter.');seen.add(key);}return params;}
export function invalid(message:string):never{throw new ApiError(400,'INVALID_PARAMETER',message);}
export function pageParams(params:URLSearchParams){const parse=(key:string,fallback:number,max:number)=>{const raw=params.get(key);if(raw===null)return fallback;if(!/^[1-9]\d{0,5}$/.test(raw)||Number(raw)>max)invalid(`${key} must be an integer from 1 to ${max}.`);return Number(raw);};return {page:parse('page',1,10000),limit:parse('limit',20,100)};}
export function searchParam(params:URLSearchParams){const text=params.get('search')??'';if(text.length>100)invalid('search must contain at most 100 characters.');return normalize(text.trim());}
export function normalize(text:string){return text.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();}
export function paginate<T>(rows:readonly T[],page:number,limit:number){return {data:rows.slice((page-1)*limit,page*limit),pagination:{page,limit,total:rows.length,totalPages:Math.ceil(rows.length/limit)}};}
