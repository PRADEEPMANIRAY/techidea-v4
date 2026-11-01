import {ApiError,readApiConfig,checkGateway,responseHeaders,validateOrigin,jsonResponse,parameters,invalid,pageParams,searchParam,normalize,paginate,type ApiConfig,LocalLimiter} from './security.ts';
import {loadReference,loadCities,cityCoverage,datasetMeta} from './data.ts';
import {sampleUsers,sampleProducts,productCategories} from './samples.ts';
export type Endpoint='countries'|'states'|'cities'|'users'|'products';
const methods='GET, HEAD, OPTIONS';
export async function handleApi(request:Request,endpoint:Endpoint,options:{config?:ApiConfig;limiter?:LocalLimiter;now?:number}={}){
 let config:ApiConfig|null=null,headers=responseHeaders(request,null);
 try{
  try{config=options.config??readApiConfig();}catch{throw new ApiError(503,'SERVICE_UNAVAILABLE','API configuration is not ready.');}
  headers=responseHeaders(request,config);
  validateOrigin(request,config);
  const retryAfter=checkGateway(request,config,options.limiter,options.now);
  if(retryAfter){headers.set('Retry-After',String(retryAfter));throw new ApiError(429,'RATE_LIMITED','Too many requests. Try again later.');}
  if(!['GET','HEAD','OPTIONS'].includes(request.method)){headers.set('Allow',methods);throw new ApiError(405,'METHOD_NOT_ALLOWED','Use GET, HEAD or OPTIONS.');}
  if(request.method==='OPTIONS'){
   const method=request.headers.get('access-control-request-method');
   if(method&&!['GET','HEAD'].includes(method))throw new ApiError(405,'METHOD_NOT_ALLOWED','Only GET and HEAD are available.');
   const requested=request.headers.get('access-control-request-headers');
   if(requested&&requested.split(',').some(h=>!['accept','content-type'].includes(h.trim().toLowerCase())))throw new ApiError(400,'INVALID_PARAMETER','Requested CORS headers are not supported.');
   headers.set('Access-Control-Allow-Methods',methods);headers.set('Access-Control-Allow-Headers','Accept, Content-Type');headers.set('Access-Control-Max-Age','600');headers.delete('Content-Type');return new Response(null,{status:204,headers});
  }
  if(request.headers.has('transfer-encoding')||request.headers.has('content-length')&&request.headers.get('content-length')!=='0')throw new ApiError(413,'BODY_NOT_ALLOWED','Request bodies are not supported.');
  const allowed=endpoint==='countries'?['search']:endpoint==='states'?['country']:endpoint==='cities'?['country','state','search','page','limit']:endpoint==='users'?['seed','page','limit']:['seed','category','page','limit'];
  const params=parameters(request,allowed);
  let payload:Record<string,unknown>;
  if(endpoint==='users'||endpoint==='products'){
   const {page,limit}=pageParams(params),seed=params.get('seed')??'techidea-v1';
   if(!/^[A-Za-z0-9_-]{1,64}$/.test(seed))invalid('seed must contain 1–64 ASCII letters, digits, underscores or hyphens.');
   const meta={fictional:true,seed,notice:'Synthetic demonstration data only. Not real people, customers, products or offers.'};
   if(endpoint==='users')payload={success:true,...paginate(sampleUsers(seed),page,limit),meta};
   else{const category=params.get('category');if(category!==null&&!productCategories.includes(category as typeof productCategories[number]))invalid('Unsupported category. Use electronics, stationery, home, outdoors or apparel.');const rows=sampleProducts(seed).filter(p=>category===null||p.category===category);payload={success:true,...paginate(rows,page,limit),meta};}
  }else{
   const reference=await loadReference();
   if(endpoint==='countries'){const search=searchParam(params);payload={success:true,data:reference.countries.filter(c=>!search||normalize(`${c.name} ${c.code} ${c.alpha3??''}`).includes(search)),meta:{dataset:datasetMeta}};}
   else{
    const country=(params.get('country')??'').toUpperCase();if(!/^[A-Z]{2}$/.test(country)||!reference.countryMap.has(country))invalid('country must be a supported ISO alpha-2 code.');
    const states=reference.stateMap.get(country)??[];
    if(endpoint==='states')payload={success:true,data:states,meta:{dataset:datasetMeta,coverage:states.length?'source_subdivisions':'no_subdivisions_in_dataset',notice:'Source administrative levels vary. An empty result does not establish that a country has no subdivisions.'}};
    else{
     const state=(params.get('state')??'').toUpperCase();if(!/^[A-Z0-9-]{1,12}$/.test(state)||!states.some(s=>s.code===state))invalid('state must match a subdivision code returned for this country.');
     const {page,limit}=pageParams(params),search=searchParam(params);
     const rows=(await loadCities(country,state)).filter(c=>!search||normalize(c.name).includes(search));
     payload={success:true,...paginate(rows,page,limit),meta:{dataset:datasetMeta,coverage:{status:cityCoverage(country)?'partial':'not_included',includedCountries:['IN'],notice:'Only source localities assigned to Indian states are included. Coverage is incomplete, including within India; some records describe districts. Empty results do not imply no cities exist.'}}};
    }
   }
  }
  return jsonResponse(payload,200,headers,config.maxResponseBytes,request.method==='HEAD');
 }catch(error){const known=error instanceof ApiError;return jsonResponse({success:false,error:{code:known?error.code:'INTERNAL_ERROR',message:known?error.message:'Unable to complete this request.'}},known?error.status:500,headers,config?.maxResponseBytes,request.method==='HEAD');}
}
