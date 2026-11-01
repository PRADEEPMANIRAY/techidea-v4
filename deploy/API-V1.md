# API v1 — implementation and launch requirements

Backend only, not deployed. The existing API directory/playground remains a launch preview.

## Contract

GET /api/v1/countries: optional `search` (name/alpha-2/alpha-3, case/accent-insensitive substring).
GET /api/v1/states: required `country` (alpha-2).
GET /api/v1/cities: required `country` and `state` (code from the states response), optional `search`, `page`, `limit`.
GET /api/v1/sample/users: optional `seed`, `page`, `limit`.
GET /api/v1/sample/products: optional `seed`, `category`, `page`, `limit`.

Countries/states return `{success:true,data,meta}`. Cities/samples additionally include
`pagination:{page,limit,total,totalPages}`. Defaults: page 1, limit 20; maximum limit 100,
page 10000. Pages beyond the last page return an empty array with the actual total.
Search is at most 100 characters. Country/state codes are case-insensitive. Unknown or
repeated parameters, invalid codes and non-integer pagination return 400. Missing required
parameters return 400. Search uses literal matching, not regex or SQL. URL limit: 2,048 characters.

Seeds: 1–64 ASCII letters/digits/underscore/hyphen, default `techidea-v1`. There are 200
fictional users and 200 fictional products per seed. IDs and ordering are fixed; seeds
change country/role/status or prices/stock. Product categories: electronics, stationery,
home, outdoors, apparel. Prices are demonstration USD amounts; user emails use example.com.
No real personal/customer/product records are used. Synthetic-data algorithms are versioned
with this API; changing their output requires a version decision.

Errors: `{success:false,error:{code,message}}`. Status codes include 400 validation,
403 disallowed origin, 405 method, 413 body, 414 URL, 429 limit (with Retry-After),
500 safe internal/response-size error and 503 unavailable/gateway configuration.
HEAD returns GET headers with no body. OPTIONS supports GET/HEAD preflight and Accept/
Content-Type headers. No authentication cookies or credentials are accepted by CORS.
Default CORS is `*` for anonymous public reads; exact origin allowlists are configurable.
CORS is a browser policy, not client authentication. All responses are no-store; data
files are cached internally. JSON responses have nosniff, restrictive CSP and noindex.
Request bodies are rejected. Maximum serialized response defaults to 256 KiB (configurable
1 KiB–1 MiB); excessive output returns a small error instead of a truncated document.

## Data provenance, licensing and coverage

Source: https://github.com/dr5hn/countries-states-cities-database
Pinned revision: a5078ba91302953cf17ff39c683344e09072c2f8.
Source license verified before importing: ODbL 1.0. Attribution: Darshan Gada and contributors.
The adapted location database is also ODbL 1.0; this does not change the application-code license.
The complete adapted database is available as machine-readable files under `/datasets/v1/`:
`countries.json`, `states.json`, `cities-IN.json`; `manifest.json` gives revision, source/output
SHA-256 hashes, counts, field coverage and limitations; `LICENSE.txt` carries the source license.
Every location API response includes attribution and links to this manifest/license.

249 country/territory records, 5,320 subdivisions, 4,335 Indian localities. The upstream
unassigned XK/XKX country code is excluded rather than labeled an assigned ISO code.
Currencies/calling codes are source strings or null, not inferred values. Region codes/types/
levels are upstream values, including legacy codes and multiple administrative levels;
they are not a guarantee of current ISO 3166-2 coverage. Empty subdivisions mean no records
in this snapshot, not proof that a country has none. Names and boundaries are not legal advice.
Cities include only records assigned to Indian states, some describing districts/localities.
No worldwide completeness claim, and no completeness claim within India. A valid unsupported
country/state returns 200, empty data and `coverage.status:not_included`; India is `partial`.
Source numeric identifiers receive `csc-state-`/`csc-city-` prefixes; no cross-version permanence
is promised. Country-level localities lacking a state assignment are not imported.

