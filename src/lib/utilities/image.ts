export const MAX_IMAGE_BYTES=10*1024*1024, MAX_PIXELS=12000000, MAX_SIDE=8192;
export type ImageFormat='image/jpeg'|'image/png'|'image/webp';
export function validateDimensions(width:number,height:number){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>MAX_SIDE||height>MAX_SIDE||width*height>MAX_PIXELS)throw new Error('Images must be at most 8,192 pixels per side and 12 megapixels.');}
export function inspectImage(bytes:Uint8Array,mime:string){
 if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw new Error('Choose a nonempty image of at most 10 MiB.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const ascii=(p:number,n:number)=>String.fromCharCode(...bytes.slice(p,p+n));let type:ImageFormat,width=0,height=0;
 try{
 if(bytes.length>=24&&bytes[0]===137&&ascii(1,7)==='PNG\r\n\x1a\n'&&ascii(12,4)==='IHDR'){
  type='image/png';width=view.getUint32(16);height=view.getUint32(20);
  for(let p=8;p+12<=bytes.length;){const size=view.getUint32(p);if(p+12+size>bytes.length)throw new Error('Truncated PNG chunk.');if(ascii(p+4,4)==='acTL')throw new Error('Animated PNG is not supported. Choose a still image.');p+=12+size;}
 }else if(bytes[0]===255&&bytes[1]===216){
  type='image/jpeg';let p=2;
  while(p+4<=bytes.length){if(bytes[p++]!==255)throw new Error('Invalid JPEG marker.');while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===217||marker===218)break;if(marker===1||(marker>=208&&marker<=215))continue;const length=view.getUint16(p);if(length<2||p+length>bytes.length)throw new Error('Truncated JPEG segment.');if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=view.getUint16(p+3);width=view.getUint16(p+5);break;}p+=length;}
 }else if(bytes.length>=30&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){
  type='image/webp';if(view.getUint32(4,true)+8>bytes.length)throw new Error('Truncated WebP.');
  for(let p=12;p+8<=bytes.length;){const size=view.getUint32(p+4,true),kind=ascii(p,4),d=p+8;if(d+size>bytes.length)throw new Error('Truncated WebP chunk.');
   if(kind==='ANIM'||kind==='ANMF')throw new Error('Animated WebP is not supported. Choose a still image.');
   if(kind==='VP8X'){if(size<10)throw new Error('Invalid WebP header.');if(bytes[d]&2)throw new Error('Animated WebP is not supported.');width=1+bytes[d+4]+(bytes[d+5]<<8)+(bytes[d+6]<<16);height=1+bytes[d+7]+(bytes[d+8]<<8)+(bytes[d+9]<<16);}
   if(!width&&kind==='VP8 '&&size>=10&&ascii(d+3,3)==='\x9d\x01\x2a'){width=view.getUint16(d+6,true)&16383;height=view.getUint16(d+8,true)&16383;}
   if(!width&&kind==='VP8L'&&size>=5&&bytes[d]===47){const bits=view.getUint32(d+1,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;}
   p=d+size+(size%2);
  }
 }else throw new Error('Only genuine JPEG, PNG and WebP files are accepted.');
 }catch(error){throw new Error(error instanceof RangeError?'Truncated image header.':error instanceof Error?error.message:'Invalid image.');}
 if(mime&&mime!==type&&mime!=='application/octet-stream')throw new Error('The file type does not match its image contents.');
 validateDimensions(width,height);return {type,width,height};
}
export function compressionSummary(original:number,output:number){if(original<=0||output<=0)throw new Error('Invalid file sizes.');const reduction=(original-output)/original*100;return {reduction,smaller:output<original,label:output<original?`${reduction.toFixed(1)}% smaller`:output===original?'Same size — no reduction':`${(-reduction).toFixed(1)}% larger — no size reduction`};}
export async function compressImage(file:File,format:ImageFormat,quality:number){
 if(!['image/jpeg','image/png','image/webp'].includes(format)||!Number.isFinite(quality)||quality<0.1||quality>1)throw new Error('Choose a supported format and quality from 10–100%.');
 if(file.size>MAX_IMAGE_BYTES)throw new Error('The image exceeds 10 MiB.');
 inspectImage(new Uint8Array(await file.arrayBuffer()),file.type);
 let source:ImageBitmap|HTMLImageElement;let url:string|undefined;
 try{if(typeof createImageBitmap==='function')source=await createImageBitmap(file);else{url=URL.createObjectURL(file);const image=new Image();image.src=url;await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('The browser could not decode this image.'));});source=image;}}
 catch{if(url)URL.revokeObjectURL(url);throw new Error('The browser could not decode this image. Try a valid JPEG, PNG or WebP.');}
 const width=source instanceof HTMLImageElement?source.naturalWidth:source.width,height=source instanceof HTMLImageElement?source.naturalHeight:source.height;
 const canvas=document.createElement('canvas');
 try{validateDimensions(width,height);canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas processing is unavailable in this browser.');if(format==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);}ctx.drawImage(source,0,0);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image encoding failed. Try a smaller image.')),format,quality));if(blob.type!==format)throw new Error('This browser does not support the selected output format. Choose PNG or JPEG.');return {blob,width,height,...compressionSummary(file.size,blob.size)};}
 finally{canvas.width=0;canvas.height=0;if('close'in source)source.close();if(url)URL.revokeObjectURL(url);}
}
