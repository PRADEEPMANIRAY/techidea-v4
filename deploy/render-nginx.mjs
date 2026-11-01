import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
export function renderNginx(env,part){
 if(!['http','server'].includes(part))throw new Error('Select http or server.');
 if(!/^[a-f0-9]{64}$/.test(env.API_PROXY_SECRET??''))throw new Error('API_PROXY_SECRET must be a private random 64-character hex value.');
 const number=(key,defaultValue,min,max)=>{const value=env[key]??String(defaultValue);if(!/^\d+$/.test(value)||Number(value)<min||Number(value)>max)throw new Error(`Invalid ${key}.`);return String(Number(value));};
 const origins=(env.API_CORS_ORIGINS??'*').split(',').map(s=>s.trim());
 if(!origins.length||origins.includes('*')&&origins.length!==1)throw new Error('Invalid CORS policy.');
 for(const origin of origins){if(origin==='*')continue;if(!/^https?:\/\/[A-Za-z0-9.:[\]-]+$/.test(origin)||new URL(origin).origin!==origin)throw new Error('CORS origins must be exact HTTP(S) origins.');}
 const map=origins[0]==='*'?'    default "*";':'    default "";\n'+origins.map(o=>`    "${o}" "${o}";`).join('\n');
 const template=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),`nginx-api-${part}.conf.template`),'utf8');
 return template.replaceAll('__SECRET__',env.API_PROXY_SECRET).replaceAll('__RATE__',number('API_RATE_PER_MINUTE',60,1,6000)).replaceAll('__GLOBAL_RATE__',number('API_GLOBAL_RATE_PER_SECOND',50,1,1000)).replaceAll('__BURST__',number('API_RATE_BURST',20,1,100)).replaceAll('__CORS_MAP__',map);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{process.stdout.write(renderNginx(process.env,process.argv[2]));}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}}
