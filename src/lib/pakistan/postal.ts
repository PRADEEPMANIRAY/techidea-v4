import { pakistanPostalRecords } from '../../data/pakistan/postal.ts';
export function searchPakistanPostal(input: string, mode:'code'|'name') {
  const query=input.trim();
  if (!query || query.length>80 || /[\u0000-\u001f\u007f]/.test(query)) throw new Error('Enter a search of 1–80 characters without control characters.');
  if (mode==='code') {
    if (!/^\d{5}$/.test(query)) throw new Error('Enter exactly five postal-code digits. Keep any leading zero.');
    return pakistanPostalRecords.filter(row=>row.code===query);
  }
  if (mode!=='name') throw new Error('Choose postal code or office/city name.');
  if (query.length<2) throw new Error('Enter at least two characters of an office or city name.');
  const normalized=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('en').replace(/[.\s-]+/g,' ').trim();
  const needle=normalized(query);
  if (!needle) throw new Error('Enter an office or city name.');
  return pakistanPostalRecords.filter(row=>normalized(`${row.office} ${row.accountOffice}`).includes(needle));
}