Size review before import: countries source ~0.5 MB, states ~6.6 MB, combined source ~53 MB.
The offline importer retains only required fields: all three adapted data files total <1 MB;
no global source is stored or loaded by the server. Runtime loads countries/states once and
lazily loads the single ~340 KiB India file once, building a state index. Requests search
only that state's rows and paginate before serializing. Reads are capped at 2 MiB/file;
failed loads are evicted for retry. Runtime performs no external fetches. Deployment must
include public/datasets/v1; Next tracing includes those JSON files. For standalone output,
copy public/ alongside the standalone server as required by Next.js.

Update strategy: review quarterly or when a reported change requires it. Review the upstream
license, schema, code changes and coverage first; deliberately update REVISION in
scripts/import-api-data.py, run `python scripts/import-api-data.py` offline, inspect all
manifest/hash/count/code diffs, then run tests/build before releasing. Never auto-update in
request handlers. Preserve source attribution and offer the adapted files on release.

## Nginx security boundary — deployment is still pending

Use a single VPS Nginx instance with shared-memory limit_req zones. Limits are shared across
Nginx workers and all proxied Next.js workers: default 60 requests/minute/IP with burst 20,
a global 50 requests/second safety budget, and 10 concurrent connections/IP. Bursts use
nodelay. The dataset-download location shares the same request budgets. 429 errors use the
JSON envelope, Retry-After and the configured CORS policy. Limits are operational defaults,
not a guarantee against distributed abuse. Multiple VPS nodes require a shared gateway or
separate coordinated limiter; these zones are local to one Nginx instance.

Set a private cryptographically random API_PROXY_SECRET (32 bytes as 64 lowercase hex chars),
API_RATE_LIMIT_MODE=nginx and the desired environment values from .env.example. Keep secrets
out of source control and public logs. Render each snippet with the same environment:

    node deploy/render-nginx.mjs http > /private/path/techidea-api-http.conf
    node deploy/render-nginx.mjs server > /private/path/techidea-api-server.conf

Protect generated files (contain the proxy secret) with restrictive permissions. Include the
first inside http {}, second inside the existing HTTPS server {}. Rendering does not read
.env files automatically; export the environment through the service manager/deployment shell.
Bind Next to 127.0.0.1:3000, block direct upstream access with the VPS firewall, and ensure no
alternate proxy/location bypasses this gateway. Nginx overwrites the gateway token and client
forwarding headers. The app uses constant-time comparison of a validated fixed-length token;
missing/wrong tokens fail closed with 503. The token is proxy attestation, not a public API key.
The app cannot prove Nginx applied its limits merely because a valid token was supplied.

For a CDN/load balancer, configure real_ip only for its explicitly trusted address ranges;
never trust arbitrary incoming X-Forwarded-For. Otherwise users share the CDN's rate bucket.
Nginx keying is per address (including IPv6 address), so address rotation can evade per-IP
limits; retain the global budget and monitor resource usage. Use existing site TLS settings.
Rate and CORS changes require regenerating snippets and a controlled reload after validation.

Before launch: run nginx -t, verify shared limits with simultaneous requests to multiple Next
workers, check 429/CORS envelopes, prove direct-port/firewall bypass is blocked, check trusted
IP handling and load-test the actual VPS. No nginx executable is available in this workspace,
so Nginx runtime enforcement has NOT been tested here. This is NOT a production-readiness claim.
The in-process LocalLimiter is strictly development-only and production refuses local mode.
Production defaults to disabled until explicitly configured. Do not set indexing true yet.

## Verification

npm test includes all previous tests and API unit/contract/data/security/config-render tests.
API integration checks use a production build and an explicit test-only gateway token in
the local process environment; they are not evidence of Nginx enforcement. Use
`npm run test:api` against TEST_ORIGIN with API_PROXY_SECRET set to the matching local-test
value. `npm run test:api-performance` reports cold/warm timings and process memory deltas.
Site tests continue to enforce noindex and inactive public playground controls.
