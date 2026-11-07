import test from "node:test";
import assert from "node:assert/strict";
import { calculateConstruction, calculateWoodBatch, calculatePaintWalls, constructionDefaults, constructionSummary, isConstructionFieldActive } from "../src/lib/calculators/construction.ts";
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
    { targetAreaFt2: 100, requiredSheets: 4, adjustedSheets: 4, cost: 160 },
    { targetAreaM2: 18, sheetAreaM2: 2.9768, requiredSheets: 7, adjustedSheets: 7, cost: 14000 },
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
    { wetVolumeFt3: 2.0943951023931953, adjustedVolumeFt3: 2.199114857512855, adjustedVolumeYd3: .08144869842640204 },
    { wetVolumeM3: .21205750411731103, adjustedVolumeM3: .2290221044466959, bags: 18 },
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
    for (const field of definition.fields.filter((field) => field.positive && isConstructionFieldActive(definition, constructionDefaults(definition), field.id))) {
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
test("Concrete: geometric modes match rectangular and cylindrical formulas", () => {
  const slab = valid("concrete-calculator", { shape: "rectangular-slab", length: "2", width: "1.5", depth: "0.15", wastage: "10" }, { length: "m", width: "m", depth: "m" });
  near(slab.values.wetVolumeM3, 0.45);
  near(slab.values.adjustedVolumeM3, 0.495);

  const footing = valid("concrete-calculator", { shape: "circular-footing", diameter: "0.6", depth: "0.3", wastage: "10" }, { diameter: "m", depth: "m" });
  near(footing.values.wetVolumeM3, 0.08482300164692441);
  near(footing.values.adjustedVolumeM3, 0.09330530181161685);

  const column = valid("concrete-calculator", { shape: "rectangular-column", width: "0.3", depth: "0.3", height: "3", wastage: "8" }, { width: "m", depth: "m", height: "m" });
  near(column.values.wetVolumeM3, 0.27);
  near(column.values.adjustedVolumeM3, 0.2916);

  const cylinder = valid("concrete-calculator", { shape: "cylindrical-column", diameter: "0.5", height: "2", wastage: "0" }, { diameter: "m", height: "m" });
  near(cylinder.values.wetVolumeM3, 0.39269908169872414);
});

test("Concrete: default bag size and custom bag yield both produce realistic bag counts", () => {
  const defaultBag = valid("concrete-calculator", { shape: "rectangular-slab", length: "1", width: "1", depth: "0.5", wastage: "0", price: "5" }, { length: "m", width: "m", depth: "m" });
  assert.equal(defaultBag.values.bags, 40);
  near(defaultBag.values.cost, 200);

  const override = valid("concrete-calculator", { shape: "rectangular-slab", length: "1", width: "1", depth: "0.5", wastage: "0", bagSize: "40", bagYield: "0.5", price: "5" }, { length: "m", width: "m", depth: "m" });
  assert.equal(override.values.bags, 36);
  near(override.values.cost, 180);
});

test("Concrete: unsupported shape and invalid bag selection are rejected", () => {
  assert.equal(run("concrete-calculator", { shape: "unknown" }).ok, false);
  assert.equal(run("concrete-calculator", { bagSize: "99" }).ok, false);
  assert.equal(run("concrete-calculator", { shape: "circular-footing", diameter: "-1", depth: "0.3" }, { diameter: "m", depth: "m" }).ok, false);
  assert.equal(run("concrete-calculator", { shape: "cylindrical-column", diameter: "0.5", height: "-1" }, { diameter: "m", height: "m" }).ok, false);
});

test("Plywood: preset selections update a standard sheet size without disabling custom dimensions", () => {
  const preset = valid("plywood-calculator", { sheetPreset: "2440x1220-mm", quantity: "1", thickness: "18", price: "35" }, { thickness: "mm" });
  assert.equal(preset.values.sheetAreaM2, 2.9768);
  assert.equal(preset.values.totalAreaM2, 2.9768);

  const custom = valid("plywood-calculator", { sheetPreset: "custom", length: "4", width: "8", thickness: "18", quantity: "2", price: "35" }, { length: "ft", width: "ft", thickness: "mm" });
  near(custom.values.totalAreaFt2, 64);
  near(custom.values.cost, 70);
});

test("Exactly five complete construction tools are published", () => {
  const published = getPublishedTools().filter((tool) => tool.category === "construction-calculators");
  assert.equal(published.length, 5);
  assert.deepEqual(published.map((tool) => tool.id).sort(), constructionDefinitions.map((definition) => definition.id).sort());
  for (const tool of published) assert.equal(tool.href, `/tools/${tool.id}`);
});

for (const [shape, values, units, expected] of [
  ["rectangular-footing", {length:"3",width:"2",depth:"18"}, {length:"ft",width:"ft",depth:"in"}, 9],
  ["rectangular-column", {width:"12",depth:"12",height:"9"}, {width:"in",depth:"in",height:"ft"}, 9],
  ["circular-footing", {diameter:"24",depth:"12"}, {diameter:"in",depth:"in"}, Math.PI],
  ["cylindrical-column", {diameter:"2",height:"3"}, {diameter:"ft",height:"ft"}, 3*Math.PI],
]) test(`Concrete independent imperial geometry: ${shape}`, () => {
  const result = valid("concrete-calculator", {shape, ...values, wastage:"0"}, units);
  near(result.values.wetVolumeFt3, expected);
  near(result.values.wetVolumeYd3, expected/27);
  near(result.values.wetVolumeM3, expected*0.028316846592);
});
for (const [bagSize, expected] of [["40",90],["60",60],["80",45]]) {
  test(`Concrete: one cubic yard with ${bagSize} lb bags`, () => {
    const result = valid("concrete-calculator", {length:"3",width:"3",depth:"3",wastage:"0",bagSize,price:"1.005"}, {length:"ft",width:"ft",depth:"ft"});
    assert.equal(result.values.bags,expected);
    near(result.values.wetVolumeYd3,1);
    near(result.values.cost,expected*1.005);
  });
}
test("Concrete: exact bag boundary rounds once, before display", () => {
  const base={length:"1",width:"1",depth:".6",wastage:"0",bagSize:"80"};
  const units={length:"ft",width:"ft",depth:"ft"};
  assert.equal(valid("concrete-calculator",base,units).values.bags,1);
  assert.equal(valid("concrete-calculator",{...base,depth:".600000000000000001"},units).values.bags,2);
  assert.equal(valid("concrete-calculator",{...base,wastage:"1"},units).values.bags,2);
});
test("Concrete: invalid yields cannot crash or silently calculate", () => {
  for (const bagYield of ["0","-1","NaN","Infinity","1e-3","1,000"]) assert.equal(run("concrete-calculator",{bagYield}).ok,false);
  assert.equal(run("concrete-calculator",{bagYield:".000000000000000000000001"}).ok,false);
});
test("Concrete: only dimensions for selected shape are required", () => {
  assert.equal(run("concrete-calculator",{shape:"circular-footing",length:"",width:"bad",height:"-1"}).ok,true);
  for (const [shape,field] of [["rectangular-slab","length"],["rectangular-footing","width"],["circular-footing","diameter"],["rectangular-column","height"],["cylindrical-column","height"]]) {
    assert.equal(run("concrete-calculator",{shape,[field]:""}).ok,false);
    assert.equal(run("concrete-calculator",{shape,[field]:"0"}).ok,false);
  }
});
test("Concrete: volume pricing, blank and zero prices", () => {
  const base={length:"1",width:"1",depth:"1",wastage:"10",priceBasis:"m3",price:"100"};
  near(valid("concrete-calculator",base,{depth:"m"}).values.cost,110);
  near(valid("concrete-calculator",{...base,length:"3",width:"3",depth:"3",priceBasis:"yd3"},{length:"ft",width:"ft",depth:"ft"}).values.cost,110);
  assert.equal(valid("concrete-calculator",{price:""}).values.cost,null);
  assert.equal(valid("concrete-calculator",{price:"0"}).values.cost,0);
  assert.equal(run("concrete-calculator",{priceBasis:"unknown"}).ok,false);
  assert.equal(run("concrete-calculator",{price:"-1"}).ok,false);
});
for (const [sheetPreset, expected] of [["8x4-ft",32],["4x8-ft",32],["7x4-ft",28],["6x4-ft",24]]) test(`Plywood: ${sheetPreset} overrides stale dimensions and units`,()=>{
  near(valid("plywood-calculator",{sheetPreset,length:"99",width:"99"},{length:"m",width:"mm"}).values.sheetAreaFt2,expected);
});
test("Plywood: metric presets, custom size and whole-sheet wastage cost",()=>{
  near(valid("plywood-calculator",{sheetPreset:"2400x1200-mm"}).values.sheetAreaM2,2.88);
  const result=valid("plywood-calculator",{sheetPreset:"custom",length:"2",width:"1",quantity:"3",wastage:"10",price:"12.5"},{length:"m",width:"m"});
  assert.equal(result.values.adjustedSheets,4);
  assert.equal(result.values.adjustedAreaM2,8);
  assert.equal(result.values.cost,50);
  assert.equal(run("plywood-calculator",{sheetPreset:"unknown"}).ok,false);
});

// Independent area-to-sheet purchasing cases; none use production formulas for expectations.
test("Plywood area mode: apply allowance before rounding, not to rounded sheets", () => {
  const result = valid("plywood-calculator", {estimateMode:"area",targetArea:"100",sheetPreset:"8x4-ft",wastage:"10",price:"40"},{targetArea:"ft2"});
  assert.equal(result.values.requiredSheets,4);
  assert.equal(result.values.adjustedSheets,4); // ceil(110/32), not ceil(ceil(100/32)*1.1)
  assert.equal(result.values.adjustedAreaFt2,128);
  assert.equal(result.values.cost,160);
});
test("Plywood area mode: exact sheet boundary and just above it", () => {
  const base={estimateMode:"area",targetArea:"64",sheetPreset:"8x4-ft",wastage:"0"};
  assert.equal(valid("plywood-calculator",base,{targetArea:"ft2"}).values.adjustedSheets,2);
  assert.equal(valid("plywood-calculator",{...base,targetArea:"64.000000000000000001"},{targetArea:"ft2"}).values.adjustedSheets,3);
});
test("Plywood area mode: mixed units and equivalent metric target", () => {
  const values={estimateMode:"area",targetArea:"9.290304",sheetPreset:"8x4-ft",wastage:"10",price:"40"};
  const result=valid("plywood-calculator",values,{targetArea:"m2"});
  near(result.values.targetAreaFt2,100);
  assert.equal(result.values.adjustedSheets,4);
  assert.equal(result.values.cost,160);
});
test("Plywood area mode: custom metric sheets and whole-sheet volume", () => {
  const result=valid("plywood-calculator",{estimateMode:"area",targetArea:"5",sheetPreset:"custom",length:"2",width:"1",thickness:"10",wastage:"0",price:"12.5"},{targetArea:"m2",length:"m",width:"m",thickness:"mm"});
  assert.equal(result.values.requiredSheets,3);
  assert.equal(result.values.totalAreaM2,6);
  near(result.values.totalVolumeM3,.06);
  assert.equal(result.values.cost,37.5);
});
test("Plywood area mode: zero and full allowances, blank and zero prices", () => {
  const base={estimateMode:"area",targetArea:"32",sheetPreset:"8x4-ft",wastage:"100"};
  assert.equal(valid("plywood-calculator",base,{targetArea:"ft2"}).values.adjustedSheets,2);
  assert.equal(valid("plywood-calculator",base).values.cost,null);
  assert.equal(valid("plywood-calculator",{...base,price:"0"}).values.cost,0);
  assert.equal(run("plywood-calculator",{...base,wastage:"100.1"}).ok,false);
});
test("Plywood area mode: invalid target area and unit are rejected", () => {
  for(const targetArea of ["","0","-1","NaN","Infinity","1,000","1e3","1000000001"]) {
    const result=run("plywood-calculator",{estimateMode:"area",targetArea});
    assert.equal(result.ok,false,targetArea);
    assert.ok(result.errors.targetArea);
  }
  assert.equal(run("plywood-calculator",{estimateMode:"area"},{targetArea:"yd2"}).ok,false);
  assert.equal(run("plywood-calculator",{estimateMode:"unknown"}).ok,false);
});
test("Plywood modes ignore only their unused source input", () => {
  assert.equal(run("plywood-calculator",{estimateMode:"area",quantity:"bad"}).ok,true);
  assert.equal(run("plywood-calculator",{estimateMode:"sheets",targetArea:"bad"}).ok,true);
  assert.equal(run("plywood-calculator",{estimateMode:"sheets",quantity:"bad"}).ok,false);
});
test("Plywood area mode: thickness changes volume, not sheet count or cost", () => {
  const base={estimateMode:"area",targetArea:"100",wastage:"10",price:"40"};
  const a=valid("plywood-calculator",{...base,thickness:"10"});
  const b=valid("plywood-calculator",{...base,thickness:"20"});
  assert.equal(a.values.adjustedSheets,b.values.adjustedSheets);
  assert.equal(a.values.cost,b.values.cost);
  near(b.values.adjustedVolumeM3,a.values.adjustedVolumeM3*2);
});
test("Plywood area mode: enormous sheet counts fail without imprecise integers", () => {
  const result=run("plywood-calculator",{estimateMode:"area",targetArea:"1000000000",length:".000000001",width:".000000001"},{targetArea:"m2",length:"m",width:"m"});
  assert.equal(result.ok,false);
  assert.match(result.errors._form,/whole-number range/);
});
test("Plywood area mode: copied estimate identifies target, purchase count and cost", () => {
  const result=valid("plywood-calculator",{estimateMode:"area",targetArea:"100",wastage:"10",price:"40"});
  const summary=constructionSummary("Plywood Calculator",result.rows);
  assert.match(summary,/Surface area to cover.*ft²/);
  assert.match(summary,/Sheets to purchase including wastage: 4 sheets/);
  assert.match(summary,/Estimated total cost: 160.00/);
});

test('timber list sums independent mixed-unit rows and per-CFT prices', () => {
  const definition = getConstruction('wood-cft-calculator');
  const row = (values, units) => ({values: {...constructionDefaults(definition).values, ...values}, units: {...constructionDefaults(definition).units, ...units}});
  const result = calculateWoodBatch(definition, [row({length:'12',width:'12',thickness:'1',quantity:'2',price:'100'}, {length:'in',width:'in',thickness:'ft'}), row({length:'0.3048',width:'30.48',thickness:'304.8',quantity:'1',price:'200'}, {length:'m',width:'cm',thickness:'mm'})]);
  assert.equal(result.ok,true); assert.equal(result.values.totalVolumeFt3,3); assert.equal(result.values.boardFeet,36); assert.equal(result.values.cost,400);
});
test('timber list totals do not sum rounded display values', () => {
  const definition = getConstruction('wood-cft-calculator');
  const state = {values:{...constructionDefaults(definition).values,length:'0.004',width:'1',thickness:'1',quantity:'1',price:''},units:{length:'ft',width:'in',thickness:'in'}};
  const result = calculateWoodBatch(definition,[state,state,state]);
  assert.equal(result.ok,true); assert.ok(Math.abs(result.values.totalVolumeFt3 - 0.012/144)<1e-15);
  assert.match(result.rows.find(r=>r.id==='cost').label,/missing/);
  assert.equal(calculateWoodBatch(definition,[]).ok,false);
  assert.equal(calculateWoodBatch(definition,Array(21).fill(state)).ok,false);
  assert.equal(calculateWoodBatch(definition,[{...state,values:{...state.values,quantity:'1.5'}}]).ok,false);
});

test('separate walls and ceiling use one deduction and common paint assumptions', () => {
  const definition = getConstruction('paint-calculator');
  const common = constructionDefaults(definition);
  Object.assign(common.values,{deduction:'2',coats:'2',coverage:'10',wastage:'10',price:'100'});
  Object.assign(common.units,{deduction:'m2',coverage:'m2'});
  const wall = (length,height,unit='m') => ({values:{length,height},units:{length:unit,height:unit}});
  const result = calculatePaintWalls(definition,common,[wall('4','3'),wall('2','3')],wall('4','2'));
  assert.equal(result.ok,true); assert.equal(result.values.netAreaM2,24); assert.equal(result.values.paint,5.28); assert.equal(result.values.cost,528);
  const imperial = calculatePaintWalls(definition,{...common,values:{...common.values,deduction:'0',wastage:'0'}},[wall('10','10','ft')]);
  assert.equal(imperial.ok,true); assert.equal(imperial.values.netAreaM2,9.290304);
});
test('paint wall validation prevents ceiling masking excessive wall deductions', () => {
  const definition = getConstruction('paint-calculator');
  const common = constructionDefaults(definition);
  Object.assign(common.values,{deduction:'13'}); common.units.deduction='m2';
  const wall = {values:{length:'4',height:'3'},units:{length:'m',height:'m'}};
  const result = calculatePaintWalls(definition,common,[wall],wall);
  assert.equal(result.ok,false); assert.match(result.errors.deduction,/wall area/);
  assert.equal(calculatePaintWalls(definition,common,[]).ok,false);
  assert.equal(calculatePaintWalls(definition,common,Array(21).fill(wall)).ok,false);
  assert.equal(calculatePaintWalls(definition,common,[{...wall,values:{length:'NaN',height:'3'}}]).ok,false);
});

test('timber aggregate rejects unsafe totals and retains per-piece CFT', () => {
 const definition=getConstruction('wood-cft-calculator'),state=constructionDefaults(definition);
 const ordinary=calculateWoodBatch(definition,[state]);assert.equal(ordinary.ok,true);assert.ok(ordinary.rows.some(r=>r.id==='row1-pieceVolumeFt3'));
 const giant={values:{...state.values,length:'1000000',width:'1000000',thickness:'1000000',quantity:'1'},units:{length:'m',width:'m',thickness:'m'}};
 assert.equal(calculateWoodBatch(definition,[giant]).ok,false);
});
