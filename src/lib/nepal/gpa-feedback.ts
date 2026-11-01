import type { Subject } from './gpa.ts';
import type { Grade } from '../pakistan/gpa.ts';

export type GpaIssue = { message: string; field?: string };

// Keep the tested GPA engine authoritative while connecting its errors to editable fields.
export function gpaIssue(error: unknown, subjects: readonly Subject[], grades: readonly Grade[]): GpaIssue {
  const raw = error instanceof Error ? error.message : 'Unable to calculate. Review your grading rule and subjects.';
  if (raw.startsWith('Scale maximum')) return { message: raw.replace('Scale maximum', 'Maximum grade point'), field: 'nepal-maximum' };

  if (raw.startsWith('NG cannot')) {
    const index = grades.findIndex((grade) => grade.label.trim().toUpperCase() === 'NG');
    return index >= 0
      ? { message: `Custom grade ${index + 1} cannot use NG as a numeric label.`, field: `nepal-grade-${grades[index].id}-label` }
      : { message: raw };
  }

  if (raw.startsWith('NG is not')) {
    const index = subjects.findIndex((subject) => subject.gradeId === 'NG');
    return index >= 0
      ? { message: `Subject ${index + 1}: NG is not numeric; use school guidance instead of a numeric GPA.`, field: `nepal-subject-${subjects[index].id}-grade` }
      : { message: raw };
  }

  if (raw.startsWith('Grade names')) {
    const seen = new Set<string>();
    const index = grades.findIndex((grade) => {
      const label = grade.label.trim().toUpperCase();
      const invalid = !label || label.length > 12 || seen.has(label);
      seen.add(label);
      return invalid;
    });
    if (index < 0) return { message: raw };
    const label = grades[index].label.trim();
    const message = !label
      ? `Custom grade ${index + 1} label is required.`
      : label.length > 12
        ? `Custom grade ${index + 1} label must be 12 characters or fewer.`
        : `Custom grade ${index + 1} label must be unique.`;
    return { message, field: `nepal-grade-${grades[index].id}-label` };
  }

  if (raw.startsWith('Include at least one course')) {
    const subject = subjects[0];
    return subject
      ? { message: 'At least one subject must have positive credit hours.', field: `nepal-subject-${subject.id}-credits` }
      : { message: raw };
  }

  const gradeIndex = grades.findIndex((grade) => {
    const label = grade.label.trim().toUpperCase();
    return raw.startsWith(`Grade ${label}:`) || raw === `Grade ${label} exceeds the scale maximum.`;
  });
  if (gradeIndex >= 0) {
    const grade = grades[gradeIndex];
    const label = grade.label.trim() || `#${gradeIndex + 1}`;
    const message = raw.endsWith('exceeds the scale maximum.')
      ? `Custom grade ${label} points must not exceed the maximum grade point.`
      : raw.replace(`Grade ${grade.label.trim().toUpperCase()}`, `Custom grade ${label} points`);
    return { message, field: `nepal-grade-${grade.id}-points` };
  }

  const course = raw.match(/^Semester 1, course (\d+)(.*)$/);
  if (course) {
    const index = Number(course[1]) - 1;
    const subject = subjects[index];
    if (!subject) return { message: raw.replace(/Semester 1, course (\d+)/, 'Subject $1') };
    if (course[2].startsWith(' credits:')) {
      return { message: `Subject ${index + 1} credits:${course[2].slice(' credits:'.length)}`, field: `nepal-subject-${subject.id}-credits` };
    }
    if (course[2].startsWith(': choose a grade')) {
      return { message: `Subject ${index + 1} grade:${course[2].slice(1)}`, field: `nepal-subject-${subject.id}-grade` };
    }
    return { message: `Subject ${index + 1} name must be at most 80 characters.`, field: `nepal-subject-${subject.id}-name` };
  }

  if (raw.startsWith('Semester 1:')) {
    return { message: 'Use 1–30 subjects with names of at most 80 characters.' };
  }

  return { message: raw };
}
