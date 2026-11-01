import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url),swc=require('next/dist/build/swc');
// Exercise the real component handlers and effects with deterministic hook state.
// Browser checks separately verify normal copying and keyboard interaction.
function mount(clipboard) {
 const states=[],deps=[],effects=[];let cursor=0,tree;
 const field={focusCount:0,selectCount:0,focus(){this.focusCount++;},select(){this.selectCount++;}};
 const hooks={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useRef(){cursor++;return {current:field};},useId(){cursor++;return 'copy-fallback';},useEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((v,j)=>!Object.is(v,deps[i][j]))){deps[i]=next;effects.push(fn);}}};
 const code=swc.transformSync(readFileSync(new URL('../src/components/tools/utility-actions.tsx',import.meta.url),'utf8'),{filename:'utility-actions.tsx',jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code;
 const module={exports:{}};
 runInNewContext(code,{exports:module.exports,require:id=>id==='react'?hooks:require(id),navigator:{clipboard},URL,Blob,setTimeout});
 function render(output='{"percentage":76}'){cursor=0;tree=module.exports.OutputActions({output});while(effects.length)effects.shift()();return tree;}
 function find(predicate,node=tree){if(!node||typeof node!=='object')return; if(Array.isArray(node)){for(const child of node){const found=find(predicate,child);if(found)return found;}return;}if(predicate(node))return node;return find(predicate,node.props?.children);}
 render();return {render,find,field,copy:()=>find(n=>n.type==='button'&&n.props.children==='Copy result').props.onClick()};
}
test('denied clipboard reveals readonly fallback, focuses and selects the result',async()=>{const app=mount({writeText:async()=>{throw new DOMException('Denied','NotAllowedError');}});await app.copy();app.render();const field=app.find(n=>n.type==='textarea');assert.ok(field.props.readOnly);assert.equal(field.props.value,'{"percentage":76}');assert.equal(field.props.id,'copy-fallback');assert.ok(app.find(n=>n.type==='label'&&n.props.htmlFor===field.props.id));assert.ok(app.field.focusCount>0&&app.field.selectCount>0);assert.match(app.find(n=>n.props?.role==='status').props.children,/Clipboard unavailable/);});
test('missing clipboard API uses the same recovery',async()=>{const app=mount(undefined);await app.copy();app.render();assert.ok(app.find(n=>n.type==='textarea'));});
test('normal clipboard copy retains output and does not expose fallback',async()=>{let copied;const app=mount({writeText:async value=>{copied=value;}});await app.copy();app.render();assert.equal(copied,'{"percentage":76}');assert.equal(app.find(n=>n.type==='textarea'),undefined);assert.equal(app.find(n=>n.props?.role==='status').props.children,'Copied result.');});
test('changing output clears stale clipboard fallback',async()=>{const app=mount({writeText:async()=>{throw Error('Denied');}});await app.copy();app.render();app.render('{"percentage":80}');app.render('{"percentage":80}');assert.equal(app.find(n=>n.type==='textarea'),undefined);});
