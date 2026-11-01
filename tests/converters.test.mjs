import test from "node:test";
import assert from "node:assert/strict";
import { converterDefinitions, getConverter } from "../src/lib/converters/definitions.ts";
import { convert, conversionFormula, formatResult, parseValue, swapUnits } from "../src/lib/converters/calculate.ts";
import { converterContent } from "../src/data/tools/converter-content.ts";
import { getPublishedTools } from "../src/data/tools/registry.ts";

function close(actual, expected, label = "") {
  assert.ok(Math.abs(actual - expected) <= Math.max(Math.abs(expected) * 1e-12, 1e-12), `${label}: ${actual} != ${expected}`);
}
function value(id, input, from, to) {
  const result = convert(getConverter(id), String(input), from, to);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
}

// Independent reference values, not read from implementation factors.
const reference = {
  "length-converter": ["m", { mm: .001, cm: .01, m: 1, km: 1000, in: .0254, ft: .3048, yd: .9144, mi: 1609.344 }],
  "weight-converter": ["kg", { mg: .000001, g: .001, kg: 1, t: 1000, oz: .028349523125, lb: .45359237 }],
  "area-converter": ["m2", { mm2: .000001, cm2: .0001, m2: 1, km2: 1000000, in2: .00064516, ft2: .09290304, yd2: .83612736, acre: 4046.8564224, ha: 10000 }],
  "volume-converter": ["l", { ml: .001, l: 1, cm3: .001, m3: 1000, in3: .016387064, ft3: 28.316846592, "us-gal": 3.785411784, "imp-gal": 4.54609 }],
};

for (const [id, [base, units]] of Object.entries(reference)) {
  test(`${id}: complete supported unit set`, () => {
    assert.deepEqual(getConverter(id).units.map((unit) => unit.id).sort(), Object.keys(units).sort());
  });
  for (const [unit, factor] of Object.entries(units)) {
    test(`${id}: ${unit}, reverse, zero and signed decimals`, () => {
      close(value(id, 1, unit, base), factor);
      close(value(id, factor, base, unit), 1);
      assert.equal(value(id, 0, unit, base), 0);
      close(value(id, 2.5, unit, base), 2.5 * factor);
      close(value(id, -.25, unit, base), -.25 * factor);
    });
  }
}

const temperatureCases = [
  [0, "c", "f", 32], [100, "c", "f", 212], [32, "f", "c", 0], [212, "f", "c", 100],
  [-40, "c", "f", -40], [-40, "f", "c", -40], [0, "c", "k", 273.15],
  [273.15, "k", "c", 0], [32, "f", "k", 273.15], [273.15, "k", "f", 32],
  [37.5, "c", "f", 99.5], [0, "f", "c", -17.77777777777778],
];
for (const [input, from, to, expected] of temperatureCases) {
  test(`Temperature: ${input} ${from} → ${to}`, () => close(value("temperature-converter", input, from, to), expected));
}

test("Temperature: all absolute-zero boundaries and same-unit validation", () => {
  const minima = { c: -273.15, f: -459.67, k: 0 };
  for (const [from, minimum] of Object.entries(minima)) {
    for (const [to, expected] of Object.entries(minima)) {
      assert.equal(value("temperature-converter", minimum, from, to), expected);
      const rejected = convert(getConverter("temperature-converter"), String(minimum - .000001), from, to);
      assert.equal(rejected.ok, false);
      assert.match(rejected.error, /absolute zero/);
    }
  }
  for (const [input, unit] of [["-273.1500000000000000001", "c"], ["-4.596700000000000000001e2", "f"], ["-1e-20", "k"]]) {
    assert.equal(convert(getConverter("temperature-converter"), input, unit, unit).ok, false);
  }
  assert.equal(value("temperature-converter", "-273.1500000000000000000", "c", "k"), 0);
  assert.equal(value("temperature-converter", "-0", "k", "k"), 0);
});

for (const definition of converterDefinitions) {
  test(`${definition.id}: all unit-pair round trips, identity and formulas`, () => {
    for (const from of definition.units) {
      for (const to of definition.units) {
        const converted = value(definition.id, 12.375, from.id, to.id);
        close(value(definition.id, converted, to.id, from.id), 12.375, `${from.id}/${to.id}`);
        assert.equal(typeof conversionFormula(definition, from.id, to.id), "string");
      }
      assert.equal(value(definition.id, 123456789.125, from.id, from.id), 123456789.125);
    }
  });
  test(`${definition.id}: invalid input and unsupported units`, () => {
    for (const raw of ["", " ", "NaN", "Infinity", "-Infinity", "0x10", "1e", ".", "--1", "1,234", "1/2", "12 kg", "1e309", "-1e309", "1e-9999", "9".repeat(129)]) {
      assert.equal(convert(definition, raw, definition.defaultFrom, definition.defaultTo).ok, false, raw);
    }
    assert.equal(convert(definition, "1", "bogus", definition.defaultTo).ok, false);
    assert.equal(convert(definition, "1", definition.defaultFrom, "bogus").ok, false);
  });
  test(`${definition.id}: swap preserves input and precision and recalculates`, () => {
    const state = { input: "2.50", precision: 4, from: definition.defaultFrom, to: definition.defaultTo };
    const swapped = swapUnits(state);
    assert.equal(swapped.from, state.to);
    assert.equal(swapped.to, state.from);
    assert.equal(swapped.input, "2.50");
    assert.equal(swapped.precision, 4);
    assert.deepEqual(swapUnits(swapped), state);
    assert.equal(convert(definition, swapped.input, swapped.from, swapped.to).ok, true);
    assert.notEqual(value(definition.id, state.input, state.from, state.to), value(definition.id, swapped.input, swapped.from, swapped.to));
  });
}

