export type ConstructionId = "plywood-calculator" | "wood-cft-calculator" | "tile-calculator" | "paint-calculator" | "concrete-calculator";
export type UnitKind = "length" | "area" | "coverage";
export type ConstructionField = {
  id: string; label: string; defaultValue: string; positive?: boolean; integer?: boolean;
  optional?: boolean; max?: number; unitKind?: UnitKind; defaultUnit?: string; help?: string;
  options?: readonly { value: string; label: string }[];
};
export type ConstructionDefinition = {
  id: ConstructionId; fields: readonly ConstructionField[]; intro: string;
  formulas: readonly string[]; notes: readonly string[];
  examples: readonly [ConstructionExample, ConstructionExample, ConstructionExample, ...ConstructionExample[]];
  guide?: { heading: string; paragraphs: readonly string[] };
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
export const plywoodPresets: Record<string, { length: string; width: string; unit: string }> = {
  "8x4-ft": { length: "8", width: "4", unit: "ft" },
  "4x8-ft": { length: "4", width: "8", unit: "ft" },
  "7x4-ft": { length: "7", width: "4", unit: "ft" },
  "6x4-ft": { length: "6", width: "4", unit: "ft" },
  "2440x1220-mm": { length: "2440", width: "1220", unit: "mm" },
  "2400x1200-mm": { length: "2400", width: "1200", unit: "mm" },
};
export function isConstructionFieldActive(definition: ConstructionDefinition, state: ConstructionState, id: string): boolean {
  if (definition.id === "plywood-calculator") {
    if (id === "quantity") return state.values.estimateMode !== "area";
    if (id === "targetArea") return state.values.estimateMode === "area";
  }
  if (definition.id !== "concrete-calculator" || !["length", "width", "depth", "diameter", "height"].includes(id)) return true;
  const dimensions: Record<string, string[]> = {
    "rectangular-slab": ["length", "width", "depth"],
    "rectangular-footing": ["length", "width", "depth"],
    "circular-footing": ["diameter", "depth"],
    "rectangular-column": ["width", "depth", "height"],
    "cylindrical-column": ["diameter", "height"],
  };
  return (dimensions[state.values.shape] ?? []).includes(id);
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
const pi = decimal("3.141592653589793");
const integerLimit = fraction(BigInt(Number.MAX_SAFE_INTEGER));
const concreteBagYieldDefaults = { "40": decimal("0.3"), "60": decimal("0.45"), "80": decimal("0.6") } as const;

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
  const selected: Record<string, string> = {};
  for (const field of definition.fields) {
    if (!isConstructionFieldActive(definition, state, field.id)) continue;
    let unitId = state.units[field.id];
    let raw = (state.values[field.id] ?? "").trim();
    const allowsBlankFloorAreaFallback = definition.id === "tile-calculator" && (field.id === "floorLength" || field.id === "floorWidth") && !raw && (state.values.floorArea ?? "").trim() !== "";
    if (definition.id === "plywood-calculator" && state.values.sheetPreset && state.values.sheetPreset !== "custom" && (field.id === "length" || field.id === "width")) {
      const preset = plywoodPresets[state.values.sheetPreset];
      if (preset) {
        raw = preset[field.id as "length" | "width"];
        unitId = preset.unit;
      }
    }
    if (allowsBlankFloorAreaFallback) { parsed[field.id] = undefined; continue; }
    if (!raw && field.optional) { parsed[field.id] = undefined; continue; }
    if (!raw) { errors[field.id] = `Enter ${field.label.toLowerCase()}.`; continue; }
    if (field.options) {
      if (!field.options.some((option) => option.value === raw)) {
        errors[field.id] = "Choose a supported option."; continue;
      }
      if (field.id === "shape") {
        selected[field.id] = raw;
        continue;
      }
      if (field.id === "bagSize") {
        const value = decimal(raw);
        if (value.n < ZERO || value.n % value.d !== ZERO) {
          errors[field.id] = "Choose a supported bag size."; continue;
        }
        parsed[field.id] = value;
        selected[field.id] = raw;
        continue;
      }
      selected[field.id] = raw;
      continue;
    }
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
      const unit = constructionUnits(field.unitKind).find((item) => item.id === unitId);
      if (!unit) { errors[field.id] = "Choose a supported unit."; continue; }
      value = mul(value, decimal(unit.factor));
    }
    parsed[field.id] = value;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const v = (id: string) => parsed[id]!;
  const opt = (id: string) => selected[id] ?? "";
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
    if (definition.id === "plywood-calculator") {
      const fromArea = opt("estimateMode") === "area";
      const rawQuantity = fromArea ? div(v("targetArea"), faceArea) : v("quantity");
      const baseQuantity = ceil(rawQuantity);
      const adjustedQuantity = ceil(mul(rawQuantity, wastageFactor()));
      if (greater(adjustedQuantity, integerLimit)) return { ok: false, errors: { _form: "The sheet count exceeds the supported whole-number range. Reduce the target area or increase the sheet size." } };
      const adjustedTotalArea = mul(faceArea, adjustedQuantity);
      const adjustedTotalVolume = mul(perPiece, adjustedQuantity);
      if (fromArea) {
        area("targetArea", "Surface area to cover", v("targetArea"));
        row("requiredSheets", "Whole sheets before wastage (area estimate)", baseQuantity, "sheets", 0);
      }
      row("adjustedSheets", "Sheets to purchase including wastage", adjustedQuantity, "sheets", 0);
      area("sheetArea", "Area per sheet (one face)", faceArea);
      area("totalArea", "Total area (one face per sheet)", mul(faceArea, baseQuantity));
      if (parsed.wastage) area("adjustedArea", "Adjusted total area with wastage", adjustedTotalArea);
      volume("pieceVolume", "Volume per sheet", perPiece); volume("totalVolume", "Total volume", mul(perPiece, baseQuantity));
      if (parsed.wastage) volume("adjustedVolume", "Adjusted total volume with wastage", adjustedTotalVolume);
      cost(parsed.price ? mul(v("price"), adjustedQuantity) : undefined);
    } else {
      const total = mul(perPiece, v("quantity"));
      volume("pieceVolume", "Volume per piece", perPiece); volume("totalVolume", "Total volume", total);
      row("boardFeet", "Board feet", mul(div(total, cubicFoot), decimal("12")), "board ft", 4);
      cost(parsed.price ? mul(v("price"), div(total, cubicFoot)) : undefined);
    }
  } else if (definition.id === "tile-calculator") {
    if (parsed.price && !parsed.tilesPerBox) return { ok: false, errors: { tilesPerBox: "Enter tiles per box to calculate the box cost." } };
    if (parsed.floorArea === undefined && (parsed.floorLength === undefined || parsed.floorWidth === undefined)) {
      return { ok: false, errors: { floorArea: "Enter either the floor dimensions or the total floor area." } };
    }
    const groutGap = parsed.groutGap ?? decimal("0");
    const floorArea = parsed.floorArea !== undefined ? v("floorArea") : mul(v("floorLength"), v("floorWidth"));
    const tileArea = mul(add(v("tileLength"), groutGap), add(v("tileWidth"), groutGap));
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
    const paintGallons = div(paint, decimal("3.785411784"));
    area("grossArea", "Gross wall area", gross); area("netArea", "Net paintable area", net);
    row("basePaint", "Paint before wastage", basePaint, "L", 3);
    row("paint", "Estimated paint including wastage", paint, "L", 3);
    row("paintGallons", "Estimated paint including wastage", paintGallons, "US gal", 3);
    cost(parsed.price ? mul(paint, v("price")) : undefined);
  } else {
    const shape = opt("shape") || "rectangular-slab";
    const width = parsed.width ?? decimal("0");
    const depth = parsed.depth ?? decimal("0");
    const height = parsed.height ?? decimal("0");
    const diameter = parsed.diameter ?? decimal("0");
    let wet: Fraction;
    if (shape === "rectangular-slab" || shape === "rectangular-footing") {
      if (parsed.length === undefined || parsed.width === undefined || parsed.depth === undefined) {
        return { ok: false, errors: { length: "Enter the slab length.", width: "Enter the slab width.", depth: "Enter the slab depth." } };
      }
      wet = mul(mul(v("length"), width), depth);
    } else if (shape === "circular-footing") {
      if (parsed.diameter === undefined || parsed.depth === undefined) {
        return { ok: false, errors: { diameter: "Enter the footing diameter.", depth: "Enter the footing depth." } };
      }
      const radius = div(diameter, decimal("2"));
      wet = mul(mul(pi, mul(radius, radius)), depth);
    } else if (shape === "rectangular-column") {
      if (parsed.width === undefined || parsed.depth === undefined || parsed.height === undefined) {
        return { ok: false, errors: { width: "Enter the column width.", depth: "Enter the column depth.", height: "Enter the column height." } };
      }
      wet = mul(mul(width, depth), height);
    } else if (shape === "cylindrical-column") {
      if (parsed.diameter === undefined || parsed.height === undefined) {
        return { ok: false, errors: { diameter: "Enter the column diameter.", height: "Enter the column height." } };
      }
      const radius = div(diameter, decimal("2"));
      wet = mul(mul(pi, mul(radius, radius)), height);
    } else {
      return { ok: false, errors: { shape: "Choose a supported concrete shape." } };
    }
    const adjusted = mul(wet, wastageFactor());
    const wetYards = div(wet, decimal("0.764554857984"));
    const adjustedYards = div(adjusted, decimal("0.764554857984"));
    const bagYield = parsed.bagYield ?? concreteBagYieldDefaults[(parsed.bagSize ?? decimal("60")).n.toString() as keyof typeof concreteBagYieldDefaults];
    const bags = parsed.bagSize || parsed.bagYield ? ceil(div(adjusted, mul(bagYield, decimal("0.028316846592")))) : undefined;
    if (bags && greater(bags, integerLimit)) return { ok: false, errors: { bagYield: "The bag count exceeds the supported whole-number range. Increase the yield or reduce the dimensions." } };
    row("bagYieldUsed", "Yield per bag used", bagYield, "ft³/bag", 4);
    volume("wetVolume", "Wet concrete volume", wet);
    volume("adjustedVolume", "Wastage-adjusted wet volume", adjusted);
    row("wetVolumeYd3", "Wet concrete volume", wetYards, "yd³", 4);
    row("adjustedVolumeYd3", "Wastage-adjusted wet volume", adjustedYards, "yd³", 4);
    if (bags) row("bags", "Required concrete bags", bags, "bags", 0);
    const priceBasis = opt("priceBasis") || "bag";
    const pricedQuantity = priceBasis === "m3" ? adjusted : priceBasis === "yd3" ? adjustedYards : bags;
    cost(parsed.price && pricedQuantity ? mul(v("price"), pricedQuantity) : undefined);
  }
  if (rows.some((item) => item.numericValue !== null && !Number.isFinite(item.numericValue))) {
    return { ok: false, errors: { _form: "These inputs exceed the supported calculation range. Use smaller values." } };
  }
  return { ok: true, rows, values: Object.fromEntries(rows.map((item) => [item.id, item.numericValue])) };
}

