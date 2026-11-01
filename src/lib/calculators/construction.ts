export type ConstructionId = "plywood-calculator" | "wood-cft-calculator" | "tile-calculator" | "paint-calculator" | "concrete-calculator";
export type UnitKind = "length" | "area" | "coverage";
export type ConstructionField = {
  id: string; label: string; defaultValue: string; positive?: boolean; integer?: boolean;
  optional?: boolean; max?: number; unitKind?: UnitKind; defaultUnit?: string; help?: string;
};
export type ConstructionDefinition = {
  id: ConstructionId; fields: readonly ConstructionField[]; intro: string;
  formulas: readonly string[]; notes: readonly string[];
  examples: readonly [ConstructionExample, ConstructionExample, ConstructionExample];
  faqs?: readonly [string, string][];
};
export type ConstructionExample = {
  title: string; input: string; explanation: string;
  values: Record<string, string>; units?: Record<string, string>; resultIds: readonly string[];
};
export type ConstructionState = { values: Record<string, string>; units: Record<string, string> };
export type ResultRow = { id: string; label: string; value: string; unit: string; numericValue: number | null };
export type ConstructionResult = { ok: false; errors: Record<string, string> } | { ok: true; rows: ResultRow[]; values: Record<string, number | null> };

const lengthUnits = [
  { id: "mm", label: "Millimeters (mm)", factor: "0.001" },
  { id: "cm", label: "Centimeters (cm)", factor: "0.01" },
  { id: "m", label: "Meters (m)", factor: "1" },
  { id: "in", label: "Inches (in)", factor: "0.0254" },
  { id: "ft", label: "Feet (ft)", factor: "0.3048" },
] as const;
const areaUnits = [
  { id: "m2", label: "Square meters (m²)", factor: "1" },
  { id: "ft2", label: "Square feet (ft²)", factor: "0.09290304" },
] as const;
export function constructionUnits(kind: UnitKind) {
  if (kind === "length") return lengthUnits;
  if (kind === "coverage") return areaUnits.map((unit) => ({ ...unit, label: `${unit.label} per liter` }));
  return areaUnits;
}
export function constructionDefaults(definition: ConstructionDefinition): ConstructionState {
  return {
    values: Object.fromEntries(definition.fields.map((field) => [field.id, field.defaultValue])),
    units: Object.fromEntries(definition.fields.filter((field) => field.unitKind).map((field) => [field.id, field.defaultUnit!])),
  };
}

// Decimal inputs and unit factors remain rational through calculation and
// ceiling/rounding. In particular, an exact tile ratio of 100 never becomes 101.
type Fraction = { n: bigint; d: bigint };
const ZERO = BigInt(0), ONE = BigInt(1), TWO = BigInt(2), TEN = BigInt(10);
function fraction(n: bigint, d = ONE): Fraction {
  let a = n < ZERO ? -n : n, b = d;
  while (b !== ZERO) { const remainder = a % b; a = b; b = remainder; }
  return { n: n / a, d: d / a };
}
function decimal(value: string): Fraction {
  const [whole, part = ""] = value.split(".");
  const sign = value.startsWith("-") ? -ONE : ONE;
  return fraction(sign * BigInt((whole.replace(/^[+-]/, "") || "0") + part), TEN ** BigInt(part.length));
}
const add = (a: Fraction, b: Fraction) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Fraction, b: Fraction) => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Fraction, b: Fraction) => fraction(a.n * b.n, a.d * b.d);
const div = (a: Fraction, b: Fraction) => fraction(a.n * b.d, a.d * b.n);
const greater = (a: Fraction, b: Fraction) => a.n * b.d > b.n * a.d;
const ceil = (a: Fraction) => fraction((a.n + a.d - ONE) / a.d);
const squareFoot = decimal("0.09290304"), cubicFoot = decimal("0.028316846592");
const integerLimit = fraction(BigInt(Number.MAX_SAFE_INTEGER));

function numeric(a: Fraction): number {
  const n = a.n.toString(), d = a.d.toString();
  const np = n.slice(0, 16), dp = d.slice(0, 16);
  return (Number(np) / Number(dp)) * 10 ** ((n.length - np.length) - (d.length - dp.length));
}
function display(a: Fraction, places: number): string {
  const scale = TEN ** BigInt(places);
  const rounded = (a.n * scale * TWO + a.d) / (a.d * TWO);
  if (a.n > ZERO && rounded === ZERO && places > 0) return `<0.${"0".repeat(places - 1)}1`;
  const digits = rounded.toString().padStart(places + 1, "0");
  const whole = (places ? digits.slice(0, -places) : digits).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return places ? `${whole}.${digits.slice(-places)}` : whole;
}

