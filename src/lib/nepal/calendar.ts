import {bsMonthLengths} from '../../data/nepal/bs-months.ts';
export type CalendarDate={year:number;month:number;day:number};
export type CalendarKind='BS'|'AD';
export const BS_MIN=2000,BS_MAX=2083;
export const calendarSource={url:'https://github.com/subeshb1/Nepali-Date/tree/f14e039965ec50ebe0a5954b5eff006957238b9e',commit:'f14e039965ec50ebe0a5954b5eff006957238b9e',sourceSha256:'8a22f2494a937195c34eb9b777115ae4c3ddbfdfe6662971e32ee262c7a7c831',license:'/licenses/nepali-date-MIT.txt'};
export const bsMonths=['Baisakh / बैशाख','Jestha / जेठ','Asar / असार','Shrawan / श्रावण','Bhadra / भाद्र','Aswin / आश्विन','Kartik / कार्तिक','Mangsir / मंसिर','Poush / पौष','Magh / माघ','Falgun / फाल्गुण','Chaitra / चैत्र'] as const;
export const adMonths=['January','February','March','April','May','June','July','August','September','October','November','December'] as const;
const DAY=86400000,anchor=Date.UTC(1943,3,14);
const years:number[]=[];let count=0;
for(let year=BS_MIN;year<=BS_MAX;year++){years.push(count);const months=bsMonthLengths[year];if(months?.length!==12||months.some(days=>!Number.isInteger(days)||days<29||days>32))throw new Error('Invalid bundled BS month table.');count+=months.reduce((sum,n)=>sum+n,0);}
export const CALENDAR_DAYS=count;
export const AD_MIN='1943-04-14',AD_MAX=new Date(anchor+(count-1)*DAY).toISOString().slice(0,10);
export function monthDays(kind:CalendarKind,year:number,month:number){
 if(!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12)throw new Error('Choose a whole-number year and a month from 1 to 12.');
 if(kind==='BS'){if(year<BS_MIN||year>BS_MAX)throw new Error(`Supported BS years are ${BS_MIN}–${BS_MAX}.`);return bsMonthLengths[year][month-1];}
 if(kind!=='AD'||year<1943||year>2027)throw new Error(`Supported AD dates are ${AD_MIN} through ${AD_MAX}.`);
 return new Date(Date.UTC(year,month,0)).getUTCDate();
}
function validate(kind:CalendarKind,value:CalendarDate){const max=monthDays(kind,value.year,value.month);if(!Number.isInteger(value.day)||value.day<1||value.day>max)throw new Error(`This ${kind} month has ${max} days. Choose a valid day.`);}
export function bsToAd(value:CalendarDate):CalendarDate{
 validate('BS',value);let offset=years[value.year-BS_MIN]+value.day-1;
 for(let m=0;m<value.month-1;m++)offset+=bsMonthLengths[value.year][m];
 const date=new Date(anchor+offset*DAY);return {year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate()};
}
export function adToBs(value:CalendarDate):CalendarDate{
 validate('AD',value);let offset=(Date.UTC(value.year,value.month-1,value.day)-anchor)/DAY;
 if(offset<0||offset>=count)throw new Error(`Supported AD dates are ${AD_MIN} through ${AD_MAX}. No conversion is available outside this range.`);
 let index=0;while(index+1<years.length&&years[index+1]<=offset)index++;
 offset-=years[index];const year=BS_MIN+index;let month=1;
 while(offset>=bsMonthLengths[year][month-1]){offset-=bsMonthLengths[year][month-1];month++;}
 return {year,month,day:offset+1};
}
export function convertDate(kind:CalendarKind,value:CalendarDate){if(kind==='BS')return bsToAd(value);if(kind==='AD')return adToBs(value);throw new Error('Choose BS or AD.');}
export const dateIso=(value:CalendarDate)=>`${value.year}-${String(value.month).padStart(2,'0')}-${String(value.day).padStart(2,'0')}`;
export const formatCalendarDate=(kind:CalendarKind,value:CalendarDate)=>`${value.day} ${(kind==='BS'?bsMonths:adMonths)[value.month-1]} ${value.year} ${kind}`;
