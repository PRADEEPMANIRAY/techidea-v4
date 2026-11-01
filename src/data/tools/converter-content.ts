export type ConverterExample = {
  title: string; value: string; from: string; to: string; precision: number; explanation: string;
};
type ConverterContent = {
  intro: string;
  formulaExplanation: string;
  notes: readonly string[];
  examples: readonly [ConverterExample, ConverterExample, ConverterExample, ...ConverterExample[]];
  faqs: readonly [string, string][];
};

export const converterContent: Record<string, ConverterContent> = {
  "length-converter": {
    intro: "Compare a product dimension in inches with a metric drawing, translate a walking distance from miles to kilometers, or express a small measurement in millimeters. This converter uses the international inch, foot, yard and mile; it does not use the retired US survey foot.",
    formulaExplanation: "Multiply the input by its meter factor, then divide by the destination unit's meter factor. For example, an inch is exactly 0.0254 meters, so inches to centimeters uses 0.0254 ÷ 0.01 = 2.54.",
    notes: ["1 foot = 12 inches; 1 yard = 3 feet; 1 mile = 1,760 yards.", "Negative inputs are useful for signed distances or changes in position."],
    examples: [
      { title: "A 2.5-kilometer walk", value: "2.5", from: "km", to: "m", precision: 0, explanation: "Multiply kilometers by 1,000 to express the route in meters." },
      { title: "A 12-inch shelf", value: "12", from: "in", to: "cm", precision: 2, explanation: "Each inch is exactly 2.54 centimeters, giving a 30.48-centimeter dimension." },
      { title: "A five-mile route", value: "5", from: "mi", to: "km", precision: 5, explanation: "Each international mile is 1.609344 kilometers. The displayed value is rounded to five decimal places." },
    ],
    faqs: [
      ["Which standard foot and mile definition does this converter use?", "This converter uses the international yard and pound definition established in 1959, where 1 inch is exactly 0.0254 meters, 1 foot is 0.3048 meters, and 1 international mile is 1,609.344 meters. It does not use the historical US Survey foot, which was officially deprecated for modern mapping."],
      ["Can I enter negative numbers for length conversions?", "Yes. Negative values are supported to describe signed displacements, coordinate differences, elevation shifts, or relative position adjustments in technical and navigation applications."],
      ["How does display precision rounding work?", "You can select display precision between 0 and 10 decimal places. Internal arithmetic uses full IEEE 754 floating-point accuracy (approximately 15–16 significant digits), and rounding half up is applied only to the final displayed text to prevent compounding errors."],
    ],
  },
  "weight-converter": {
    intro: "Translate a parcel's mass, a food quantity or a bulk shipment between metric and customary units. Although commonly called a weight converter, this tool converts mass. Ounces and pounds are avoirdupois units, not troy units, and a metric ton means 1,000 kilograms.",
    formulaExplanation: "Use kilograms as the common base: multiply by the source unit's kilogram factor and divide by the destination factor. One pound is exactly 0.45359237 kilograms, and one ounce is one-sixteenth of that pound.",
    notes: ["A metric ton (tonne) is different from both a US short ton and an Imperial long ton; those units are not included.", "This does not calculate force or account for gravity. Negative values can represent a signed mass change."],
    examples: [
      { title: "A 2.5-kilogram parcel", value: "2.5", from: "kg", to: "g", precision: 0, explanation: "Multiply kilograms by 1,000 to get the parcel mass in grams." },
      { title: "One pound of ingredients", value: "1", from: "lb", to: "g", precision: 5, explanation: "An avoirdupois pound equals 453.59237 grams before any display rounding." },
      { title: "A 0.75-ton shipment", value: "0.75", from: "t", to: "kg", precision: 0, explanation: "Three-quarters of a metric ton is 750 kilograms." },
    ],
    faqs: [
      ["Does this tool convert mass or gravitational force?", "This tool converts physical mass. While commonly referred to as a weight converter, it uses invariant international avoirdupois definitions (1 pound = 0.45359237 kg) and standard SI units. It does not calculate force (such as Newtons or pound-force) or change with local gravity."],
      ["What is the difference between a metric ton and imperial or US tons?", "This converter supports the metric ton (tonne), which equals exactly 1,000 kilograms (approximately 2,204.62 pounds). It does not include the US short ton (2,000 pounds) or the British Imperial long ton (2,240 pounds)."],
      ["Are precious metal troy ounces supported in this converter?", "No. The ounce here is the standard international avoirdupois ounce (approximately 28.3495 grams, 16 per pound). For South Asian gold and jewelry weights, use our dedicated Tola to Gram Converter."],
    ],
  },
  "temperature-converter": {
    intro: "Translate weather readings, oven settings and scientific temperatures between Celsius, Fahrenheit and Kelvin. These are absolute temperature readings, not temperature differences: the zero points differ, so an offset is needed as well as a scale factor.",
    formulaExplanation: "Celsius and Kelvin have equal-sized steps, separated by 273.15. Fahrenheit has 9 steps for every 5 Celsius steps and places 0 °C at 32 °F. The selected formula below applies the correct scale and offset in either direction.",
    notes: ["Absolute zero is −273.15 °C, −459.67 °F or 0 K. Values below the corresponding limit are rejected, including same-unit conversions.", "For temperature intervals the offsets do not apply. This tool converts readings, not intervals."],
    examples: [
      { title: "A 20 °C room", value: "20", from: "c", to: "f", precision: 1, explanation: "Multiply 20 by 9/5 and add 32 to obtain 68 °F." },
      { title: "A 350 °F oven setting", value: "350", from: "f", to: "c", precision: 2, explanation: "Subtract 32, then multiply by 5/9. The result rounds to 176.67 °C." },
      { title: "The Kelvin zero point", value: "0", from: "k", to: "c", precision: 2, explanation: "Zero kelvin is absolute zero, corresponding to −273.15 °C." },
    ],
    faqs: [
      ["Why does converting 0 °C to Fahrenheit not equal 0 °F?", "Temperature scales have different baseline zero points in addition to different degree sizes. On the Celsius scale, 0 °C marks the freezing point of pure water, which corresponds to 32 °F on the Fahrenheit scale. The exact conversion formula is °F = (°C × 9/5) + 32."],
      ["What is the lowest temperature this calculator accepts?", "The calculator enforces absolute zero as a strict physical boundary: −273.15 °C, −459.67 °F, or 0 K. Any temperature value entered below absolute zero is physically impossible and produces a clear validation message."],
      ["Can I use this tool to convert a temperature increase or interval?", "This converter calculates specific temperature readings, not temperature differences. For a temperature change (delta), an increase of 1 °C equals an increase of 1.8 °F without adding the 32-degree zero-point offset."],
    ],
  },
  "area-converter": {
    intro: "Compare a room area, a site plan or a plot size without confusing square units with length units. Area factors are squared: a square foot is 0.3048 × 0.3048 square meters. Acres here use the international foot, with 43,560 square feet per acre.",
    formulaExplanation: "Multiply the area by the source unit's square-meter factor, then divide by the destination factor. One hectare is 10,000 square meters; one international acre is 4,046.8564224 square meters.",
    notes: ["This converts an area you already know; it does not calculate floor area from dimensions.", "Bigha is not included because its definition varies by region. Historic survey-foot acres are also outside this converter.", "Negative values describe signed area changes, rather than the physical size of a plot."],
    examples: [
      { title: "A 20-square-meter room", value: "20", from: "m2", to: "ft2", precision: 2, explanation: "Divide by 0.09290304 to express the room area in square feet." },
      { title: "A 2.5-hectare site", value: "2.5", from: "ha", to: "m2", precision: 0, explanation: "Multiply hectares by 10,000 to express the site area in square meters." },
      { title: "One international acre", value: "1", from: "acre", to: "ft2", precision: 0, explanation: "An acre based on the international foot contains 43,560 square feet." },
    ],
    faqs: [
      ["Why are area conversion factors squared compared to length units?", "Area measures two-dimensional surface space, so linear conversion factors must be multiplied by themselves. Because 1 foot equals 0.3048 meters, 1 square foot equals 0.3048 × 0.3048 = 0.09290304 square meters. Multiplying by the linear factor directly is a common mistake."],
      ["How much land is in one international acre?", "One international acre contains exactly 43,560 international square feet, which equals approximately 4,046.8564 square meters or 0.404686 hectares. There are 640 acres in one international square mile."],
      ["Does this converter support regional land units like Bigha or Ropani?", "Because traditional land units like Bigha vary substantially by state and country, they are excluded from this standard international converter to avoid ambiguity. For South Asian regional systems, please use our dedicated Nepal Land Area Converter or Multi-Unit Land Area Converter."],
    ],
  },
  "volume-converter": {
    intro: "Translate container capacities and cubic measurements while keeping gallon definitions explicit. One US liquid gallon is 3.785411784 liters; one Imperial gallon is 4.54609 liters. They are different units, and neither option represents a US dry gallon.",
    formulaExplanation: "Use liters as the common base: multiply the input by its liter factor and divide by the destination unit's liter factor. A cubic centimeter is exactly one milliliter, while a cubic meter is 1,000 liters.",
    notes: ["US liquid gallons contain 231 cubic inches. Select the gallon system shown on the original measurement.", "Volume cannot be converted to mass without a density. Negative volumes here represent signed changes, not container capacity."],
    examples: [
      { title: "A 750-milliliter bottle", value: "750", from: "ml", to: "l", precision: 2, explanation: "Divide milliliters by 1,000 to express the bottle's capacity in liters." },
      { title: "A five-US-gallon container", value: "5", from: "us-gal", to: "l", precision: 5, explanation: "Multiply by 3.785411784. Five US liquid gallons round to 18.92706 liters." },
      { title: "Five Imperial gallons", value: "5", from: "imp-gal", to: "l", precision: 5, explanation: "Multiply by 4.54609. The same numerical gallon count gives a larger volume than US gallons." },
    ],
    faqs: [
      ["How do US liquid gallons differ from Imperial gallons?", "A US liquid gallon is defined as 231 cubic inches (approximately 3.78541 liters). In contrast, the British Imperial gallon is defined as exactly 4.54609 liters. An Imperial gallon is approximately 20% larger than a US liquid gallon, so selecting the correct gallon type is critical."],
      ["Can I convert volume directly into weight or mass?", "No. Volume measures capacity, whereas mass measures physical matter. Converting volume (such as liters) into mass (such as kilograms) requires knowing the substance's density. For instance, 1 liter of fresh water at 4 °C weighs 1 kilogram, but 1 liter of cooking oil weighs approximately 0.92 kilograms."],
      ["Is the US dry gallon included in this tool?", "No. This tool supports the US liquid gallon used for liquids and everyday consumer goods. The obsolete US dry gallon (approximately 4.40488 liters) is not included."],
    ],
  },
};