export function calculateConstruction(definition: ConstructionDefinition, state: ConstructionState): ConstructionResult {
  const errors: Record<string, string> = {};
  const parsed: Record<string, Fraction | undefined> = {};
  for (const field of definition.fields) {
    const raw = (state.values[field.id] ?? "").trim();
    if (!raw && field.optional) { parsed[field.id] = undefined; continue; }
    if (!raw) { errors[field.id] = `Enter ${field.label.toLowerCase()}.`; continue; }
    if (raw.length > 64 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
      errors[field.id] = "Enter a decimal number without commas, units or exponent notation."; continue;
    }
    let value = decimal(raw);
    if (value.n < ZERO || (field.positive && value.n === ZERO)) {
      errors[field.id] = field.positive ? "Enter a value greater than zero." : "Enter zero or a positive value."; continue;
    }
    if (field.integer && value.n % value.d !== ZERO) { errors[field.id] = "Enter a whole number."; continue; }
    if (greater(value, decimal(String(field.max ?? 1000000000)))) {
      errors[field.id] = `Enter a value no greater than ${(field.max ?? 1000000000).toLocaleString("en-US")}.`; continue;
    }
    if (field.unitKind) {
      const unit = constructionUnits(field.unitKind).find((item) => item.id === state.units[field.id]);
      if (!unit) { errors[field.id] = "Choose a supported unit."; continue; }
      value = mul(value, decimal(unit.factor));
    }
    parsed[field.id] = value;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const v = (id: string) => parsed[id]!;
  const rows: ResultRow[] = [];
  function row(id: string, label: string, value: Fraction | undefined, unit: string, places = 4) {
    rows.push({ id, label, value: value ? display(value, places) : "Not calculated", unit, numericValue: value ? numeric(value) : null });
  }
  function area(id: string, label: string, value: Fraction) {
    row(`${id}M2`, label, value, "m²"); row(`${id}Ft2`, `${label} (imperial)`, div(value, squareFoot), "ft²");
  }
  function volume(id: string, label: string, value: Fraction) {
    row(`${id}M3`, label, value, "m³", 6); row(`${id}Ft3`, `${label} (CFT)`, div(value, cubicFoot), "ft³", 6);
  }
  function cost(value?: Fraction) { row("cost", "Estimated total cost", value, value ? "currency units" : "Enter the optional price to estimate cost", 2); }
  const wastageFactor = () => add(decimal("1"), div(v("wastage"), decimal("100")));

  if (definition.id === "plywood-calculator" || definition.id === "wood-cft-calculator") {
    const faceArea = mul(v("length"), v("width"));
    const perPiece = mul(faceArea, v("thickness"));
    const total = mul(perPiece, v("quantity"));
    if (definition.id === "plywood-calculator") {
      area("sheetArea", "Area per sheet (one face)", faceArea);
      area("totalArea", "Total area (one face per sheet)", mul(faceArea, v("quantity")));
      volume("pieceVolume", "Volume per sheet", perPiece); volume("totalVolume", "Total volume", total);
      cost(parsed.price ? mul(v("price"), v("quantity")) : undefined);
    } else {
      volume("pieceVolume", "Volume per piece", perPiece); volume("totalVolume", "Total volume", total);
      cost(parsed.price ? mul(v("price"), div(total, cubicFoot)) : undefined);
    }
  } else if (definition.id === "tile-calculator") {
    if (parsed.price && !parsed.tilesPerBox) return { ok: false, errors: { tilesPerBox: "Enter tiles per box to calculate the box cost." } };
    const floorArea = mul(v("floorLength"), v("floorWidth"));
    const tileArea = mul(v("tileLength"), v("tileWidth"));
    const rawTiles = div(floorArea, tileArea);
    const required = ceil(rawTiles), adjusted = ceil(mul(rawTiles, wastageFactor()));
    const boxes = parsed.tilesPerBox ? ceil(div(adjusted, v("tilesPerBox"))) : undefined;
    const purchased = boxes ? mul(boxes, v("tilesPerBox")) : undefined;
    if ([required, adjusted, boxes, purchased].some((value) => value && greater(value, integerLimit))) {
      return { ok: false, errors: { _form: "The tile quantity exceeds the supported whole-number range. Reduce the floor size or increase the tile size." } };
    }
    area("floorArea", "Floor area", floorArea); area("tileArea", "Tile area", tileArea);
    row("requiredTiles", "Required tiles before wastage", required, "tiles", 0);
    row("adjustedTiles", "Wastage-adjusted quantity", adjusted, "tiles", 0);
    row("boxes", "Required boxes", boxes, boxes ? "boxes" : "Enter tiles per box", 0);
    row("purchasedTiles", "Tiles in purchased boxes", purchased, purchased ? "tiles" : "Enter tiles per box", 0);
    cost(parsed.price && boxes ? mul(v("price"), boxes) : undefined);
  } else if (definition.id === "paint-calculator") {
    const gross = mul(mul(v("length"), v("height")), v("walls"));
    if (greater(v("deduction"), gross)) return { ok: false, errors: { deduction: "The total deduction cannot exceed the gross wall area." } };
    const net = sub(gross, v("deduction"));
    const basePaint = div(mul(net, v("coats")), v("coverage"));
    const paint = mul(basePaint, wastageFactor());
    area("grossArea", "Gross wall area", gross); area("netArea", "Net paintable area", net);
    row("basePaint", "Paint before wastage", basePaint, "L", 3);
    row("paint", "Estimated paint including wastage", paint, "L", 3);
    cost(parsed.price ? mul(paint, v("price")) : undefined);
  } else {
    const wet = mul(mul(v("length"), v("width")), v("depth"));
    volume("wetVolume", "Wet concrete volume", wet);
    volume("adjustedVolume", "Wastage-adjusted wet volume", mul(wet, wastageFactor()));
  }
  if (rows.some((item) => item.numericValue !== null && !Number.isFinite(item.numericValue))) {
    return { ok: false, errors: { _form: "These inputs exceed the supported calculation range. Use smaller values." } };
  }
  return { ok: true, rows, values: Object.fromEntries(rows.map((item) => [item.id, item.numericValue])) };
}

export function constructionSummary(title: string, rows: readonly ResultRow[]): string {
  return `${title}\n${rows.map((item) => `${item.label}: ${item.value} ${item.unit}`).join("\n")}`;
}
