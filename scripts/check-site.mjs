import assert from "node:assert/strict";
import { tools, getPublishedTools, getAvailableCategories, isSearchIndexEligible } from "../src/data/tools/registry.ts";

const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3104";
const htmlCache = new Map();
async function page(path) {
  if (!htmlCache.has(path)) {
    const response = await fetch(new URL(path, origin));
    assert.equal(response.status, 200, `${path} must return 200`);
    htmlCache.set(path, await response.text());
  }
  return htmlCache.get(path);
}

const sitemap = await page("/sitemap.xml");
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]));
const published = getPublishedTools();
const sitemapTools = published.filter(isSearchIndexEligible);
assert.equal(urls.length, 15 + getAvailableCategories().length + sitemapTools.length, "Only eligible content pages, categories and tools belong in the sitemap");
assert.equal(new Set(urls.map((url) => url.href)).size, urls.length);
assert.equal(urls.filter((url) => url.pathname.startsWith("/tools/category/")).length, getAvailableCategories().length);
const titles = new Set();
const descriptions = new Set();
let checkedLinks = 0;
for (const url of urls) {
  const html = await page(url.pathname);
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(title && description, `${url.pathname}: metadata missing`);
  assert.ok(!titles.has(title) && !descriptions.has(description), "Page metadata must be unique");
  titles.add(title); descriptions.add(description);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.equal(new URL(canonical).href, url.href);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /property="og:title"/);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
  assert.match(html, /<html lang="en"/);
  assert.match(html, /id="main-content"/);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
  assert.ok(schemas.some((item) => item["@type"] === (url.pathname === "/" ? "WebSite" : "BreadcrumbList")));
  if (url.pathname !== "/") {
    const breadcrumbs = schemas.find((item) => item["@type"] === "BreadcrumbList")?.itemListElement;
    assert.ok(Array.isArray(breadcrumbs) && breadcrumbs.length > 0, `${url.pathname}: breadcrumb structured data missing`);
    assert.deepEqual(breadcrumbs.map((item) => item.position), breadcrumbs.map((_, index) => index + 1));
    assert.equal(breadcrumbs.at(-1).item, url.href, `${url.pathname}: breadcrumb URL mismatch`);
  }
  const tool = published.find((item) => item.href === url.pathname);
  if (tool) {
    const application = schemas.find((item) => ["WebApplication", "SoftwareApplication"].includes(item["@type"]) && item.name === tool.name);
    assert.ok(application, `${tool.id}: application structured data missing`);
    assert.equal(application.description, tool.description, `${tool.id}: structured-data description mismatch`);
    assert.equal(application.url, url.href, `${tool.id}: structured-data URL mismatch`);
    assert.equal(application.isAccessibleForFree, true);
    assert.ok(!("aggregateRating" in application) && !("review" in application), "Unverified ratings and reviews are not claimed");
    assert.ok(!schemas.some((item) => item["@type"] === "FAQPage"), "FAQPage structured data is not used");
    if (tool.id.startsWith("bhutan-")) {
      assert.match(html, /bhutan-tool utility-tool/);
      assert.match(html, /Calculation rules and sources/);
    } else if (["nepali-date-converter", "nepal-land-area-converter", "nepal-neb-gpa-calculator"].includes(tool.id)) {
      assert.match(html, /nepal-tool utility-tool/);
      assert.match(html, /Calculation rules and sources/);
    } else if (["pakistan-gpa-calculator", "pakistan-postal-code-finder", "pakistan-zakat-calculator", "tola-to-gram-converter"].includes(tool.id)) {
      assert.match(html, /Practical questions/);
      assert.match(html, tool.id === "tola-to-gram-converter" ? /id="converter-value"/ : /pakistan-tool utility-tool/);
    } else if (["india-pin-code-finder", "ifsc-code-finder", "photo-signature-resizer", "age-calculator", "cgpa-to-percentage"].includes(tool.id)) {
      assert.match(html, /india-tool utility-tool/);
      assert.match(html, /Questions before you use the result/);
    } else if (tool.category === "construction-calculators") {
      assert.match(html, /class="construction-calculator"/);
      assert.match(html, /Calculation explanation/);
    } else if (["developer-tools", "image-tools"].includes(tool.category)) {
      assert.match(html, /class="utility-tool"/);
      assert.match(html, /Privacy and limitations|XML mapping, security and limitations/);
    } else if (tool.category !== "unit-converters") {
      assert.match(html, /class="financial-calculator"/);
      assert.match(html, /Calculation explanation/);
    } else {
      assert.match(html, /id="converter-value"/);
      assert.match(html, /Conversion formula/);
    }
    assert.match(html, /Practical examples/);
    assert.match(html, /Related tools/);
    const relatedSection = html.split('<h2>Related tools</h2>')[1]?.split('</section>')[0];
    assert.ok(relatedSection, `${tool.id}: related tools missing`);
    const relatedLinks = [...relatedSection.matchAll(/href="([^"#]+)"/g)].map(match=>match[1]).filter(href=>href.startsWith("/tools/")&&!href.startsWith("/tools/category/"));
    assert.ok(new Set(relatedLinks).size <= 4);
    assert.ok(relatedLinks.every(href=>href!==tool.href && published.some(item=>item.href===href)));

  }
  for (const [, rawHref] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const target = new URL(rawHref.replaceAll("&amp;", "&"), new URL(url.pathname, origin));
    if (target.origin !== origin) continue;
    const targetHtml = await page(target.pathname + target.search);
    if (target.hash) assert.ok(targetHtml.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), `Missing anchor ${rawHref}`);
    checkedLinks++;
  }
}
const queryPage = await page("/tools?q=JSON");
assert.match(queryPage, /JSON Formatter/);
assert.ok(!queryPage.includes("<h3>Merge PDF</h3>"));
const planned = tools.filter((tool) => tool.status === "planned");
for (const { id } of planned) {
  assert.equal((await fetch(new URL(`/tools/${id}`, origin))).status, 404, `Planned tool ${id} must not have a page`);
  assert.ok(!urls.some((url) => url.pathname === `/tools/${id}`));
}
for (const tool of published) {
  const isIncluded = urls.some((url) => url.pathname === tool.href);
  assert.equal(isIncluded, isSearchIndexEligible(tool), `${tool.id}: sitemap eligibility mismatch`);
  if (!isSearchIndexEligible(tool)) {
    const html = await page(tool.href);
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    const canonical = new URL(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]).href;
    assert.equal(new URL(canonical).pathname, tool.href);
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(title && description, `${tool.href}: metadata missing`);
    assert.ok(!titles.has(title) && !descriptions.has(description), `${tool.id}: metadata must remain unique`);
    titles.add(title);
    descriptions.add(description);
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    const application = schemas.find((item) => ["WebApplication", "SoftwareApplication"].includes(item["@type"]) && item.name === tool.name);
    assert.equal(application?.description, tool.description);
    assert.equal(application?.url, canonical);
    assert.ok(schemas.some((item) => item["@type"] === "BreadcrumbList" && item.itemListElement.at(-1).item === canonical));
  }
}
assert.equal((await fetch(new URL("/tools/length-converter/meters-to-feet", origin))).status, 404, "No thin conversion-pair pages");
for (const path of ["/api", "/api/unit-conversion", "/apis/unit-conversion", "/tools/category/unknown"]) {
  assert.equal((await fetch(new URL(path, origin))).status, 404, `${path} must not be published`);
}
assert.match(await page("/robots.txt"), /Disallow: \/(?:\r?\n|$)/);
const apiPage = await page("/apis");
assert.match(apiPage, /API playground/);
assert.match(apiPage, /Send Request/);
assert.match(apiPage, /Implemented; launch pending/);
for (const id of ["countries", "states", "cities", "users", "products"]) {
  assert.ok(urls.some(url => url.pathname === `/apis/docs/${id}`));
  const doc = await page(`/apis/docs/${id}`);
  assert.match(doc, /TechArticle/);
  assert.match(doc, /Example JSON response/);
  assert.match(doc, /Access and rate limits/);
  const queryDoc = await page(`/apis/docs/${id}?page=2&limit=1`);
  assert.ok(queryDoc.includes(`rel="canonical" href="${urls.find(url => url.pathname === `/apis/docs/${id}`).href}"`));
}

assert.ok(!urls.some(url=>url.pathname==='/tools/category/pdf-tools'));
assert.match((await page('/tools/category/pdf-tools')).replaceAll('<!-- -->',''), /No pdf tools are available yet/);
assert.match(await page('/contact'), /mailto:contact.techideaonline@gmail.com/);
const home = await page('/');
assert.match(home, new RegExp(`${published.length}(?:<!-- -->)? tools are ready`));
assert.ok(!home.includes('href="/tools/category/pdf-tools"'));
const featured = home.split('id="popular-title"')[1]?.split('</section>')[0];
assert.ok(featured && !featured.includes('Planned'));
console.log(`PASS: ${urls.length} sitemap pages, unique metadata, canonical URLs, global and page-specific noindex, structured data, ${checkedLinks} internal links/anchors, server search, ${published.length} working tools, ${planned.length} unpublished tools, API guards and sitemap exclusions.`);
