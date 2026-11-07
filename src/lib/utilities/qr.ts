import qrcode from 'qrcode-generator';
qrcode.stringToBytes=(text:string)=>Array.from(new TextEncoder().encode(text));
export type QrBranding = {foreground?:string;background?:string;logoDataUrl?:string;logoPercent?:number};
export function qrContrast(foreground:string,background:string) {
 const luminance=(hex:string)=>{if(!/^#[0-9a-f]{6}$/i.test(hex))throw new Error('Choose a six-digit hex color.');const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 const a=luminance(foreground),b=luminance(background);
 return {ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),darkOnLight:a<b};
}
export function createQr(text:string,level:string='M',requestedSize=320,kind='text',branding:QrBranding={}){
 const foreground=branding.foreground??'#000000',background=branding.background??'#ffffff';
 const contrast=qrContrast(foreground,background),warnings:string[]=[];
 if(contrast.ratio<4.5||!contrast.darkOnLight)warnings.push('Low contrast or light foreground: use dark modules on a light background and test scans before sharing.');
 const logoPercent=branding.logoPercent??10;
 if(!Number.isFinite(logoPercent)||logoPercent<5||logoPercent>15)throw new Error('Logo size must be 5–15% of the QR pattern width.');
 if(branding.logoDataUrl && (branding.logoDataUrl.length>400000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(branding.logoDataUrl)))throw new Error('Use a locally normalized PNG logo.');
 if(!text.trim())throw new Error('Enter text or a URL.');
 if([...text].some(c=>{const n=c.codePointAt(0)!;return n>=0xd800&&n<=0xdfff;}))throw new Error('Input contains an unpaired Unicode surrogate.');
 const bytes=new TextEncoder().encode(text).length;if(bytes>1200)throw new Error('Use at most 1,200 UTF-8 bytes. Unicode characters can use several bytes each.');
 if(!['L','M','Q','H'].includes(level))throw new Error('Choose error correction L, M, Q or H.');
 if(!Number.isInteger(requestedSize)||requestedSize<128||requestedSize>2048)throw new Error('Choose a size from 128 to 2,048 pixels.');
 if(kind!=='text'&&kind!=='url')throw new Error('Choose text or URL mode.');
 if(kind==='url'){try{const u=new URL(text);if(!['https:','http:'].includes(u.protocol)||text!==text.trim())throw new Error();}catch{throw new Error('Enter a complete http:// or https:// URL without surrounding spaces.');}}
 const effectiveLevel=branding.logoDataUrl?'H':level;
 const qr=qrcode(0,effectiveLevel as 'L'|'M'|'Q'|'H');qr.addData(text,'Byte');try{qr.make();}catch{throw new Error('The content does not fit at this correction level. Shorten it.');}
 const count=qr.getModuleCount(),modules=count+8,scale=Math.max(4,Math.ceil(requestedSize/modules)),size=modules*scale;
 const matrix=Array.from({length:count},(_,y)=>Array.from({length:count},(_,x)=>qr.isDark(y,x)));
 const paths:string[]=[];matrix.forEach((row,y)=>row.forEach((dark,x)=>{if(dark)paths.push(`M${x+4} ${y+4}h1v1h-1z`);}));
 const logoSize=branding.logoDataUrl?Math.max(1,Math.floor(count*logoPercent/100)):0;
 const logoStart=4+Math.floor((count-logoSize)/2);
 const overlay=branding.logoDataUrl?`<rect x="${logoStart}" y="${logoStart}" width="${logoSize}" height="${logoSize}" fill="${background}"/><image x="${logoStart+.25}" y="${logoStart+.25}" width="${logoSize-.5}" height="${logoSize-.5}" preserveAspectRatio="xMidYMid meet" href="${branding.logoDataUrl}"/>`:'';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${modules} ${modules}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${background}"/><path fill="${foreground}" d="${paths.join('')}"/>${overlay}</svg>`;
 if(branding.logoDataUrl)warnings.push('Logo uses correction H automatically. The overlay can still prevent scanning; test the exported image at its intended print size.');
 return {matrix,svg,size,scale,bytes,foreground,background,effectiveLevel,warnings,logoSize,logoStart};
}
export function qrPixels(qr:ReturnType<typeof createQr>){
 const data=new Uint8ClampedArray(qr.size*qr.size*4);
 const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const fg=rgb(qr.foreground),bg=rgb(qr.background);
 for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++){
  const mx=Math.floor(x/qr.scale)-4,my=Math.floor(y/qr.scale)-4;
  const obscured=qr.logoSize>0 && x>=qr.logoStart*qr.scale && x<(qr.logoStart+qr.logoSize)*qr.scale && y>=qr.logoStart*qr.scale && y<(qr.logoStart+qr.logoSize)*qr.scale;
  const color=!obscured&&qr.matrix[my]?.[mx]?fg:bg, p=(y*qr.size+x)*4;
  data[p]=color[0];data[p+1]=color[1];data[p+2]=color[2];data[p+3]=255;
 }
 return data;
}
