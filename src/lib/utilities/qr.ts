import qrcode from 'qrcode-generator';
qrcode.stringToBytes=(text:string)=>Array.from(new TextEncoder().encode(text));
export function createQr(text:string,level:string='M',requestedSize=320,kind='text'){
 if(!text.trim())throw new Error('Enter text or a URL.');
 if([...text].some(c=>{const n=c.codePointAt(0)!;return n>=0xd800&&n<=0xdfff;}))throw new Error('Input contains an unpaired Unicode surrogate.');
 const bytes=new TextEncoder().encode(text).length;if(bytes>1200)throw new Error('Use at most 1,200 UTF-8 bytes. Unicode characters can use several bytes each.');
 if(!['L','M','Q','H'].includes(level))throw new Error('Choose error correction L, M, Q or H.');
 if(!Number.isInteger(requestedSize)||requestedSize<128||requestedSize>2048)throw new Error('Choose a size from 128 to 2,048 pixels.');
 if(kind!=='text'&&kind!=='url')throw new Error('Choose text or URL mode.');
 if(kind==='url'){try{const u=new URL(text);if(!['https:','http:'].includes(u.protocol)||text!==text.trim())throw new Error();}catch{throw new Error('Enter a complete http:// or https:// URL without surrounding spaces.');}}
 const qr=qrcode(0,level as 'L'|'M'|'Q'|'H');qr.addData(text,'Byte');try{qr.make();}catch{throw new Error('The content does not fit at this correction level. Shorten it.');}
 const count=qr.getModuleCount(),modules=count+8,scale=Math.max(4,Math.ceil(requestedSize/modules)),size=modules*scale;
 const matrix=Array.from({length:count},(_,y)=>Array.from({length:count},(_,x)=>qr.isDark(y,x)));
 const paths:string[]=[];matrix.forEach((row,y)=>row.forEach((dark,x)=>{if(dark)paths.push(`M${x+4} ${y+4}h1v1h-1z`);}));
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${modules} ${modules}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path fill="black" d="${paths.join('')}"/></svg>`;
 return {matrix,svg,size,scale,bytes};
}
export function qrPixels(qr:ReturnType<typeof createQr>){const data=new Uint8ClampedArray(qr.size*qr.size*4);data.fill(255);qr.matrix.forEach((row,y)=>row.forEach((dark,x)=>{if(dark)for(let j=0;j<qr.scale;j++)for(let i=0;i<qr.scale;i++){const p=(((y+4)*qr.scale+j)*qr.size+(x+4)*qr.scale+i)*4;data[p]=data[p+1]=data[p+2]=0;}}));return data;}
