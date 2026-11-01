export type Unit = Readonly<{
  id: string;
  name: string;
  symbol: string;
  factor: number;
}>;

export type ConverterDefinition = Readonly<{
  id: string;
  kind: "linear" | "temperature";
  baseSymbol: string;
  defaultFrom: string;
  defaultTo: string;
  units: readonly Unit[];
}>;

// Factors are in the stated base unit. International inch/foot and
// avoirdupois mass are used; gallons are liquid gallons, not US dry gallons.
export const converterDefinitions: readonly ConverterDefinition[] = [
  {
    id: "length-converter", kind: "linear", baseSymbol: "m", defaultFrom: "m", defaultTo: "ft",
    units: [
      { id: "mm", name: "Millimeter", symbol: "mm", factor: 0.001 },
      { id: "cm", name: "Centimeter", symbol: "cm", factor: 0.01 },
      { id: "m", name: "Meter", symbol: "m", factor: 1 },
      { id: "km", name: "Kilometer", symbol: "km", factor: 1000 },
      { id: "in", name: "Inch", symbol: "in", factor: 0.0254 },
      { id: "ft", name: "Foot", symbol: "ft", factor: 0.3048 },
      { id: "yd", name: "Yard", symbol: "yd", factor: 0.9144 },
      { id: "mi", name: "Mile", symbol: "mi", factor: 1609.344 },
    ],
  },
  {
    id: "weight-converter", kind: "linear", baseSymbol: "kg", defaultFrom: "kg", defaultTo: "lb",
    units: [
      { id: "mg", name: "Milligram", symbol: "mg", factor: 0.000001 },
      { id: "g", name: "Gram", symbol: "g", factor: 0.001 },
      { id: "kg", name: "Kilogram", symbol: "kg", factor: 1 },
      { id: "t", name: "Metric Ton", symbol: "t", factor: 1000 },
      { id: "oz", name: "Ounce", symbol: "oz", factor: 0.028349523125 },
      { id: "lb", name: "Pound", symbol: "lb", factor: 0.45359237 },
    ],
  },
  {
    id: "temperature-converter", kind: "temperature", baseSymbol: "K", defaultFrom: "c", defaultTo: "f",
    // Temperature uses affine formulas, not these scale factors alone.
    units: [
      { id: "c", name: "Celsius", symbol: "°C", factor: 1 },
      { id: "f", name: "Fahrenheit", symbol: "°F", factor: 5 / 9 },
      { id: "k", name: "Kelvin", symbol: "K", factor: 1 },
    ],
  },
  {
    id: "area-converter", kind: "linear", baseSymbol: "m²", defaultFrom: "m2", defaultTo: "ft2",
    units: [
      { id: "mm2", name: "Square Millimeter", symbol: "mm²", factor: 0.000001 },
      { id: "cm2", name: "Square Centimeter", symbol: "cm²", factor: 0.0001 },
      { id: "m2", name: "Square Meter", symbol: "m²", factor: 1 },
      { id: "km2", name: "Square Kilometer", symbol: "km²", factor: 1000000 },
      { id: "in2", name: "Square Inch", symbol: "in²", factor: 0.00064516 },
      { id: "ft2", name: "Square Foot", symbol: "ft²", factor: 0.09290304 },
      { id: "yd2", name: "Square Yard", symbol: "yd²", factor: 0.83612736 },
      { id: "acre", name: "Acre", symbol: "ac", factor: 4046.8564224 },
      { id: "ha", name: "Hectare", symbol: "ha", factor: 10000 },
    ],
  },
  {
    id: "volume-converter", kind: "linear", baseSymbol: "L", defaultFrom: "l", defaultTo: "us-gal",
    units: [
      { id: "ml", name: "Milliliter", symbol: "mL", factor: 0.001 },
      { id: "l", name: "Liter", symbol: "L", factor: 1 },
      { id: "cm3", name: "Cubic Centimeter", symbol: "cm³", factor: 0.001 },
      { id: "m3", name: "Cubic Meter", symbol: "m³", factor: 1000 },
      { id: "in3", name: "Cubic Inch", symbol: "in³", factor: 0.016387064 },
      { id: "ft3", name: "Cubic Foot", symbol: "ft³", factor: 28.316846592 },
      { id: "us-gal", name: "US Gallon (liquid)", symbol: "US gal", factor: 3.785411784 },
      { id: "imp-gal", name: "Imperial Gallon", symbol: "Imp gal", factor: 4.54609 },
    ],
  },
];

export function getConverter(id: string) {
  return converterDefinitions.find((converter) => converter.id === id);
}
