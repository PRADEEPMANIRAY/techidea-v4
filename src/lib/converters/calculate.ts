import type { ConverterDefinition } from "./definitions";

export type ConversionResult = { ok: true; value: number } | { ok: false; error: string };
const minimumTemperature: Record<string, number> = { c: -273.15, f: -459.67, k: 0 };
const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

// Compare a negative decimal input with an exactly specified boundary even
// when Number() would round both to the same floating-point value.
function exceedsBoundaryMagnitude(raw: string, boundary: number): boolean {
  function parts(text: string) {
    const [mantissa, exponent = "0"] = text.replace(/^[+-]/, "").toLowerCase().split("e");
    const fractionLength = mantissa.split(".")[1]?.length ?? 0;
    const digits = mantissa.replace(".", "").replace(/^0+/, "") || "0";
    return { digits, order: digits.length + Number(exponent) - fractionLength };
  }
  const input = parts(raw.trim());
  const limit = parts(String(Math.abs(boundary)));
  if (input.order !== limit.order) return input.order > limit.order;
  const width = Math.max(input.digits.length, limit.digits.length);
  return input.digits.padEnd(width, "0") > limit.digits.padEnd(width, "0");
}

export function parseValue(raw: string): ConversionResult {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Enter a value to convert." };
  if (input.length > 128 || !decimalPattern.test(input)) {
    return { ok: false, error: "Enter a number using a decimal point, without commas or unit labels. Scientific notation such as 1e6 is supported." };
  }
  const value = Number(input);
  if (!Number.isFinite(value)) return { ok: false, error: "This number is too large. Enter a smaller value." };
  if (value === 0 && /[1-9]/.test(input.split(/e/i)[0])) {
    return { ok: false, error: "This number is too small to represent accurately. Enter a larger value." };
  }
  return { ok: true, value: Object.is(value, -0) ? 0 : value };
}

export function convert(definition: ConverterDefinition, raw: string, fromId: string, toId: string): ConversionResult {
  const from = definition.units.find((unit) => unit.id === fromId);
  const to = definition.units.find((unit) => unit.id === toId);
  if (!from || !to) return { ok: false, error: "Choose supported units for this converter." };
  const input = parseValue(raw);
  if (!input.ok) return input;
  const value = input.value;
  let result: number;
  if (definition.kind === "temperature") {
    if (!(fromId in minimumTemperature) || !(toId in minimumTemperature)) {
      return { ok: false, error: "Choose a supported temperature scale." };
    }
    if (value < minimumTemperature[fromId] || (value === minimumTemperature[fromId] && value < 0 && exceedsBoundaryMagnitude(raw, value))) {
      return { ok: false, error: `Temperature cannot be below absolute zero (${minimumTemperature[fromId]} ${from.symbol}).` };
    }
    if (value === minimumTemperature[fromId]) result = minimumTemperature[toId];
    else if (fromId === toId) result = value;
    else if (fromId === "c") result = toId === "f" ? value * (9 / 5) + 32 : value + 273.15;
    else if (fromId === "f") result = toId === "c" ? (value - 32) * (5 / 9) : (value + 459.67) * (5 / 9);
    else result = toId === "c" ? value - 273.15 : value * (9 / 5) - 459.67;
    // A valid source value may round a few ulps past the target boundary.
    result = Math.max(minimumTemperature[toId], result);
  } else {
    // Apply the ratio first to avoid an unnecessary overflowing base-unit intermediate.
    result = fromId === toId ? value : value * (from.factor / to.factor);
    if (value !== 0 && result === 0) return { ok: false, error: "The converted value is too small to represent accurately. Try another unit." };
  }
  if (!Number.isFinite(result)) return { ok: false, error: "The converted value is too large. Reduce the input or choose another unit." };
  return { ok: true, value: Object.is(result, -0) ? 0 : result };
}

export function formatResult(value: number, precision: number): string {
  if (!Number.isFinite(value)) throw new RangeError("A finite result is required.");
  if (!Number.isInteger(precision) || precision < 0 || precision > 10) throw new RangeError("Precision must be an integer from 0 to 10.");
  const magnitude = Math.abs(value);
  if (magnitude >= 1e21 || (magnitude > 0 && magnitude < 1e-10)) return value.toExponential(precision);
  const text = new Intl.NumberFormat("en-US", {
    useGrouping: false, minimumFractionDigits: precision, maximumFractionDigits: precision,
  }).format(value);
  return Number(text) === 0 ? text.replace(/^-/, "") : text;
}

export function swapUnits<T extends { from: string; to: string }>(selection: T): T {
  return { ...selection, from: selection.to, to: selection.from };
}

export function conversionFormula(definition: ConverterDefinition, fromId: string, toId: string): string {
  const from = definition.units.find((unit) => unit.id === fromId);
  const to = definition.units.find((unit) => unit.id === toId);
  if (!from || !to) return "Choose two supported units to see the formula.";
  if (fromId === toId) return `${to.symbol} = ${from.symbol} (same unit; value unchanged)`;
  if (definition.kind === "linear") return `${to.symbol} = ${from.symbol} × ${from.factor} ÷ ${to.factor}`;
  const formulas: Record<string, string> = {
    "c:f": "°F = (°C × 9/5) + 32", "f:c": "°C = (°F − 32) × 5/9",
    "c:k": "K = °C + 273.15", "k:c": "°C = K − 273.15",
    "f:k": "K = (°F + 459.67) × 5/9", "k:f": "°F = (K × 9/5) − 459.67",
  };
  return formulas[`${fromId}:${toId}`];
}