export function constructionSummary(title: string, rows: readonly ResultRow[]): string {
  return `${title}\n${rows.map((item) => `${item.label}: ${item.value} ${item.unit}`).join("\n")}`;
}

/** Validate each row through the single-piece engine, then sum exact fractions. */
export function calculateWoodBatch(definition: ConstructionDefinition, states: ConstructionState[]): ConstructionResult {
  if (definition.id !== "wood-cft-calculator" || states.length < 1 || states.length > 20) return { ok: false, errors: { _form: "Enter between 1 and 20 timber sizes." } };
  const rows: ResultRow[] = [];
  let total = decimal("0"), cost = decimal("0"), allPriced = true;
  for (const [index, state] of states.entries()) {
    const result = calculateConstruction(definition, state);
    if (!result.ok) return { ok: false, errors: Object.fromEntries(Object.entries(result.errors).map(([key, value]) => [`${index}-${key}`, value])) };
    const dimension = (id: string) => mul(decimal(state.values[id].trim()), decimal(lengthUnits.find(unit => unit.id === state.units[id])!.factor));
    const volume = mul(mul(mul(dimension("length"), dimension("width")), dimension("thickness")), decimal(state.values.quantity.trim()));
    total = add(total, volume);
    if (state.values.price.trim()) cost = add(cost, mul(div(volume, cubicFoot), decimal(state.values.price.trim())));
    else allPriced = false;
    rows.push(...result.rows.filter(row => ["pieceVolumeFt3", "totalVolumeM3", "totalVolumeFt3", "boardFeet", "cost"].includes(row.id)).map(row => ({ ...row, id: `row${index + 1}-${row.id}`, label: `Size ${index + 1}: ${row.label}` })));
  }
  if (greater(mul(div(total, cubicFoot), decimal("12")), decimal("10000000000000")) || greater(cost, decimal("10000000000000"))) return { ok: false, errors: { _form: "The combined volume or cost exceeds the supported range. Reduce quantities, dimensions or prices." } };
  for (const [id, label, value, unit, places] of [
    ["totalVolumeM3", "Grand total volume", total, "m³", 6],
    ["totalVolumeFt3", "Grand total CFT", div(total, cubicFoot), "ft³", 6],
    ["boardFeet", "Grand total board feet", mul(div(total, cubicFoot), decimal("12")), "board ft", 4],
    ["cost", allPriced ? "Grand total cost" : "Priced rows subtotal (some prices missing)", cost, "currency units", 2],
  ] as const) rows.push({ id, label, value: display(value, places), unit, numericValue: numeric(value) });
  return { ok: true, rows, values: Object.fromEntries(rows.map(row => [row.id, row.numericValue])) };
}

