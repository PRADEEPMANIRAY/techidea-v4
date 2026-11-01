import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import {inspectImage} from '../src/lib/utilities/image.ts';
// Check the actual browser downloads, not just the generator's in-memory matrix.
const [pngPath,svgPath,jsonPath,jpegPath]=process.argv.slice(2);
if(!jpegPath)throw new Error('Usage: node --experimental-strip-types scripts/check-utility-downloads.mjs qr.png qr.svg result.json image.jpg');
const png=readFileSync(pngPath),width=png.readUInt32BE(16),height=png.readUInt32BE(20),channels=png[25]===6?4:png[25]===2?3:0;
assert.ok(channels&&png[24]===8&&png[28]===0,'Expected noninterlaced 8-bit RGB/RGBA PNG');
const chunks=[];for(let p=8;p<png.length;){const length=png.readUInt32BE(p);if(png.toString('ascii',p+4,p+8)==='IDAT')chunks.push(png.subarray(p+8,p+8+length));p+=12+length;}
const encoded=inflateSync(Buffer.concat(chunks)),stride=width*channels,raw=new Uint8Array(stride*height);
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
for(let y=0;y<height;y++){const filter=encoded[y*(stride+1)];assert.ok(filter<=4);for(let x=0;x<stride;x++){const index=y*stride+x,left=x>=channels?raw[index-channels]:0,up=y?raw[index-stride]:0,upperLeft=y&&x>=channels?raw[index-stride-channels]:0;const predictor=[0,left,up,Math.floor((left+up)/2),paeth(left,up,upperLeft)][filter];raw[index]=(encoded[y*(stride+1)+1+x]+predictor)&255;}}
const rgba=new Uint8ClampedArray(width*height*4);for(let p=0;p<width*height;p++){rgba[p*4]=raw[p*channels];rgba[p*4+1]=raw[p*channels+1];rgba[p*4+2]=raw[p*channels+2];rgba[p*4+3]=channels===4?raw[p*channels+3]:255;}
assert.equal(jsQR(rgba,width,height)?.data,'Hello 世界 — नमस्ते 👋');
const svg=readFileSync(svgPath,'utf8');assert.match(svg,/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);assert.ok(!svg.includes('<script'));
assert.match(readFileSync(jsonPath,'utf8'),/9007199254740993/);
const jpeg=inspectImage(readFileSync(jpegPath),'image/jpeg');assert.equal(jpeg.width,256);assert.equal(jpeg.height,128);
console.log('PASS: downloaded PNG independently decodes Unicode; SVG geometry, exact JSON digits and JPEG dimensions verified.');