test("Large inputs avoid unnecessary overflow; out-of-range results are errors", () => {
  close(value("length-converter", "1e308", "m", "km"), 1e305);
  close(value("area-converter", "1e300", "km2", "m2"), 1e306);
  close(value("weight-converter", "1e20", "t", "kg"), 1e23);
  close(value("volume-converter", "1e12", "m3", "l"), 1e15);
  close(value("temperature-converter", "1e308", "f", "c"), 5.555555555555556e307);
  for (const [id, raw, from, to] of [["length-converter", "1e308", "km", "mm"], ["temperature-converter", "1e308", "c", "f"], ["length-converter", "5e-324", "mm", "km"]]) {
    assert.equal(convert(getConverter(id), raw, from, to).ok, false);
  }
});

test("Decimal/scientific parsing and signed zero", () => {
  for (const [raw, expected] of [[" +.5 ", .5], ["1.", 1], ["2.5e3", 2500], ["-2E-3", -.002], ["-0", 0], ["0e999", 0]]) {
    assert.deepEqual(parseValue(raw), { ok: true, value: expected });
  }
});

test("Precision formatting, decimal ties, zero and scientific notation", () => {
  assert.equal(formatResult(1.005, 2), "1.01");
  assert.equal(formatResult(-1.005, 2), "-1.01");
  assert.equal(formatResult(1 / 3, 10), "0.3333333333");
  assert.equal(formatResult(12.7, 0), "13");
  assert.equal(formatResult(0, 6), "0.000000");
  assert.equal(formatResult(-0, 2), "0.00");
  assert.equal(formatResult(-.0001, 2), "0.00");
  assert.equal(formatResult(1e30, 2), "1.00e+30");
  assert.equal(formatResult(1e-20, 4), "1.0000e-20");
  assert.equal(formatResult(1e-10, 10), "0.0000000001");
  for (const precision of [-1, 11, 2.5, NaN]) assert.throws(() => formatResult(1, precision), RangeError);
  assert.throws(() => formatResult(Infinity, 2), RangeError);
});

test("Gallon definitions and international acre stay distinct", () => {
  close(value("volume-converter", 1, "us-gal", "in3"), 231);
  close(value("volume-converter", 1, "imp-gal", "l"), 4.54609);
  assert.ok(value("volume-converter", 1, "imp-gal", "us-gal") > 1.2);
  close(value("area-converter", 1, "acre", "ft2"), 43560);
  assert.ok(!getConverter("area-converter").units.some((unit) => /bigha/i.test(unit.name)));
});

test("Temperature formulas include all six directed scale/offset equations", () => {
  const definition = getConverter("temperature-converter");
  const expected = { "c:f": "°F = (°C × 9/5) + 32", "f:c": "°C = (°F − 32) × 5/9", "c:k": "K = °C + 273.15", "k:c": "°C = K − 273.15", "f:k": "K = (°F + 459.67) × 5/9", "k:f": "°F = (K × 9/5) − 459.67" };
  for (const [pair, formula] of Object.entries(expected)) assert.equal(conversionFormula(definition, ...pair.split(":")), formula);
});

const exampleResults = {
  "length-converter": ["2500", "30.48", "8.04672"],
  "weight-converter": ["2500", "453.59237", "750"],
  "temperature-converter": ["68.0", "176.67", "-273.15"],
  "area-converter": ["215.28", "25000", "43560"],
  "volume-converter": ["0.75", "18.92706", "22.73045"],
};
for (const [id, expected] of Object.entries(exampleResults)) {
  test(`${id}: all three published practical examples`, () => {
    assert.equal(converterContent[id].examples.length, 3);
    converterContent[id].examples.forEach((example, index) => {
      assert.equal(formatResult(value(id, example.value, example.from, example.to), example.precision), expected[index]);
    });
  });
}

test("Registry preserves the five original complete converters", () => {
  const published = getPublishedTools().filter((tool) => tool.category === "unit-converters" && tool.id !== "tola-to-gram-converter" && tool.id !== "nepal-land-area-converter" && tool.id !== "bhutan-land-area-converter");
  assert.equal(published.length, 5);
  assert.deepEqual(published.map((tool) => tool.id).sort(), converterDefinitions.map((definition) => definition.id).sort());
  for (const tool of published) {
    assert.equal(tool.href, `/tools/${tool.id}`);
    assert.ok(converterContent[tool.id]?.intro);
  }
});
