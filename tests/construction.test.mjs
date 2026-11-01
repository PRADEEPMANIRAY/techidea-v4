import test from "node:test";
import assert from "node:assert/strict";
import { calculateConstruction, constructionDefaults, constructionSummary } from "../src/lib/calculators/construction.ts";
import { constructionDefinitions, getConstruction } from "../src/data/tools/construction.ts";
import { getPublishedTools } from "../src/data/tools/registry.ts";

function run(id, values = {}, units = {}) {
  const definition = getConstruction(id);
  const defaults = constructionDefaults(definition);
  return calculateConstruction(definition, { values: { ...defaults.values, ...values }, units: { ...defaults.units, ...units } });
}
function valid(id, values = {}, units = {}) {
  const result = run(id, values, units);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}
function near(actual, expected) {
  if (expected === null) return assert.equal(actual, null);
  assert.ok(Math.abs(actual - expected) <= Math.max(Math.abs(expected) * 1e-12, 1e-12), `${actual} != ${expected}`);
}

// Independently worked expected values: rectangular geometry in feet/meters,
// integer purchase arithmetic and manually calculated price/allowance totals.
// No implementation helper is used to construct these expected results.
const exampleAnswers = {
  "plywood-calculator": [
    { sheetAreaFt2: 32, totalAreaFt2: 160, pieceVolumeFt3: 2, totalVolumeFt3: 10, cost: 200 },
    { sheetAreaM2: 2.9768, totalAreaM2: 29.768, pieceVolumeM3: .0535824, totalVolumeM3: .535824, cost: 350 },
    { totalAreaFt2: 48, totalVolumeFt3: 2, cost: null },
  ],
  "wood-cft-calculator": [
    { pieceVolumeFt3: .6666666666666667, totalVolumeFt3: 6.666666666666667, totalVolumeM3: .18877897728, cost: 333.3333333333333 },
    { pieceVolumeM3: .01, totalVolumeM3: .2, totalVolumeFt3: 7.06293334429772, cost: 706.293334429772 },
    { totalVolumeFt3: 1, totalVolumeM3: .028316846592, cost: null },
  ],
  "tile-calculator": [
    { floorAreaM2: 20, tileAreaM2: .36, requiredTiles: 56, adjustedTiles: 62, boxes: 16, purchasedTiles: 64, cost: 400 },
    { floorAreaFt2: 120, tileAreaFt2: 1, requiredTiles: 120, adjustedTiles: 126, boxes: 13, purchasedTiles: 130, cost: 390 },
    { floorAreaM2: 6, tileAreaM2: .06, requiredTiles: 100, adjustedTiles: 100, boxes: null, cost: null },
  ],
  "paint-calculator": [
    { grossAreaM2: 40, netAreaM2: 36, basePaint: 7.2, paint: 7.92, cost: 95.04 },
    { grossAreaFt2: 288, netAreaFt2: 264, basePaint: 5.28, paint: 5.544, cost: 110.88 },
    { netAreaM2: 15, basePaint: 1.25, paint: 1.25, cost: null },
  ],
  "concrete-calculator": [
    { wetVolumeM3: 1.2, adjustedVolumeM3: 1.32 },
    { wetVolumeFt3: 26.666666666666667, adjustedVolumeFt3: 28, adjustedVolumeM3: .792871704576 },
    { wetVolumeM3: .45, adjustedVolumeM3: .45 },
  ],
};
for (const definition of constructionDefinitions) {
  definition.examples.forEach((example, index) => {
    test(`${definition.id}: realistic example ${index + 1}`, () => {
      const result = valid(definition.id, example.values, example.units);
      for (const [key, expected] of Object.entries(exampleAnswers[definition.id][index])) near(result.values[key], expected);
    });
  });
  test(`${definition.id}: all required positive fields reject zero/negative`, () => {
    for (const field of definition.fields.filter((field) => field.positive)) {
      for (const raw of ["0", "-1", "-0.001"]) {
        const result = run(definition.id, { [field.id]: raw });
        assert.equal(result.ok, false, `${field.id}: ${raw}`);
        assert.ok(result.errors[field.id]);
      }
    }
  });
  test(`${definition.id}: invalid input is rejected`, () => {
    const field = definition.fields[0].id;
    for (const raw of ["", " ", "NaN", "Infinity", "1,000", "1e3", "2 ft", "--1", ".", "1/2", "9".repeat(65), "1000000001"]) {
      const result = run(definition.id, { [field]: raw });
      assert.equal(result.ok, false, raw);
      assert.ok(result.errors[field]);
    }
    assert.equal(run(definition.id, {}, { [field]: "unknown" }).ok, false);
  });
  test(`${definition.id}: metric and imperial measurements agree`, () => {
    const values = { quantity: "1", walls: "1", coats: "1", deduction: "0", wastage: "0" };
    const units = {};
    for (const field of definition.fields.filter((field) => field.unitKind === "length")) { values[field.id] = "1"; units[field.id] = "ft"; }
    const reference = valid(definition.id, values, units).values;
    for (const [unit, value] of [["in", "12"], ["cm", "30.48"], ["m", "0.3048"], ["mm", "304.8"]]) {
      const alternateValues = { ...values }, alternateUnits = { ...units };
      for (const field of definition.fields.filter((field) => field.unitKind === "length")) { alternateValues[field.id] = value; alternateUnits[field.id] = unit; }
      const result = valid(definition.id, alternateValues, alternateUnits);
      for (const [key, expected] of Object.entries(reference)) near(result.values[key], expected);
    }
  });
  test(`${definition.id}: defaults/reset are fresh and valid`, () => {
    const first = constructionDefaults(definition);
    first.values[definition.fields[0].id] = "bad";
    const reset = constructionDefaults(definition);
    assert.equal(calculateConstruction(definition, reset).ok, true);
    assert.notEqual(first.values[definition.fields[0].id], reset.values[definition.fields[0].id]);
  });
}