export function calculatePaintWalls(definition: ConstructionDefinition, common: ConstructionState, walls: ConstructionState[], ceiling?: ConstructionState): ConstructionResult {
  if (definition.id !== "paint-calculator" || walls.length < 1 || walls.length > 20) return { ok: false, errors: { _form: "Enter between 1 and 20 walls." } };
  const checked = calculateConstruction(definition, { values: { ...common.values, length: "1000000000", height: "1000000000", walls: "1" }, units: { ...common.units, length: "m", height: "m" } });
  if (!checked.ok) return checked;
  const measure = (state: ConstructionState, id: string, kind: UnitKind) => mul(decimal(state.values[id].trim()), decimal(constructionUnits(kind).find(unit => unit.id === state.units[id])!.factor));
  let wallArea = decimal("0"), ceilingArea = decimal("0");
  for (const [index, surface] of [...walls, ...(ceiling ? [ceiling] : [])].entries()) {
    const state = { values: { ...common.values, ...surface.values, walls: "1", deduction: "0" }, units: { ...common.units, ...surface.units } };
    const validation = calculateConstruction(definition, state);
    if (!validation.ok) return { ok: false, errors: Object.fromEntries(Object.entries(validation.errors).map(([key, value]) => [`${index}-${key}`, value])) };
    const area = mul(measure(state, "length", "length"), measure(state, "height", "length"));
    if (index < walls.length) wallArea = add(wallArea, area); else ceilingArea = area;
  }
  const deduction = measure(common, "deduction", "area");
  if (greater(deduction, wallArea)) return { ok: false, errors: { deduction: "Openings cannot exceed the combined wall area. Ceiling area cannot offset wall openings." } };
  const net = add(sub(wallArea, deduction), ceilingArea);
  const base = div(mul(net, decimal(common.values.coats.trim())), measure(common, "coverage", "coverage"));
  const paint = mul(base, add(decimal("1"), div(decimal(common.values.wastage.trim()), decimal("100"))));
  const rows: ResultRow[] = [];
  for (const [id, label, value, unit, places] of [
    ["grossAreaM2", "Combined wall area", wallArea, "m²", 4],
    ["ceilingAreaM2", "Ceiling area", ceilingArea, "m²", 4],
    ["deductionM2", "Openings deducted from walls", deduction, "m²", 4],
    ["netAreaM2", "Net walls and ceiling", net, "m²", 4],
    ["netAreaFt2", "Net walls and ceiling", div(net, squareFoot), "ft²", 4],
    ["basePaint", "Paint before wastage", base, "L", 3],
    ["paint", "Estimated paint including wastage", paint, "L", 3],
    ["paintGallons", "Estimated paint including wastage", div(paint, decimal("3.785411784")), "US gal", 3],
  ] as const) rows.push({ id, label, value: display(value, places), unit, numericValue: numeric(value) });
  const cost = common.values.price.trim() ? mul(paint, decimal(common.values.price.trim())) : undefined;
  rows.push({ id: "cost", label: "Estimated total cost", value: cost ? display(cost, 2) : "Not calculated", unit: "currency units", numericValue: cost ? numeric(cost) : null });
  return { ok: true, rows, values: Object.fromEntries(rows.map(row => [row.id, row.numericValue])) };
}
