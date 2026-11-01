export type Grade = { id: string; label: string; points: string };
export type Course = { id: string; name: string; credits: string; gradeId: string; excluded: boolean };
export type Semester = { id: string; name: string; courses: Course[] };
export const MAX_SEMESTERS = 12, MAX_COURSES = 30;
// Illustrative editable scale, not attributed to any university.
export const exampleGrades: Grade[] = [{id:'a',label:'A',points:'4'},{id:'b',label:'B',points:'3'},{id:'c',label:'C',points:'2'},{id:'d',label:'D',points:'1'},{id:'f',label:'F',points:'0'}];
export function hundredths(raw: string, label: string, max: number, allowZero = true) {
  if (raw.length > 20 || !/^\d+(?:\.\d{1,2})?$/.test(raw.trim())) throw new Error(`${label}: enter a nonnegative number with at most two decimal places.`);
  const [whole, fraction = ''] = raw.trim().split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result > max * 100 || (!allowZero && result === 0)) throw new Error(`${label}: use ${allowZero ? '0' : 'a value above 0'} to ${max}.`);
  return result;
}
export function calculateGpa(semesters: Semester[], grades: Grade[], maximum: string) {
  const scale = hundredths(maximum, 'Scale maximum', 10, false);
  if (grades.length < 2 || grades.length > 20) throw new Error('Use 2–20 grading entries.');
  const ids = new Set<string>(), labels = new Set<string>(), points = new Map<string,number>();
  for (const grade of grades) {
    const label = grade.label.trim().toUpperCase();
    if (!grade.id || ids.has(grade.id) || !label || label.length > 12 || labels.has(label)) throw new Error('Grade names must be unique, nonempty and at most 12 characters.');
    const value = hundredths(grade.points, `Grade ${label}`, 10);
    if (value > scale) throw new Error(`Grade ${label} exceeds the scale maximum.`);
    ids.add(grade.id); labels.add(label); points.set(grade.id,value);
  }
  if (!semesters.length || semesters.length > MAX_SEMESTERS) throw new Error('Use 1–12 semesters.');
  let totalCredits = 0, totalQuality = 0;
  const rows = semesters.map((semester, si) => {
    if (semester.name.length > 80 || !semester.courses.length || semester.courses.length > MAX_COURSES) throw new Error(`Semester ${si+1}: use 1–30 courses and a name of at most 80 characters.`);
    let credits = 0, quality = 0;
    const courses = semester.courses.map((course, ci) => {
      const label = `Semester ${si+1}, course ${ci+1}`;
      if (course.name.length > 80 || typeof course.excluded !== 'boolean') throw new Error(`${label}: invalid name or inclusion setting.`);
      const creditUnits = hundredths(course.credits, `${label} credits`, 30, course.excluded);
      const gradePoints = course.excluded ? 0 : points.get(course.gradeId);
      if (gradePoints === undefined) throw new Error(`${label}: choose a grade from your configured scale.`);
      const qualityUnits = course.excluded ? 0 : creditUnits * gradePoints;
      if (!course.excluded) { credits += creditUnits; quality += qualityUnits; }
      return { name: course.name.trim() || `Course ${ci+1}`, credits: creditUnits / 100, gradePoints: gradePoints / 100, qualityPoints: qualityUnits / 10000, excluded: course.excluded };
    });
    totalCredits += credits; totalQuality += quality;
    return { name: semester.name.trim() || `Semester ${si+1}`, credits: credits / 100, qualityPoints: quality / 10000, gpa: credits ? quality / credits / 100 : null, courses };
  });
  if (!totalCredits) throw new Error('Include at least one course with positive credits.');
  return { semesters: rows, totalCredits: totalCredits / 100, totalQualityPoints: totalQuality / 10000, cgpa: totalQuality / totalCredits / 100, maximum: scale / 100 };
}
