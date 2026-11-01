"""Offline, pinned, reproducible import. Never called by an API request."""
import hashlib,json,re,urllib.request
from pathlib import Path
REVISION='a5078ba91302953cf17ff39c683344e09072c2f8'
BASE=f'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/{REVISION}/'
ROOT=Path(__file__).resolve().parents[1]/'public'/'datasets'/'v1'
ROOT.mkdir(parents=True,exist_ok=True)
sources={}
def fetch(name):
 with urllib.request.urlopen(BASE+name,timeout=120) as response:raw=response.read(70*1024*1024)
 sources[name]={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
 return raw
countries_source=json.loads(fetch('json/countries.json'))
states_source=json.loads(fetch('json/states.json'))
world=json.loads(fetch('json/countries+states+cities.json'))
license_text=fetch('LICENSE')
assert b'Open Database License' in license_text
countries=[{'name':r['name'],'code':r['iso2'],'alpha3':r['iso3'] or None,'currencyCode':r.get('currency') or None,'callingCode':r.get('phonecode') or None} for r in countries_source if r['iso2']!='XK']
assert len(countries)==249 and all(re.fullmatch('[A-Z]{2}',r['code']) and re.fullmatch('[A-Z]{3}',r['alpha3']) for r in countries)
codes={r['code'] for r in countries}
states=[{'id':'csc-state-'+str(r['id']),'countryCode':r['country_code'],'name':r['name'],'code':r.get('iso2') or None,'type':r.get('type') or None,'level':str(r['level']) if r.get('level') is not None else None} for r in states_source if r['country_code'] in codes]
assert len({(r['countryCode'],r['code']) for r in states})==len(states)
india=next(r for r in world if r['iso2']=='IN')
cities=[{'id':'csc-city-'+str(c['id']),'countryCode':'IN','stateCode':s['iso2'],'name':c['name']} for s in india['states'] for c in s['cities']]
assert len({r['id'] for r in cities})==len(cities)
assert all(any(s['countryCode']=='IN' and s['code']==c['stateCode'] for s in states) for c in cities)
countries.sort(key=lambda r:r['code']);states.sort(key=lambda r:(r['countryCode'],r['name'].casefold(),r['id']));cities.sort(key=lambda r:(r['stateCode'],r['name'].casefold(),r['id']))
outputs={}
def write(name,data):
 raw=(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8');(ROOT/name).write_bytes(raw);outputs[name]={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
write('countries.json',countries);write('states.json',states);write('cities-IN.json',cities)
(ROOT/'LICENSE.txt').write_bytes(license_text)
manifest={'source':'https://github.com/dr5hn/countries-states-cities-database','revision':REVISION,'license':'ODbL-1.0','licenseUrl':'https://opendatacommons.org/licenses/odbl/1-0/','attribution':'Countries States Cities Database by Darshan Gada and contributors; adapted by TechIdea.','adaptationLicense':'ODbL-1.0','countryCount':len(countries),'stateCount':len(states),'cityCount':len(cities),'cityCountries':['IN'],'cityStateCodes':sorted({c['stateCode'] for c in cities}),'limitations':['Countries include territories; upstream XK/XKX is omitted because it is not an assigned ISO 3166-1 code.','Subdivisions include multiple administrative levels and retain upstream codes, which may differ from current ISO subdivision codes. Null or empty coverage is not evidence that no subdivisions exist.','City coverage is limited to the source records assigned to Indian states. It includes some districts/localities, is incomplete even within India and is not an address, legal-boundary or geocoding authority.','Country-level cities without a state assignment are excluded. IDs are upstream IDs prefixed by entity type; stability is guaranteed only within this pinned snapshot.'],'sources':sources,'files':outputs}
write('manifest.json',manifest)
print(json.dumps({'countries':len(countries),'states':len(states),'cities':len(cities),'outputBytes':sum(v['bytes'] for v in outputs.values()),'largestFile':max(v['bytes'] for v in outputs.values()),'revision':REVISION}))
