export type FinancialId = "emi-calculator" | "sip-calculator" | "gst-calculator" | "discount-calculator" | "percentage-calculator";
export type FinancialField = { id: string; label: string; defaultValue: string; min?: number; max?: number; exclusiveMin?: boolean; integer?: boolean; money?: boolean; optional?: boolean; help?: string; options?: readonly { value: string; label: string }[] };
export type FinancialExample = { title: string; input: string; values: Record<string, string>; resultIds: readonly string[]; explanation: string };
export type FinancialDefinition = { id: FinancialId; fields: readonly FinancialField[]; intro: string; formulas: readonly string[]; notes: readonly string[]; disclaimer: string; examples: readonly [FinancialExample, FinancialExample, FinancialExample]; faqs?: readonly [string, string][] };
export type FinancialRow = { id: string; label: string; value: number; format: "money" | "number" | "percent" };
export type AmortizationRow = { month: number; openingCents: number; paymentCents: number; principalCents: number; interestCents: number; closingCents: number };
export type ProjectionRow = { year: number; monthlyCents: number; yearInvestedCents: number; investedCents: number; valueCents: number; gainsCents: number };
export type FinancialResult = { ok: false; errors: Record<string, string> } | { ok: true; currency: string; rows: FinancialRow[]; values: Record<string, number>; note: string; formula: string; amortization?: AmortizationRow[]; projection?: ProjectionRow[] };

export const currencies = [{ value: "INR", label: "INR — Indian rupee" }, { value: "USD", label: "USD — US dollar" }, { value: "EUR", label: "EUR — Euro" }, { value: "GBP", label: "GBP — Pound sterling" }] as const;
export function financialDefaults(definition: FinancialDefinition): Record<string, string> { return Object.fromEntries(definition.fields.map((field) => [field.id, field.defaultValue])); }

// Exact rational decimal arithmetic for tax, discounts, percentage operations
// and monetary ledger rounding. Interest-growth powers use stable Number math.
type Decimal = { n: bigint; d: bigint };
const Z = BigInt(0), O = BigInt(1), T = BigInt(2), H = BigInt(100);
const MAX_CENTS = BigInt("1000000000000000");
function rat(n: bigint, d = O): Decimal {
  if (d === Z) throw new RangeError("Division by zero");
  if (d < Z) { n = -n; d = -d; }
  let a = n < Z ? -n : n, b = d;
  while (b !== Z) { const remainder = a % b; a = b; b = remainder; }
  return { n: n / a, d: d / a };
}
function dec(text: string): Decimal {
  const [mantissa, exponent = "0"] = text.toLowerCase().split("e");
  const [whole, part = ""] = mantissa.split(".");
  let n = BigInt((whole.replace(/^[+-]/, "") || "0") + part) * (mantissa.startsWith("-") ? -O : O);
  let d = BigInt(10) ** BigInt(part.length);
  const power = Number(exponent);
  if (power >= 0) n *= BigInt(10) ** BigInt(power); else d *= BigInt(10) ** BigInt(-power);
  return rat(n, d);
}
const add = (a: Decimal, b: Decimal) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Decimal, b: Decimal) => rat(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Decimal, b: Decimal) => rat(a.n * b.n, a.d * b.d);
const div = (a: Decimal, b: Decimal) => rat(a.n * b.d, a.d * b.n);
const abs = (a: Decimal) => rat(a.n < Z ? -a.n : a.n, a.d);
const compare = (a: Decimal, b: Decimal) => a.n * b.d - b.n * a.d;
function round(a: Decimal): bigint { const n = a.n < Z ? -a.n : a.n; const rounded = (n * T + a.d) / (a.d * T); return a.n < Z ? -rounded : rounded; }
function number(a: Decimal): number {
  const n = abs(a).n.toString(), d = a.d.toString(), np = n.slice(0, 16), dp = d.slice(0, 16);
  return (a.n < Z ? -1 : 1) * Number(np) / Number(dp) * 10 ** (n.length - np.length - d.length + dp.length);
}
function centsFromNumber(value: number): bigint { return round(mul(dec(value.toString()), rat(H))); }
const currencyValue = (cents: bigint) => Number(cents) / 100;

