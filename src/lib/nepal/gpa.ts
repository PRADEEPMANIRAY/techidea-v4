import {calculateGpa,type Course,type Grade} from '../pakistan/gpa.ts';
export type Subject={id:string;name:string;credits:string;gradeId:string};
// Custom illustration only. Deliberately not labelled as an official NEB scale.
export const customNepalGrades:Grade[]=[{id:'a',label:'A',points:'4'},{id:'b',label:'B',points:'3'},{id:'c',label:'C',points:'2'},{id:'d',label:'D',points:'1'},{id:'f',label:'F',points:'0'}];
export function calculateNepalGpa(subjects:Subject[],grades:Grade[],maximum:string){
 if(grades.some(g=>g.label.trim().toUpperCase()==='NG'))throw new Error('NG cannot be assigned numeric points in this calculator.');
 if(subjects.some(s=>s.gradeId==='NG'))throw new Error('NG is not a numeric grade. This custom calculator cannot determine an official GPA for an NG record.');
 const courses:Course[]=subjects.map(s=>({...s,excluded:false}));
 return calculateGpa([{id:'nepal',name:'Custom subject calculation',courses}],grades,maximum);
}
