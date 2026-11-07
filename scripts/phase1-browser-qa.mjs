import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
// Install Playwright outside the project; point QA_PLAYWRIGHT_PATH to its index.mjs.
const { chromium } = await import(pathToFileURL(process.env.QA_PLAYWRIGHT_PATH).href);
const output = process.env.QA_OUTPUT_DIR;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.QA_BROWSER_PATH, headless: true });
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3104';
const ids = ['tile-calculator','paint-calculator','concrete-calculator','plywood-calculator','wood-cft-calculator'];
const results = [];
const seo = [];
try {
  for (const id of ids) {
    await page.goto(`${origin}/tools/${id}`);
    await page.locator('.construction-result-list').waitFor();
    const metadata = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      robots: document.querySelector('meta[name="robots"]')?.content,
      h1: document.querySelector('h1')?.textContent,
      h2: [...document.querySelectorAll('h2')].filter(e => getComputedStyle(e).display !== 'none' && e.offsetParent !== null).map(e=>e.textContent),
      schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map(e=>JSON.parse(e.textContent)),
    }));
    assert.equal(metadata.title.split('TechIdea').length-1,1);
    assert.equal(new URL(metadata.canonical).pathname,`/tools/${id}`);
    assert.ok(metadata.description.length>0);
    assert.ok(metadata.schemas.some(s=>s['@type']==='WebApplication' && s.url===metadata.canonical));
    assert.ok(metadata.schemas.some(s=>s['@type']==='BreadcrumbList'));
    assert.ok(!metadata.schemas.some(s=>s['@type']==='FAQPage'));
    seo.push({id,...metadata});
    for (const link of await page.locator('.construction-page-nav a').all()) {
      const href=await link.getAttribute('href');
      assert.equal(await page.locator(href).count(),1);
    }
    const expected = {
      'tile-calculator': ['adjustedTiles', '62'],
      'paint-calculator': ['paint', '7.920'],
      'concrete-calculator': ['adjustedVolumeM3', '1.320000'],
      'plywood-calculator': ['sheetAreaFt2', '32.0000'],
      'wood-cft-calculator': ['boardFeet', '80.0000'],
    }[id];
    assert.equal(await page.locator(`[data-result="${expected[0]}"] strong`).innerText(), expected[1]);
    for (const width of [360,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id} overflow at ${width}`);
      assert.equal(await page.locator('h1').count(),1);
      assert.equal(await page.locator('[aria-invalid=true]').count(),0);
      if (width === 390) await page.screenshot({path:path.join(output,`${id}-mobile.png`),fullPage:true});
      if (width === 390 || width === 1440) {
        await page.evaluate(()=>scrollTo(0,0));
        await page.screenshot({path:path.join(output,`${id}-${width}-top.png`)});
      }
      results.push(`${id}: ${width}px layout passed`);
    }
    await page.getByRole('button',{name:'Copy results',exact:true}).click();
    await page.getByText('Results copied with units.').waitFor();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(clipboard.includes('Calculator') && clipboard.length > 100);
    // Check the button invokes the print entry point, then exercise Chromium's print renderer.
    await page.evaluate(() => { window.print = () => { window.__printRequested = true; }; });
    await page.getByRole('button',{name:'Print results',exact:true}).click();
    assert.equal(await page.evaluate(() => window.__printRequested),true);
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('.construction-print-inputs').isVisible(),true);
    assert.equal(await page.locator('.construction-actions').isVisible(),false);
    assert.equal(await page.locator('.construction-calculator form').isVisible(),false);
    await page.pdf({path:path.join(output,`${id}-estimate.pdf`),format:'A4'});
    await page.screenshot({path:path.join(output,`${id}-print.png`),fullPage:true});
    await page.emulateMedia({media:'screen'});
    results.push(`${id}: real clipboard, print invocation and PDF rendering passed`);
  }
  await page.goto(`${origin}/tools/concrete-calculator`);
  const field = id => page.locator(`#construction-${id}`);
  for (const [shape, visible] of [ ['rectangular-slab',['length','width','depth']], ['rectangular-footing',['length','width','depth']], ['circular-footing',['diameter','depth']], ['rectangular-column',['width','depth','height']], ['cylindrical-column',['diameter','height']] ]) {
    await field('shape').selectOption(shape);
    for (const id of ['length','width','depth','diameter','height']) assert.equal(await field(id).count(),visible.includes(id)?1:0);
    assert.equal(await page.locator('[data-result="wetVolumeM3"]').count(),1);
  }
  await field('shape').selectOption('rectangular-slab');
  for(const id of ['length','width','depth']) {
    await field(id).fill('3');
    await page.getByLabel(`${id[0].toUpperCase()+id.slice(1)} unit`,{exact:true}).selectOption('ft');
  }
  await field('wastage').fill('0');
  await field('bagSize').selectOption('80');
  assert.match(await page.locator('[data-result="wetVolumeYd3"]').innerText(),/1\.0000/);
  assert.match(await page.locator('[data-result="bags"]').innerText(),/45/);
  await field('bagYield').fill('0');
  assert.equal(await page.getByRole('button',{name:'Copy results',exact:true}).isDisabled(),true);
  await field('bagYield').fill('0.5');
  assert.match(await page.locator('[data-result="bags"]').innerText(),/54/);
  await field('priceBasis').selectOption('yd3');
  await field('price').fill('125');
  assert.match(await page.locator('[data-result="cost"]').innerText(),/125\.00/);
  // Force denied clipboard to verify the manual-copy path.
  await page.evaluate(() => Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('Denied')}}}));
  await page.getByRole('button',{name:'Copy results',exact:true}).click();
  await page.locator('#construction-copy').waitFor();
  assert.ok((await page.locator('#construction-copy').inputValue()).includes('125.00'));
  await page.getByRole('button',{name:'Reset defaults'}).click();
  assert.equal(await field('length').inputValue(),'4');
  results.push('Concrete: five shapes, one cubic yard, 45 bags, invalid yield, override, ready-mix cost, denied clipboard and reset passed');
  await page.goto(`${origin}/tools/plywood-calculator`);
  await field('sheetPreset').selectOption('2440x1220-mm');
  assert.equal(await field('length').inputValue(),'2440');
  assert.match(await page.locator('[data-result="sheetAreaM2"]').innerText(),/2\.9768/);
  await field('length').fill('2400');
  assert.equal(await field('sheetPreset').inputValue(),'custom');
  await field('sheetPreset').selectOption('7x4-ft');
  assert.match(await page.locator('[data-result="sheetAreaFt2"]').innerText(),/28\.0000/);
  await field('quantity').fill('3');
  await field('wastage').fill('10');
  await field('price').fill('12.5');
  assert.match(await page.locator('[data-result="adjustedSheets"]').innerText(),/4/);
  assert.match(await page.locator('[data-result="cost"]').innerText(),/50\.00/);
  await page.getByLabel('Sheet width unit',{exact:true}).selectOption('m');
  assert.equal(await field('sheetPreset').inputValue(),'custom');
  results.push('Plywood: metric and Indian presets, custom dimensions/units, wastage and cost passed');
  await field('estimateMode').selectOption('area');
  assert.equal(await field('quantity').count(),0);
  await field('sheetPreset').selectOption('8x4-ft');
  await field('targetArea').fill('100');
  await field('wastage').fill('10');
  await field('price').fill('40');
  assert.equal(await page.locator('[data-result="adjustedSheets"] strong').innerText(),'4');
  assert.equal(await page.locator('[data-result="cost"] strong').innerText(),'160.00');
  assert.ok(await page.getByText('Area-based sheet estimate only.',{exact:false}).isVisible());
  for(const width of [360,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.getByRole('button',{name:'Copy results',exact:true}).click();
  await page.getByText('Results copied with units.').waitFor();
  assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/Surface area to cover/);
  await page.emulateMedia({media:'print'});
  assert.match(await page.locator('.construction-print-inputs').innerText(),/Surface area to cover: 100 ft2/);
  assert.ok(!(await page.locator('.construction-print-inputs').innerText()).includes('Quantity:'));
  await page.pdf({path:path.join(output,'plywood-area-estimate.pdf'),format:'A4'});
  await page.emulateMedia({media:'screen'});
  await field('targetArea').fill('0');
  assert.equal(await page.getByRole('button',{name:'Copy results',exact:true}).isDisabled(),true);
  await field('targetArea').fill('9.290304');
  await page.getByLabel('Surface area to cover unit',{exact:true}).selectOption('m2');
  assert.equal(await page.locator('[data-result="adjustedSheets"] strong').innerText(),'4');
  await field('estimateMode').selectOption('sheets');
  assert.equal(await field('targetArea').count(),0);
  assert.equal(await field('quantity').inputValue(),'3');
  results.push('Plywood area mode: responsive layouts, inputs, 4 sheets/160 cost, exact metric conversion, invalid area, copy and print passed');
  // Content and formulas must be available without client-side JavaScript.
  const noJsContext=await browser.newContext({javaScriptEnabled:false});
  const noJs=await noJsContext.newPage();
  for(const id of ids) {
    await noJs.goto(`${origin}/tools/${id}`);
    assert.equal(await noJs.locator('h1').count(),1);
    assert.ok(await noJs.locator('.construction-guide-paragraph').count()>=3);
    assert.ok(await noJs.locator('.construction-formulas li').count()>=4);
    assert.ok(await noJs.locator('.tool-faq details').count()>=4);
    assert.ok((await noJs.locator('#tool-examples').innerText()).includes('Input'));
    assert.ok((await noJs.locator('body').innerText()).includes('Enable JavaScript'));
  }
  await noJsContext.close();
  assert.equal(new Set(seo.map(s=>s.title)).size,5);
  assert.equal(new Set(seo.map(s=>s.description)).size,5);
  await writeFile(path.join(output,'seo.json'),JSON.stringify(seo,null,2));
  results.push('Unique metadata, one brand suffix, canonicals, schema, crawlable section anchors and JavaScript-disabled content passed');
  assert.deepEqual(errors,[]);
  results.push('No browser JavaScript errors');
  await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));
  console.log(results.join('\n'));
} finally { await browser.close(); }
