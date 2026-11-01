import test from 'node:test';
import assert from 'node:assert/strict';
import {getRelatedTools,getPublishedTools,getAvailableCategories,tools} from '../src/data/tools/registry.ts';
import {financialInstructions} from '../src/data/tools/financial-instructions.ts';
const current={id:'current',name:'Current',description:'',category:'unit-converters',status:'published',href:'/tools/current'};
const item=(id,category='unit-converters',status='published')=>({...current,id,category,status,href:status==='published'?'/tools/'+id:undefined});
const registry=[current,item('fallback-a'),item('fallback-b'),item('cross','financial-calculators'),item('planned','unit-converters','planned'),item('third'),item('fourth')];
const ids=result=>result.map(tool=>tool.id);
test('explicit related order wins over category and registry order',()=>assert.deepEqual(ids(getRelatedTools(current,['cross','fallback-b'],registry)),['cross','fallback-b','fallback-a','third']));
test('related removes duplicate IDs and self',()=>assert.deepEqual(ids(getRelatedTools(current,['current','cross','cross'],registry)),['cross','fallback-a','fallback-b','third']));
test('related skips unpublished and unknown IDs',()=>assert.deepEqual(ids(getRelatedTools(current,['planned','unknown'],registry)),['fallback-a','fallback-b','third','fourth']));
test('related falls back to category when no explicit list exists',()=>assert.deepEqual(ids(getRelatedTools(current,[],registry)),['fallback-a','fallback-b','third','fourth']));
test('related can return an empty collection',()=>assert.deepEqual(getRelatedTools(current,[],[current,item('planned','unit-converters','planned')]),[]));
test('related caps an explicit list at four',()=>assert.deepEqual(ids(getRelatedTools(current,['cross','third','fourth','fallback-b','fallback-a'],registry)),['cross','third','fourth','fallback-b']));
test('all real related selections contain only distinct published alternatives',()=>{for(const tool of getPublishedTools()){const result=getRelatedTools(tool,tools.map(t=>t.id));assert.ok(result.every(t=>t.id!==tool.id&&t.status==='published'));assert.equal(new Set(ids(result)).size,result.length);assert.ok(result.length<=4);}});
test('empty PDF category is unavailable, all seven others have published tools',()=>{assert.equal(getAvailableCategories().length,7);assert.ok(!getAvailableCategories().some(c=>c.id==='pdf-tools'));assert.ok(getAvailableCategories().every(c=>getPublishedTools().some(t=>t.category===c.id)));});
test('featured published collection has no unavailable tools',()=>{const featured=getPublishedTools().filter(t=>t.featured);assert.equal(featured.length,3);assert.ok(featured.every(t=>t.href&&t.status==='published'));});
test('only EMI instructions describe the schedule download',()=>{assert.match(financialInstructions['emi-calculator'].join(' '),/CSV/);for(const [id,steps] of Object.entries(financialInstructions)){assert.equal(steps.length,3);if(id!=='emi-calculator')assert.doesNotMatch(steps.join(' '),/EMI|CSV/);}});

// Search-facing scope must agree with the existing limited functionality.
test('postal reference title and coverage identify the ten-office subset',async()=>{const {getPakistanTool}=await import('../src/data/tools/pakistan.ts');const {pakistanPostalRecords}=await import('../src/data/pakistan/postal.ts');const tool=getPakistanTool('pakistan-postal-code-finder');assert.match(tool.name,/Reference.*10 Offices/);assert.match(tool.description,/not a nationwide finder/);assert.equal(pakistanPostalRecords.length,10);for(const city of ['Islamabad','Lahore','Karachi'])assert.ok(tool.intro.includes(city));});
test('land comparison has six units and honest multi-output positioning',async()=>{const {getBhutanTool}=await import('../src/data/tools/bhutan.ts');const {bhutanLandUnits,bhutanLand}=await import('../src/lib/bhutan/conversions.ts');const tool=getBhutanTool('bhutan-land-area-converter');assert.equal(tool.name,'Multi-Unit Land Area Converter');assert.match(tool.intro,/side by side/);assert.match(tool.intro,/not Bhutan-specific/);assert.equal(bhutanLandUnits.length,6);assert.equal(bhutanLand('0.25','acre').length,6);});
test('Nepal GPA search-facing copy leads with user-supplied custom grading',async()=>{const {getNepalTool}=await import('../src/data/tools/nepal.ts');const tool=getNepalTool('nepal-neb-gpa-calculator');assert.equal(tool.name,'Nepal GPA Calculator — Custom Grading');assert.match(tool.description,/not an official NEB result/);assert.match(tool.intro,/Supply your school/);assert.equal(getPublishedTools().find(t=>t.id===tool.id).name,tool.name);});

test('all 34 published tools have high-quality, non-empty, unique FAQs',async()=>{
  const {converterContent}=await import('../src/data/tools/converter-content.ts');
  const {constructionDefinitions}=await import('../src/data/tools/construction.ts');
  const {financialDefinitions}=await import('../src/data/tools/financial.ts');
  const {utilities}=await import('../src/data/tools/utilities.ts');
  const {indiaTools}=await import('../src/data/tools/india.ts');
  const {pakistanTools}=await import('../src/data/tools/pakistan.ts');
  const {nepalTools}=await import('../src/data/tools/nepal.ts');
  const {bhutanTools}=await import('../src/data/tools/bhutan.ts');

  const faqRegistry=new Map();
  for(const [id,c] of Object.entries(converterContent)) faqRegistry.set(id,c.faqs);
  for(const c of constructionDefinitions) faqRegistry.set(c.id,c.faqs);
  for(const c of financialDefinitions) faqRegistry.set(c.id,c.faqs);
  for(const c of utilities) faqRegistry.set(c.id,c.faqs);
  for(const c of indiaTools) faqRegistry.set(c.id,c.faqs);
  for(const c of pakistanTools) faqRegistry.set(c.id,c.faqs);
  for(const c of nepalTools) faqRegistry.set(c.id,c.faqs);
  for(const c of bhutanTools) faqRegistry.set(c.id,c.faqs);

  const published=getPublishedTools();
  assert.equal(published.length,34);
  assert.equal(faqRegistry.size,34);

  for(const tool of published){
    const faqs=faqRegistry.get(tool.id);
    assert.ok(Array.isArray(faqs),`Tool ${tool.id} must have FAQs array`);
    assert.ok(faqs.length>=3,`Tool ${tool.id} must have at least 3 FAQs (found ${faqs.length})`);
    const questions=new Set();
    for(const [q,a] of faqs){
      assert.ok(typeof q==='string'&&q.trim().length>10,`Tool ${tool.id} FAQ question must be meaningful: ${q}`);
      assert.ok(typeof a==='string'&&a.trim().length>20,`Tool ${tool.id} FAQ answer must be meaningful for ${q}`);
      assert.ok(!questions.has(q),`Tool ${tool.id} has duplicate FAQ question: ${q}`);
      questions.add(q);
    }
  }
});