for (const id of ["plywood-calculator", "wood-cft-calculator", "tile-calculator", "paint-calculator"]) {
  test(`${id}: optional price blank versus zero`, () => {
    const extra = id === "tile-calculator" ? { tilesPerBox: "4" } : {};
    assert.equal(valid(id, { ...extra, price: "" }).values.cost, null);
    assert.equal(valid(id, { ...extra, price: "  " }).values.cost, null);
    assert.equal(valid(id, { ...extra, price: "0" }).values.cost, 0);
    assert.equal(run(id, { ...extra, price: "-1" }).ok, false);
    assert.equal(run(id, { ...extra, price: "free" }).ok, false);
  });
}
for (const id of ["tile-calculator", "paint-calculator", "concrete-calculator"]) {
  test(`${id}: allowance bounds`, () => {
    assert.equal(run(id, { wastage: "0" }).ok, true);
    assert.equal(run(id, { wastage: "100" }).ok, true);
    assert.equal(run(id, { wastage: "-0.1" }).ok, false);
    assert.equal(run(id, { wastage: "100.0001" }).ok, false);
  });
}
test("Plywood: thickness changes volume, never face area or per-sheet cost", () => {
  const a = valid("plywood-calculator", { thickness: "10", price: "1.005" });
  const b = valid("plywood-calculator", { thickness: "20", price: "1.005" });
  assert.equal(a.values.totalAreaM2, b.values.totalAreaM2);
  near(b.values.totalVolumeM3, a.values.totalVolumeM3 * 2);
  assert.equal(a.values.cost, b.values.cost);
  assert.equal(a.rows.find((row) => row.id === "cost").value, "1.01");
});
test("Plywood: large quantities and fractional metric thickness", () => {
  const result = valid("plywood-calculator", { length: "2", width: "1", thickness: ".02", quantity: "1000000000", price: ".25" }, { length: "m", width: "m", thickness: "m" });
  near(result.values.totalAreaM2, 2000000000);
  near(result.values.totalVolumeM3, 40000000);
  near(result.values.cost, 250000000);
});
test("Wood: cost is based on total CFT, not pieces", () => {
  const result = valid("wood-cft-calculator", { length: "2", width: "1", thickness: "1", quantity: "3", price: "12.5" }, { length: "ft", width: "ft", thickness: "ft" });
  assert.equal(result.values.pieceVolumeFt3, 2);
  assert.equal(result.values.totalVolumeFt3, 6);
  assert.equal(result.values.cost, 75);
});
test("Counts cannot contain a fractional part hidden by floating-point rounding", () => {
  for (const [id, field] of [["plywood-calculator", "quantity"], ["wood-cft-calculator", "quantity"], ["tile-calculator", "tilesPerBox"], ["paint-calculator", "walls"], ["paint-calculator", "coats"]]) {
    for (const raw of ["1.5", "1.0000000000000000001"]) assert.equal(run(id, { [field]: raw }).ok, false);
  }
});
test("Tiles: exact decimal boundaries do not gain or lose a purchased tile", () => {
  const units = { floorLength: "m", floorWidth: "m", tileLength: "m", tileWidth: "m" };
  const base = { floorLength: ".07", floorWidth: "1", tileLength: ".01", tileWidth: "1", wastage: "0", tilesPerBox: "7", price: "10" };
  let result = valid("tile-calculator", base, units);
  assert.equal(result.values.requiredTiles, 7);
  assert.equal(result.values.adjustedTiles, 7);
  assert.equal(result.values.boxes, 1);
  result = valid("tile-calculator", { ...base, floorLength: "1.00000000000000001", tileLength: "1", tilesPerBox: "1" }, units);
  assert.equal(result.values.requiredTiles, 2);
  assert.equal(result.values.adjustedTiles, 2);
  assert.equal(result.values.boxes, 2);
});
test("Tiles: wastage applies to the raw area ratio, not a rounded tile count", () => {
  const result = valid("tile-calculator", { floorLength: "1.01", floorWidth: "1", tileLength: "1", tileWidth: "1", wastage: "10" }, { tileLength: "m", tileWidth: "m" });
  assert.equal(result.values.requiredTiles, 2);
  assert.equal(result.values.adjustedTiles, 2); // ceil(1.111), not ceil(2.2)
});
test("Tiles: box costs include whole boxes and unused purchased tiles", () => {
  const result = valid("tile-calculator", { floorLength: "10", floorWidth: "1", tileLength: "1", tileWidth: "1", wastage: "0", tilesPerBox: "3", price: "7.5" }, { tileLength: "m", tileWidth: "m" });
  assert.equal(result.values.adjustedTiles, 10);
  assert.equal(result.values.boxes, 4);
  assert.equal(result.values.purchasedTiles, 12);
  assert.equal(result.values.cost, 30);
});
test("Tiles: optional box size and price dependencies", () => {
  const result = valid("tile-calculator", { tilesPerBox: "", price: "" });
  assert.equal(result.values.boxes, null);
  assert.equal(result.values.cost, null);
  assert.equal(run("tile-calculator", { tilesPerBox: "", price: "0" }).ok, false);
  assert.equal(run("tile-calculator", { tilesPerBox: "", price: "20" }).ok, false);
  assert.equal(run("tile-calculator", { tilesPerBox: "0" }).ok, false);
});
test("Tiles: counts beyond the safe integer range fail clearly", () => {
  const result = run("tile-calculator", { floorLength: "1000000000", floorWidth: "1000000000", tileLength: ".000000001", tileWidth: ".000000001" }, { tileLength: "m", tileWidth: "m" });
  assert.equal(result.ok, false);
  assert.match(result.errors._form, /whole-number range/);
});
test("Paint: deductions are total, not multiplied by walls", () => {
  const result = valid("paint-calculator", { length: "2", height: "3", walls: "2", deduction: "2", coats: "1", coverage: "5", wastage: "0", price: "10" });
  assert.equal(result.values.grossAreaM2, 12);
  assert.equal(result.values.netAreaM2, 10);
  assert.equal(result.values.paint, 2);
  assert.equal(result.values.cost, 20);
});
test("Paint: full deduction gives zero paint and zero cost; excessive deduction is invalid", () => {
  const result = valid("paint-calculator", { deduction: "40", price: "10" });
  assert.equal(result.values.netAreaM2, 0);
  assert.equal(result.values.paint, 0);
  assert.equal(result.values.cost, 0);
  assert.equal(run("paint-calculator", { deduction: "40.00000000000000001" }).ok, false);
  assert.equal(run("paint-calculator", { deduction: "-1" }).ok, false);
});
test("Paint: adjustable coverage and coats", () => {
  const result = valid("paint-calculator", { length: "5", height: "2", walls: "1", deduction: "0", coats: "3", coverage: "6", wastage: "0" });
  assert.equal(result.values.paint, 5);
  const alternate = valid("paint-calculator", { length: "5", height: "2", walls: "1", deduction: "0", coats: "3", coverage: "12", wastage: "0" });
  assert.equal(alternate.values.paint, 2.5);
  assert.equal(run("paint-calculator", { coverage: "0" }).ok, false);
});
test("Paint: fractional wastage, display rounding and unrounded cost", () => {
  const result = valid("paint-calculator", { length: "5", height: "2", walls: "1", deduction: "0", coats: "1", coverage: "4", wastage: "1.1", price: "1000" });
  near(result.values.paint, 2.5275);
  assert.equal(result.rows.find((row) => row.id === "paint").value, "2.528");
  near(result.values.cost, 2527.5);
  assert.equal(result.rows.find((row) => row.id === "cost").value, "2,527.50");
});
test("Concrete: decimal dimensions, fractional wastage and no dry-volume multiplier", () => {
  const result = valid("concrete-calculator", { length: "2.5", width: "1.2", depth: ".15", wastage: "2.5" }, { depth: "m" });
  near(result.values.wetVolumeM3, .45);
  near(result.values.adjustedVolumeM3, .46125);
  const zeroWaste = valid("concrete-calculator", { wastage: "0" });
  assert.equal(zeroWaste.values.wetVolumeM3, zeroWaste.values.adjustedVolumeM3);
});
test("Tiny positive dimensions are not displayed as zero", () => {
  const result = valid("concrete-calculator", { length: ".001", width: ".001", depth: ".001", wastage: "0" }, { depth: "m" });
  near(result.values.wetVolumeM3, .000000001);
  assert.equal(result.rows.find((row) => row.id === "wetVolumeM3").value, "<0.000001");
});
test("Copy summary retains labels, units, optional omissions and costs", () => {
  const result = valid("plywood-calculator");
  const summary = constructionSummary("Plywood Calculator", result.rows);
  assert.match(summary, /^Plywood Calculator\n/);
  assert.match(summary, /Area per sheet \(one face\).*m²/);
  assert.match(summary, /Total volume.*m³/);
  assert.match(summary, /Estimated total cost: Not calculated/);
});
test("Exactly five complete construction tools are published", () => {
  const published = getPublishedTools().filter((tool) => tool.category === "construction-calculators");
  assert.equal(published.length, 5);
  assert.deepEqual(published.map((tool) => tool.id).sort(), constructionDefinitions.map((definition) => definition.id).sort());
  for (const tool of published) assert.equal(tool.href, `/tools/${tool.id}`);
});
