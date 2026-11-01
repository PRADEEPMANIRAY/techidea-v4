function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter a complete date.');
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1900 || y > 9998) throw new Error('Use dates from 1900 through 9998.');
  const result = new Date(Date.UTC(y, m - 1, d));
  if (result.getUTCFullYear() !== y || result.getUTCMonth() !== m - 1 || result.getUTCDate() !== d) throw new Error('This calendar date does not exist.');
  return result;
}
function anniversary(birth: Date, year: number) {
  const month = birth.getUTCMonth();
  return new Date(Date.UTC(year, month, Math.min(birth.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate())));
}
function addMonths(start: Date, months: number) {
  const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(start.getUTCDate(), new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate())));
}
export function calculateAge(birthValue: string, onValue: string, todayValue = new Date().toISOString().slice(0, 10)) {
  const birth = date(birthValue), on = date(onValue);
  if (birth > date(todayValue)) throw new Error('Birth date cannot be in the future.');
  if (birth > on) throw new Error('Birth date must not be after the calculation date.');
  let years = on.getUTCFullYear() - birth.getUTCFullYear();
  if (anniversary(birth, on.getUTCFullYear()) > on) years--;
  const anchor = anniversary(birth, birth.getUTCFullYear() + years);
  let months = 0;
  while (months < 11 && addMonths(anchor, months + 1) <= on) months++;
  const days = Math.round((+on - +addMonths(anchor, months)) / 86400000);
  let next = anniversary(birth, on.getUTCFullYear());
  if (next < on) next = anniversary(birth, on.getUTCFullYear() + 1);
  return { years, months, days, totalDays: Math.round((+on - +birth) / 86400000), birthdayDays: Math.round((+next - +on) / 86400000), nextBirthday: next.toISOString().slice(0, 10) };
}
export function numeric(value: string, label: string) {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) throw new Error(`${label} must be a nonnegative decimal number.`);
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${label} is too large.`);
  return n;
}
export function cgpaPercentage(value: string, scaleValue: string, multiplierValue: string, offsetValue: string) {
  const cgpa = numeric(value, 'CGPA'), scale = numeric(scaleValue, 'Scale'), multiplier = numeric(multiplierValue, 'Multiplier');
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(offsetValue.trim())) throw new Error('Offset must be a decimal number.');
  const offset = Number(offsetValue);
  if (scale <= 0 || scale > 100 || cgpa > scale) throw new Error('CGPA must be between zero and your scale maximum (up to 100).');
  if (multiplier <= 0 || multiplier > 100 || !Number.isFinite(offset) || Math.abs(offset) > 100) throw new Error('Use a multiplier above 0 and at most 100, and an offset from −100 to 100.');
  const percentage = cgpa * multiplier + offset;
  if (percentage < 0 || percentage > 100) throw new Error('This rule produces a percentage outside 0–100. Check your institution’s formula.');
  return percentage;
}
