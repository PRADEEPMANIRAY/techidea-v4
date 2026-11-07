import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium} = await import(pathToFileURL(process.env.QA_PLAYWRIGHT_PATH).href);
const browser = await chromium.launch({executablePath:process.env.QA_BROWSER_PATH});
try {
  const page = await browser.newPage();
  await page.goto(new URL('/tools/xml-to-json',process.env.TEST_ORIGIN || 'http://127.0.0.1:3104').href);
  const input = page.getByLabel('XML input'), output = page.getByLabel('JSON output');
  const convert = page.getByRole('button',{name:'Convert to JSON',exact:true});
  const download = page.getByRole('button',{name:'Download JSON',exact:true});
  const copy = page.getByRole('button',{name:'Copy result',exact:true});
  for (const valid of [
    '<parsererror id="literal">parsererror</parsererror>',
    '<p:parsererror xmlns:p="http://www.w3.org/1999/xhtml"><p:parsererror/></p:parsererror>',
    '<parsererror xmlns="http://www.mozilla.org/newlayout/xml/parsererror.xml"/>',
    '<r xmlns:parsererror="urn:example"><parsererror:other/><parsererror/></r>',
    '<r a="1">before<i/><i/>after</r>',
  ]) {
    await input.fill(valid); await convert.click();
    const tree = JSON.parse(await output.inputValue());
    assert.ok(tree.name); assert.ok(await download.isEnabled());
    console.log('PASS valid:',valid);
  }
  for (const invalid of ['{bad','<root><child></root>','<parsererror><x></parsererror>','<parsererror></parsererror_>','<a/><b/>','<r a="x" a="y"/>','<!DOCTYPE r><r/>','']) {
    await input.fill(invalid); await convert.click();
    assert.match(await page.locator('#utility-error').innerText(),/malformed XML|DOCTYPE|enter some input/i);
    assert.equal(await page.locator('#utility-error').getAttribute('role'),'alert');
    assert.equal(await input.getAttribute('aria-invalid'),'true');
    assert.equal(await output.inputValue(),''); assert.ok(await download.isDisabled()); assert.ok(await copy.isDisabled());
    assert.ok(!(await page.locator('.interactive-area').innerText()).includes('Result ready.'));
    console.log('PASS rejected; alert present, output empty, exports disabled:',JSON.stringify(invalid));
  }
} finally { await browser.close(); }