export function percentageLabels(mode: string): [string, string] {
  if (mode === "of") return ["Percentage (X)", "Value (Y)"];
  if (mode === "ratio") return ["Part (X)", "Whole (Y)"];
  if (mode === "difference") return ["First value", "Second value"];
  return ["Original value", "New value"];
}
export function calculateFinancial(definition: FinancialDefinition, input: Record<string, string>): FinancialResult {
  const errors: Record<string, string> = {}, parsed: Record<string, Decimal> = {};
  for (const field of definition.fields) {
    const raw = (input[field.id] ?? "").trim();
    if (field.options) { if (!field.options.some((option) => option.value === raw)) errors[field.id] = "Choose a supported option."; continue; }
    if (!raw && field.optional) { parsed[field.id] = rat(Z); continue; }
    if (!raw || raw.length > 64 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) { errors[field.id] = "Enter a decimal number without commas, units or exponent notation."; continue; }
    const value = dec(raw), lower = field.min ?? 0, upper = field.max ?? 10000000000;
    if (compare(value, dec(String(lower))) < Z || (field.exclusiveMin && compare(value, dec(String(lower))) === Z)) { errors[field.id] = `Enter a value ${field.exclusiveMin ? "greater than" : "at least"} ${lower}.`; continue; }
    if (compare(value, dec(String(upper))) > Z) { errors[field.id] = `Enter a value no greater than ${upper.toLocaleString("en-US")}.`; continue; }
    if (field.integer && value.n % value.d !== Z) { errors[field.id] = "Enter a whole number."; continue; }
    if (field.money && (value.n * H) % value.d !== Z) { errors[field.id] = "Enter an amount with no more than two nonzero decimal places."; continue; }
    parsed[field.id] = value;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const v = (id: string) => parsed[id];
  const n = (id: string) => number(v(id));
  const cents = (id: string) => round(mul(v(id), rat(H)));
  const fail = (id: string, message: string): FinancialResult => ({ ok: false, errors: { [id]: message } });
  const currency = definition.id === "gst-calculator" ? "INR" : (input.currency || "INR");
  const rows: FinancialRow[] = [];
  function row(id: string, label: string, value: number, format: FinancialRow["format"] = "money") { rows.push({ id, label, value, format }); }
  function money(id: string, label: string, value: bigint) { row(id, label, currencyValue(value)); }
  let note = "", formula = "", amortization: AmortizationRow[] | undefined, projection: ProjectionRow[] | undefined;

  if (definition.id === "emi-calculator") {
    const monthsValue = mul(v("tenure"), dec(input.tenureUnit === "years" ? "12" : "1"));
    if (monthsValue.n % monthsValue.d !== Z || number(monthsValue) < 1 || number(monthsValue) > 600) return fail("tenure", "Tenure must equal 1–600 whole months (up to 50 years).");
    const months = number(monthsValue), principal = cents("principal"), monthlyRate = n("rate") / 1200;
    const theoretical = monthlyRate === 0 ? currencyValue(principal) / months : currencyValue(principal) * monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate));
    if (!Number.isFinite(theoretical)) return fail("_form", "The repayment exceeds the supported calculation range.");
    const emi = centsFromNumber(theoretical);
    if (emi === Z) return fail("principal", "The monthly EMI rounds below 0.01. Increase the loan amount or shorten the tenure.");
    let balance = principal, totalInterest = Z, totalPayment = Z;
    amortization = [];
    const rate = div(v("rate"), dec("1200"));
    for (let month = 1; month <= months && balance > Z; month++) {
      const interest = round(mul(rat(balance), rate)), due = balance + interest;
      const payment = month === months || emi > due ? due : emi;
      if (payment < interest) return fail("_form", "The rounded EMI cannot cover interest at these inputs. Shorten the tenure.");
      const principalPaid = payment - interest, closing = balance - principalPaid;
      amortization.push({ month, openingCents: Number(balance), paymentCents: Number(payment), interestCents: Number(interest), principalCents: Number(principalPaid), closingCents: Number(closing) });
      totalInterest += interest; totalPayment += payment; balance = closing;
    }
    money("emi", "Monthly EMI", emi); money("principal", "Principal", principal);
    money("interest", "Total interest", totalInterest); money("repayment", "Total repayment", totalPayment);
    row("finalPayment", "Final payment", amortization.at(-1)!.paymentCents / 100);
    row("payments", "Number of payments", amortization.length, "number");
    formula = monthlyRate === 0 ? "EMI = principal ÷ number of months (zero interest)" : "EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), with r = annual rate ÷ 1200";
    note = "EMI and each month's interest are rounded to two decimals. The last payment clears the remaining balance; very small loans can finish early. Totals are the sum of this schedule, excluding fees and taxes.";
  } else if (definition.id === "sip-calculator") {
    const annual = n("return"), years = n("years");
    if (annual <= -100) return fail("return", "The return is too close to −100% for numeric precision. Enter a rate farther above −100%.");
    const monthlyRate = Math.expm1(Math.log1p(annual / 100) / 12);
    let monthly = cents("monthly"), invested = Z, value = 0;
    projection = [];
    const step = add(dec("1"), div(v("stepUp"), dec("100")));
    for (let year = 1; year <= years; year++) {
      if (year > 1) monthly = round(mul(rat(monthly), step));
      if (monthly > MAX_CENTS) return fail("_form", "The step-up exceeds the supported monetary range. Reduce the duration, contribution or step-up.");
      for (let month = 0; month < 12; month++) {
        value = value * (1 + monthlyRate) + currencyValue(monthly);
        invested += monthly;
      }
      if (!Number.isFinite(value) || value > 1e13 || invested > MAX_CENTS) return fail("_form", "The projection exceeds 10 trillion currency units. Reduce the investment, return, duration or step-up.");
      const endValue = centsFromNumber(value);
      projection.push({ year, monthlyCents: Number(monthly), yearInvestedCents: Number(monthly * BigInt(12)), investedCents: Number(invested), valueCents: Number(endValue), gainsCents: Number(endValue - invested) });
    }
    const final = projection.at(-1)!;
    row("invested", "Total invested", final.investedCents / 100);
    row("value", "Estimated investment value", final.valueCents / 100);
    row("gains", "Estimated gains / losses", final.gainsCents / 100);
    row("monthlyReturn", "Equivalent monthly return", monthlyRate * 100, "percent");
    formula = "r = (1 + annual return / 100)^(1/12) − 1; Vₘ = Vₘ₋₁ × (1 + r) + contributionₘ";
    note = "Contributions are made at each month-end. Step-up starts in month 13 and repeats annually, rounding each new monthly contribution to two decimals. Growth is not rounded between months. Fees, taxes and inflation are excluded. Returns are estimates, not guarantees.";
  } else if (definition.id === "gst-calculator") {
    const amount = cents("amount"), rate = div(v("rate"), dec("100"));
    const taxable = input.taxMode === "inclusive" ? round(div(rat(amount), add(dec("1"), rate))) : amount;
    const gst = input.taxMode === "inclusive" ? amount - taxable : round(mul(rat(taxable), rate));
    money("taxable", "Taxable amount", taxable); money("gst", "Total GST", gst); money("final", "Final amount", taxable + gst);
    if (input.split === "dual") { const cgst = gst / T; money("cgst", "CGST", cgst); money("sgst", "SGST", gst - cgst); }
    else money("igst", "IGST", gst);
    formula = input.taxMode === "inclusive" ? "Taxable amount = inclusive amount ÷ (1 + rate / 100); GST = inclusive amount − taxable amount" : "GST = taxable amount × rate / 100; final amount = taxable amount + GST";
    note = "Amounts are rounded half-up to paise. Inclusive totals are preserved by subtraction. For CGST + SGST, total tax is split equally and any odd paise goes to SGST so the displayed amounts reconcile. This display convention is not a statutory invoice-rounding determination.";
  } else if (definition.id === "discount-calculator") {
    const original = cents("original"), discount = round(mul(rat(original), div(v("discount"), dec("100"))));
    const afterFirst = original - discount;
    const additional = round(mul(rat(afterFirst), div(v("additional"), dec("100"))));
    const afterAll = afterFirst - additional;
    const tax = round(mul(rat(afterAll), div(v("tax"), dec("100"))));
    money("discount", "First discount amount", discount); money("afterFirst", "Price after first discount", afterFirst);
    money("additional", "Additional discount amount", additional); money("afterAll", "Price after all discounts", afterAll);
    money("tax", "Tax on discounted price", tax); money("final", "Final price", afterAll + tax);
    money("savings", "Total savings before tax", original - afterAll);
    formula = "D₁ = original × d₁/100; D₂ = (original − D₁) × d₂/100; final = original − D₁ − D₂ + tax";
    note = "Discounts apply sequentially. Each discount and the tax are rounded half-up to two decimals before the next step. Tax applies after both discounts. Total savings excludes tax; blank optional percentages mean zero.";
  } else {
    const x = v("x"), y = v("y"), mode = input.mode;
    let result: Decimal;
    if (mode === "of") { result = div(mul(x, y), dec("100")); formula = "Result = X × Y ÷ 100"; }
    else if (mode === "ratio") {
      if (y.n === Z) return fail("y", "The whole (Y) cannot be zero; the percentage is undefined.");
      result = mul(div(x, y), dec("100")); formula = "Percentage = X ÷ Y × 100";
    } else if (mode === "difference") {
      const average = div(add(abs(x), abs(y)), dec("2"));
      if (average.n === Z) return fail("y", "Both values are zero, so the percentage difference is undefined.");
      result = mul(div(abs(sub(x, y)), average), dec("100")); formula = "Difference = |X − Y| ÷ ((|X| + |Y|) / 2) × 100";
    } else {
      if (x.n === Z) return fail("x", "The original value cannot be zero; relative change is undefined.");
      result = mul(div(mode === "increase" ? sub(y, x) : sub(x, y), abs(x)), dec("100"));
      formula = mode === "increase" ? "Increase = (new − original) ÷ |original| × 100" : "Decrease = (original − new) ÷ |original| × 100";
    }
    row("result", mode === "of" ? "Calculated value" : mode === "ratio" ? "Percentage of whole" : mode === "difference" ? "Percentage difference" : mode === "increase" ? "Percentage increase" : "Percentage decrease", number(result), mode === "of" ? "number" : "percent");
    note = mode === "difference" ? "Difference uses the mean of absolute magnitudes, supports signed inputs and ranges from 0% to 200%. It is symmetric, not a directional change." : mode === "increase" || mode === "decrease" ? "Relative change uses the magnitude of the original value as its denominator. A negative increase means a decrease; a negative decrease means an increase. Zero original values are undefined." : "Signed values are supported. For X as a percentage of Y, a zero denominator is undefined, including 0 ÷ 0.";
  }
  return { ok: true, currency, rows, values: Object.fromEntries(rows.map((item) => [item.id, item.value])), note, formula, amortization, projection };
}

export function formatFinancial(value: number, format: FinancialRow["format"], currency = "INR"): string {
  if (Object.is(value, -0)) value = 0;
  if (format === "money") return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const magnitude = Math.abs(value);
  const formatted = magnitude >= 1e15 || (magnitude > 0 && magnitude < 1e-6) ? value.toExponential(6) : new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
  return formatted + (format === "percent" ? "%" : "");
}
export function emiCsv(schedule: readonly AmortizationRow[], currency: string): string {
  if (!currencies.some((item) => item.value === currency)) throw new Error("Unsupported currency");
  const header = ["Month", ...["Opening balance", "Payment", "Principal", "Interest", "Closing balance"].map((label) => `${label} (${currency})`)];
  return [header.join(","), ...schedule.map((row) => [row.month, ...[row.openingCents, row.paymentCents, row.principalCents, row.interestCents, row.closingCents].map((cents) => (cents / 100).toFixed(2))].join(","))].join("\r\n") + "\r\n";
}
