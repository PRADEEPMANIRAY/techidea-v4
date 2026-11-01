import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adToBs,bsToAd,convertDate,monthDays,BS_MIN,BS_MAX,AD_MIN,AD_MAX,CALENDAR_DAYS,bsMonths,dateIso} from '../src/lib/nepal/calendar.ts';
import {bsMonthLengths} from '../src/data/nepal/bs-months.ts';
import {convertLand,combinedLand,allLandEquivalents,formatLand,landUnits,landNumber} from '../src/lib/nepal/land.ts';
import {calculateNepalGpa,customNepalGrades} from '../src/lib/nepal/gpa.ts';
import {gpaIssue} from '../src/lib/nepal/gpa-feedback.ts';
import {nepalTools} from '../src/data/tools/nepal.ts';
import {getPublishedTools} from '../src/data/tools/registry.ts';
const d=(year,month,day)=>({year,month,day});
// Independent published references: Nepal Embassy Cairo 2083 holiday list,
// NTA Baisakh/Jestha/Asar 2081 reporting periods and government constitution date.
const referencePairs=[
 [d(2083,1,1),d(2026,4,14)],[d(2083,2,12),d(2026,5,26)],[d(2083,3,3),d(2026,6,17)],
 [d(2083,4,7),d(2026,7,23)],[d(2083,5,10),d(2026,8,26)],[d(2083,6,20),d(2026,10,6)],
 [d(2083,7,4),d(2026,10,21)],[d(2083,7,25),d(2026,11,11)],[d(2083,12,7),d(2027,3,21)],
 [d(2081,1,1),d(2024,4,13)],[d(2081,1,31),d(2024,5,13)],[d(2081,2,1),d(2024,5,14)],
 [d(2081,3,1),d(2024,6,15)],[d(2072,6,3),d(2015,9,20)],
];
for(const [bs,ad] of referencePairs){test(`published BS ${dateIso(bs)} to AD`,()=>assert.deepEqual(bsToAd(bs),ad));test(`published AD ${dateIso(ad)} to BS`,()=>assert.deepEqual(adToBs(ad),bs));}
test('all 30,681 supported days round-trip without gaps or rollover',()=>{let count=0;const start=Date.UTC(1943,3,14);for(let year=BS_MIN;year<=BS_MAX;year++)for(let month=1;month<=12;month++)for(let day=1;day<=bsMonthLengths[year][month-1];day++){const bs=d(year,month,day),ad=bsToAd(bs);assert.equal(Date.UTC(ad.year,ad.month-1,ad.day),start+count*86400000);assert.deepEqual(adToBs(ad),bs);count++;}assert.equal(count,CALENDAR_DAYS);assert.equal(count,30681);});
test('calendar exact supported boundaries',()=>{assert.equal(dateIso(bsToAd(d(2000,1,1))),AD_MIN);assert.equal(dateIso(bsToAd(d(2083,12,30))),AD_MAX);assert.equal(AD_MAX,'2027-04-13');assert.deepEqual(adToBs(d(1943,4,14)),d(2000,1,1));assert.deepEqual(adToBs(d(2027,4,13)),d(2083,12,30));});
test('Gregorian leap day 2024 round trip',()=>assert.deepEqual(bsToAd(adToBs(d(2024,2,29))),d(2024,2,29)));
test('Gregorian century leap day 2000 accepted',()=>assert.equal(monthDays('AD',2000,2),29));
test('Gregorian ordinary year February has 28 days',()=>assert.equal(monthDays('AD',2023,2),28));
test('BS months vary across years',()=>{assert.equal(monthDays('BS',2000,1),30);assert.equal(monthDays('BS',2001,1),31);assert.equal(monthDays('BS',2000,2),32);assert.equal(monthDays('BS',2000,9),29);});
for(const [kind,date] of [['BS',d(1999,12,30)],['BS',d(2084,1,1)],['BS',d(2000,1,31)],['BS',d(2000,9,30)],['BS',d(2083,12,31)],['BS',d(2083,0,1)],['BS',d(2083,13,1)],['BS',d(2083,1,0)],['BS',d(2083,1,1.5)],['BS',d(NaN,1,1)],['AD',d(1943,4,13)],['AD',d(2027,4,14)],['AD',d(2023,2,29)],['AD',d(2024,4,31)],['AD',d(2024,1,Infinity)],['invalid',d(2024,1,1)]])test(`date rejects ${kind} ${JSON.stringify(date)}`,()=>assert.throws(()=>convertDate(kind,date)));
test('Nepali month labels and license preserved',()=>{assert.equal(bsMonths.length,12);assert.match(bsMonths[0],/बैशाख/);assert.match(readFileSync(new URL('../public/licenses/nepali-date-MIT.txt',import.meta.url),'utf8'),/Copyright \(c\) 2020 Subesh Bhandari/);});
const expectedSquareFeet={ropani:5476,aana:342.25,paisa:85.5625,daam:21.390625,ft2:1,m2:1/0.09290304,yd2:9};
for(const from of landUnits)for(const to of landUnits)test(`land ${from.id} to ${to.id}`,()=>{const expected=expectedSquareFeet[from.id]/expectedSquareFeet[to.id];assert.ok(Math.abs(convertLand('1',from.id,to.id)-expected)<=Math.max(1e-12,Math.abs(expected)*1e-13));});
test('combined 2-5-3-2 uses common base without intermediate rounding',()=>{assert.equal(combinedLand(['2','5','3','2']),12962.71875);assert.equal(combinedLand(['2','5','3','2'])/5476,2.3671875);});
test('combined decimal components accepted',()=>assert.equal(combinedLand(['0.5','0.5','0.5','0.5']),2962.6015625));
test('combined overflow components are additive quantities',()=>assert.equal(combinedLand(['0','16','4','4']),5903.8125));
test('zero area returns zero for every unit',()=>assert.ok(allLandEquivalents(0).every(row=>row.value===0)));
test('one Ropani metric conversion retains precision',()=>assert.ok(Math.abs(allLandEquivalents(5476).find(row=>row.id==='m2').value-508.73704704)<1e-10));
test('all land units reverse within decimal input resolution',()=>{for(const unit of landUnits){const forward=convertLand('1.25','ropani',unit.id);const back=convertLand(forward.toFixed(8),unit.id,'ropani');assert.ok(Math.abs(back-1.25)<1e-8,unit.id);}});
test('large allowed area remains finite',()=>assert.ok(Number.isFinite(convertLand('1000000000000','ropani','daam'))));
test('land precision changes display only',()=>{assert.equal(formatLand(508.73704704,2),'508.74');assert.equal(formatLand(508.73704704,8),'508.73704704');});
for(const value of ['','-1','-0','NaN','Infinity','1e3','1,000','1000000000001','0.000000001','1 sq ft'])test(`land rejects ${value}`,()=>assert.throws(()=>landNumber(value)));
for(const p of [-1,9,1.5,NaN])test(`land precision rejects ${p}`,()=>assert.throws(()=>formatLand(1,p)));
test('combined input rejects missing or negative components',()=>{assert.throws(()=>combinedLand(['1','0','0']));assert.throws(()=>combinedLand(['1','0','-1','0']));});
test('unknown land unit rejected',()=>assert.throws(()=>convertLand('1','bigha','ropani')));
const subject=(gradeId='a',credits='3')=>({id:'s',name:'Subject',gradeId,credits});
const gpa=(subjects,grades=customNepalGrades,max='4')=>calculateNepalGpa(subjects,grades,max);
test('custom Nepal GPA weighted subjects',()=>{const r=gpa([subject('a','3'),subject('b','1')]);assert.equal(r.cgpa,3.75);assert.equal(r.totalQualityPoints,15);});
test('custom decimal grade mapping',()=>assert.equal(gpa([subject('x','2'),subject('y','3')],[{id:'x',label:'X',points:'3.6'},{id:'y',label:'Y',points:'3.2'}]).cgpa,3.36));
test('custom five-point maximum',()=>assert.equal(gpa([subject('x','2'),subject('y','3')],[{id:'x',label:'X',points:'5'},{id:'y',label:'Y',points:'4'}],'5').cgpa,4.4));
test('multiple equal-credit subjects',()=>assert.equal(gpa([subject('a','1'),subject('b','1'),subject('c','1')]).cgpa,3));
test('zero grade points remain weighted',()=>assert.equal(gpa([subject('a','3'),subject('f','3')]).cgpa,2));
test('Nepal GPA points invalid credit input to its subject field',()=>{const issue=gpaIssue(new Error('Semester 1, course 1 credits: enter a nonnegative number with at most two decimal places.'),[subject()],customNepalGrades);assert.equal(issue.field,'nepal-subject-s-credits');assert.match(issue.message,/Subject 1 credits:/);});
test('Nepal GPA points invalid grade selection to its subject field',()=>{const issue=gpaIssue(new Error('Semester 1, course 1: choose a grade from your configured scale.'),[subject()],customNepalGrades);assert.equal(issue.field,'nepal-subject-s-grade');assert.match(issue.message,/Subject 1 grade:/);});
test('Nepal GPA identifies duplicate custom grade labels',()=>{const grades=[{id:'a',label:'A',points:'4'},{id:'b',label:'a',points:'3'}],issue=gpaIssue(new Error('Grade names must be unique, nonempty and at most 12 characters.'),[subject()],grades);assert.equal(issue.field,'nepal-grade-b-label');assert.match(issue.message,/Custom grade 2 label must be unique/);});
test('Nepal GPA identifies points above the configured maximum',()=>{const issue=gpaIssue(new Error('Grade A exceeds the scale maximum.'),[subject()],customNepalGrades);assert.equal(issue.field,'nepal-grade-a-points');assert.match(issue.message,/Custom grade A points must not exceed/);});
test('Nepal GPA ties all-zero-credit validation to a credit field',()=>{const issue=gpaIssue(new Error('Include at least one course with positive credits.'),[subject('a','0')],customNepalGrades);assert.equal(issue.field,'nepal-subject-s-credits');assert.match(issue.message,/positive credit hours/);});
test('Nepal GPA associates invalid maximum with its policy field',()=>{const issue=gpaIssue(new Error('Scale maximum: enter a nonnegative number with at most two decimal places.'),[subject()],customNepalGrades);assert.equal(issue.field,'nepal-maximum');assert.match(issue.message,/Maximum grade point:/);});
for(const [label,subjects,grades,max] of [['NG',[subject('NG')],customNepalGrades,'4'],['unknown grade',[subject('z')],customNepalGrades,'4'],['no subjects',[],customNepalGrades,'4'],['zero credits',[subject('a','0')],customNepalGrades,'4'],['negative credits',[subject('a','-1')],customNepalGrades,'4'],['too many subjects',Array(31).fill(subject()),customNepalGrades,'4'],['points above maximum',[subject()],customNepalGrades,'3'],['NG custom label',[subject('ng')],[{id:'ng',label:'NG',points:'0'},{id:'a',label:'A',points:'4'}],'4']])test(`Nepal GPA rejects ${label}`,()=>assert.throws(()=>gpa(subjects,grades,max)));
for(const tool of nepalTools)test(`registered Nepal page ${tool.id}`,()=>{assert.ok(getPublishedTools().some(t=>t.id===tool.id));assert.equal(tool.examples.length,3);assert.equal(tool.faqs.length,3);assert.ok(tool.intro.length>100);});
test('all previous 29 tools retained and three added',()=>{assert.equal(getPublishedTools().filter(t=>!t.id.startsWith('bhutan-')).length,32);assert.equal(getPublishedTools().filter(t=>!t.id.startsWith('bhutan-')&&!nepalTools.some(n=>n.id===t.id)).length,29);});
test('custom mode is explicit in NEB tool metadata',()=>assert.match(nepalTools.find(t=>t.id==='nepal-neb-gpa-calculator').name,/Custom Grading/));
test('date selectors and mobile rules exist',()=>{const jsx=readFileSync(new URL('../src/components/tools/nepali-date.tsx',import.meta.url),'utf8'),css=readFileSync(new URL('../src/styles/nepal-tools.css',import.meta.url),'utf8');assert.match(jsx,/Year \(/);assert.match(jsx,/Month \(/);assert.match(jsx,/Day \(/);assert.match(css,/@media\(max-width:600px\)/);assert.match(css,/:focus-visible/);});
