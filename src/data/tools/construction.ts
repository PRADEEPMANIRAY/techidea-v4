import type { ConstructionDefinition, ConstructionField } from "../../lib/calculators/construction";

const dimension = (id: string, label: string, defaultValue: string, defaultUnit = "m"): ConstructionField => ({ id, label, defaultValue, defaultUnit, unitKind: "length", positive: true });
const quantity = (id: string, label: string, defaultValue: string): ConstructionField => ({ id, label, defaultValue, positive: true, integer: true });
const price = (label: string): ConstructionField => ({ id: "price", label, defaultValue: "", optional: true, help: "Optional. Use your own currency; costs exclude taxes and delivery. Zero means free, while blank leaves cost uncalculated." });
const wastage: ConstructionField = { id: "wastage", label: "Wastage percentage", defaultValue: "10", max: 100, help: "Adds 0–100% to the calculated quantity before purchase rounding." };

export const constructionDefinitions: readonly ConstructionDefinition[] = [
  {
    id: "plywood-calculator",
    fields: [dimension("length", "Sheet length", "8", "ft"), dimension("width", "Sheet width", "4", "ft"), dimension("thickness", "Sheet thickness", "18", "mm"), quantity("quantity", "Quantity", "1"), price("Price per sheet")],
    intro: "Work out the one-face area and solid volume of rectangular plywood sheets. Length and width determine the area; thickness is used only for volume. Each dimension has its own unit selector, so an 8-foot by 4-foot sheet can have a thickness entered in millimeters.",
    formulas: ["Area per sheet = length × width", "Total area = area per sheet × quantity", "Volume per sheet = length × width × thickness", "Total volume = volume per sheet × quantity", "Estimated cost = price per sheet × quantity"],
    notes: ["Area means one flat face per sheet. It does not count the back face or edges, and it is not a cutting-layout estimate.", "An 8 × 4 ft sheet measures exactly 2438.4 × 1219.2 mm. A sheet sold as 2440 × 1220 mm is slightly different; enter its actual dimensions.", "Volume uses the thickness entered, without accounting for veneers, voids or manufacturing tolerances."],
    examples: [
      { title: "Five 8 × 4 ft sheets", input: "8 ft × 4 ft × 0.75 in; 5 sheets; 40 per sheet", values: { length: "8", width: "4", thickness: "0.75", quantity: "5", price: "40" }, units: { length: "ft", width: "ft", thickness: "in" }, resultIds: ["sheetAreaFt2", "totalAreaFt2", "totalVolumeFt3", "cost"], explanation: "Each sheet has 32 ft² of face area and 2 ft³ of solid volume. Five sheets cost 200 currency units." },
      { title: "Ten 2440 × 1220 mm sheets", input: "2440 mm × 1220 mm × 18 mm; 10 sheets; 35 per sheet", values: { length: "2440", width: "1220", thickness: "18", quantity: "10", price: "35" }, units: { length: "mm", width: "mm", thickness: "mm" }, resultIds: ["sheetAreaM2", "totalAreaM2", "totalVolumeM3", "cost"], explanation: "A sheet has 2.9768 m² of face area. Multiplying that by 0.018 m and ten sheets gives 0.535824 m³." },
      { title: "Three half-size panels", input: "4 ft × 4 ft × 0.5 in; 3 sheets; no price", values: { length: "4", width: "4", thickness: "0.5", quantity: "3" }, units: { length: "ft", width: "ft", thickness: "in" }, resultIds: ["totalAreaFt2", "totalVolumeFt3"], explanation: "These panels total 48 ft² of face area and 2 ft³ of volume. No price is needed for the quantity estimate." },
    ],
    faqs: [
      ["Does the calculated plywood area cover both sides of the sheet?", "No. The calculated area represents the single-face surface area of the rectangular sheet. If you plan to laminate, veneer, or paint both sides, double the calculated surface area."],
      ["Why are standard 8 × 4 ft sheets different from 2440 × 1220 mm sheets?", "An exact 8 ft × 4 ft imperial sheet measures 2438.4 mm × 1219.2 mm. Many metric plywood boards are manufactured as 2440 mm × 1220 mm, which has roughly 0.08% more surface area. Select the specific unit and dimensions marked on your purchased sheets."],
      ["Does this calculator generate sheet cutting diagrams?", "No. This tool calculates total face area, solid material volume, and estimated purchasing cost for rectangular sheets. It does not generate cutting layouts (nesting optimization) or account for saw kerf waste."],
    ],
  },
  {
    id: "wood-cft-calculator",
    fields: [dimension("length", "Length", "8", "ft"), dimension("width", "Width", "6", "in"), dimension("thickness", "Thickness", "2", "in"), quantity("quantity", "Number of pieces", "10"), price("Price per CFT")],
    intro: "Calculate solid timber volume from measured rectangular dimensions and a piece count. CFT means cubic feet. Use feet for a board's length and inches for its cross-section, or mix centimeters and meters; all dimensions are normalized before multiplication.",
    formulas: ["Volume per piece = length × width × thickness (in a common unit)", "Total volume = volume per piece × number of pieces", "CFT = volume in m³ ÷ 0.028316846592", "Estimated cost = total CFT × price per CFT"],
    notes: ["Use actual finished dimensions. Nominal lumber sizes can differ from measured sizes.", "This is solid rectangular volume, not board feet, stacked volume or a round-log estimate.", "The quoted rate is per cubic foot, not per piece. Cost uses the unrounded total volume."],
    examples: [
      { title: "Ten 8 ft timber pieces", input: "8 ft × 6 in × 2 in; 10 pieces; 50 per CFT", values: { length: "8", width: "6", thickness: "2", quantity: "10", price: "50" }, units: { length: "ft", width: "in", thickness: "in" }, resultIds: ["pieceVolumeFt3", "totalVolumeFt3", "cost"], explanation: "Each piece is 2/3 ft³. Ten pieces are 6⅔ CFT, so the unrounded cost is 333⅓ currency units." },
      { title: "Twenty metric battens", input: "2 m × 10 cm × 5 cm; 20 pieces; 100 per CFT", values: { length: "2", width: "10", thickness: "5", quantity: "20", price: "100" }, units: { length: "m", width: "cm", thickness: "cm" }, resultIds: ["pieceVolumeM3", "totalVolumeM3", "totalVolumeFt3", "cost"], explanation: "Each batten occupies 0.01 m³. The combined 0.2 m³ is converted to cubic feet before applying the price." },
      { title: "Twelve short boards", input: "3 ft × 4 in × 1 in; 12 pieces; no price", values: { length: "3", width: "4", thickness: "1", quantity: "12" }, units: { length: "ft", width: "in", thickness: "in" }, resultIds: ["totalVolumeFt3", "totalVolumeM3"], explanation: "Each board is 1/12 ft³, so the dozen totals exactly 1 ft³ or 0.028316846592 m³." },
    ],
    faqs: [
      ["What does CFT mean and how is timber volume calculated?", "CFT stands for cubic feet (ft³). For rectangular sawn timber, CFT is calculated as (Length in feet × Width in inches × Thickness in inches) ÷ 144 for each piece, multiplied by the total piece count. The calculator automatically converts mixed units like feet and inches."],
      ["Is timber CFT the same as lumber board feet?", "One CFT equals exactly 12 board feet (where 1 board foot is a nominal board measuring 12 in × 12 in × 1 in, or 1/12 of a cubic foot). If lumber is quoted per thousand board feet (MBF), divide that price by 83.33 to compare with price per CFT."],
      ["Does this calculator estimate round log timber?", "No. This tool calculates the solid volume of rectangular, dressed, or sawn timber boards. It does not use round-log scaling formulas (such as the Hoppus rule or Quarter Girth formula) that estimate usable square timber recovery from round tree logs."],
    ],
  },
  {
    id: "tile-calculator",
    fields: [dimension("floorLength", "Floor length", "5"), dimension("floorWidth", "Floor width", "4"), dimension("tileLength", "Tile length", "60", "cm"), dimension("tileWidth", "Tile width", "60", "cm"), wastage, { ...quantity("tilesPerBox", "Tiles per box", ""), optional: true, help: "Optional. Required only for box quantities and price-per-box cost." }, price("Price per box")],
    intro: "Estimate tile and box quantities for a rectangular floor using the area of one tile. The allowance is applied to the unrounded area ratio, then whole tiles and whole boxes are rounded up separately. This keeps the purchase estimate distinct from the geometric area calculation.",
    formulas: ["Floor area = floor length × floor width; tile area = tile length × tile width", "Required tiles = ceil(floor area ÷ tile area)", "Wastage-adjusted tiles = ceil((floor area ÷ tile area) × (1 + wastage / 100))", "Required boxes = ceil(wastage-adjusted tiles ÷ tiles per box)", "Estimated cost = required boxes × price per box"],
    notes: ["ceil means round up to the next whole number. Wastage is applied before the first rounding, not to an already rounded tile count.", "Actual cutting patterns, room shape, grout spacing and whether offcuts can be reused may change requirements. This is an area-based estimate, not a tile-layout plan.", "Cost includes all tiles in whole purchased boxes. Enter tiles per box before entering a price per box."],
    examples: [
      { title: "A 5 × 4 m room", input: "60 × 60 cm tiles; 10% wastage; 4 tiles per box; 25 per box", values: { floorLength: "5", floorWidth: "4", tileLength: "60", tileWidth: "60", wastage: "10", tilesPerBox: "4", price: "25" }, resultIds: ["requiredTiles", "adjustedTiles", "boxes", "cost"], explanation: "20 ÷ 0.36 gives 55.555… tiles. A 10% allowance requires 62 tiles, bought as 16 boxes containing 64 tiles." },
      { title: "A 12 × 10 ft floor", input: "12 × 12 in tiles; 5% wastage; 10 tiles per box; 30 per box", values: { floorLength: "12", floorWidth: "10", tileLength: "12", tileWidth: "12", wastage: "5", tilesPerBox: "10", price: "30" }, units: { floorLength: "ft", floorWidth: "ft", tileLength: "in", tileWidth: "in" }, resultIds: ["requiredTiles", "adjustedTiles", "boxes", "cost"], explanation: "The floor needs 120 tiles by area, or 126 with allowance. Thirteen whole boxes cost 390 currency units." },
      { title: "A 3 × 2 m utility floor", input: "30 × 20 cm tiles; 0% wastage; box size and price omitted", values: { floorLength: "3", floorWidth: "2", tileLength: "30", tileWidth: "20", wastage: "0" }, resultIds: ["floorAreaM2", "tileAreaM2", "adjustedTiles"], explanation: "The exact area ratio is 6 ÷ 0.06 = 100. No extra tile is introduced by decimal arithmetic." },
    ],
    faqs: [
      ["What wastage percentage should I allow for floor tiles?", "For standard square or rectangular tiles laid in a straight grid in square rooms, a 10% wastage allowance is standard to cover cutting offcuts and perimeter trimming. For diagonal herringbone layouts, large format tiles, or rooms with complex alcoves, allow 15% to 20%."],
      ["Why are tile quantities rounded up to whole boxes?", "Floor and wall tiles are sold in sealed factory cartons to prevent breakage and guarantee matching production dye lots. The calculator rounds up to the next full box so you do not run short of matching tiles during installation."],
      ["Does this calculation account for grout joint spacing?", "This calculator uses nominal tile dimensions. For small tiles (such as subway tiles), grout lines (3–5 mm) slightly reduce the overall tile count, but that minor difference is safely absorbed within your recommended cutting wastage allowance."],
    ],
  },
  {
    id: "paint-calculator",
    fields: [dimension("length", "Wall length", "4"), dimension("height", "Wall height", "2.5"), quantity("walls", "Number of walls", "4"), { id: "deduction", label: "Total door/window deduction", defaultValue: "4", unitKind: "area", defaultUnit: "m2", help: "Total opening area across all walls, deducted once." }, quantity("coats", "Number of coats", "2"), { id: "coverage", label: "Coverage per liter", defaultValue: "10", unitKind: "coverage", defaultUnit: "m2", positive: true, help: "Area covered by one liter for one coat. Use the product's stated coverage; 10 is only an editable starting example." }, wastage, price("Paint price per liter")],
    intro: "Estimate paint for walls of the same length and height, after deducting the combined area of doors and windows. Coats multiply the paint requirement; coverage determines how much area one liter covers in one coat. Replace the starting coverage with the value stated for your paint and surface.",
    formulas: ["Gross area = wall length × wall height × number of walls", "Net paintable area = gross area − total door/window deduction", "Paint before wastage (L) = net area × coats ÷ coverage per liter", "Paint including wastage = base paint × (1 + wastage / 100)", "Estimated cost = unrounded paint quantity × price per liter"],
    notes: ["The wall count assumes identical wall dimensions. For different wall sizes, calculate them separately and combine the quantities.", "Deductions are the total across all walls and cannot exceed gross area. Coats and wall counts must be positive whole numbers.", "Coverage varies with the product, surface and application. Paint volume is not rounded up to can sizes; choose available pack sizes when purchasing."],
    examples: [
      { title: "Four room walls", input: "4 m × 2.5 m × 4 walls; deduct 4 m²; 2 coats; 10 m²/L; 10% wastage; 12 per L", values: { length: "4", height: "2.5", walls: "4", deduction: "4", coats: "2", coverage: "10", wastage: "10", price: "12" }, resultIds: ["grossAreaM2", "netAreaM2", "paint", "cost"], explanation: "The net area is 36 m². Two coats need 7.2 L before allowance, or 7.92 L after adding 10%." },
      { title: "Three walls measured in feet", input: "12 ft × 8 ft × 3 walls; deduct 24 ft²; 2 coats; 100 ft²/L; 5% wastage; 20 per L", values: { length: "12", height: "8", walls: "3", deduction: "24", coats: "2", coverage: "100", wastage: "5", price: "20" }, units: { length: "ft", height: "ft", deduction: "ft2", coverage: "ft2" }, resultIds: ["grossAreaFt2", "netAreaFt2", "paint", "cost"], explanation: "264 ft² of net area needs 5.28 L for two coats at the entered coverage, increasing to 5.544 L with wastage." },
      { title: "One feature wall", input: "5 m × 3 m; 1 wall; no deductions; 1 coat; 12 m²/L; 0% wastage", values: { length: "5", height: "3", walls: "1", deduction: "0", coats: "1", coverage: "12", wastage: "0" }, resultIds: ["netAreaM2", "paint"], explanation: "A 15 m² wall divided by 12 m² per liter requires 1.25 L for one coat, before any packaging decisions." },
    ],
    faqs: [
      ["How do I find the correct coverage per liter for my paint?", "Coverage varies by paint formulation and surface porosity. Smooth interior drywall with emulsion typically covers 10–14 m² (110–150 ft²) per liter per coat, whereas rough exterior masonry or unprimed plaster may cover only 4–7 m² per liter. Check the coverage rate stated on your paint can label."],
      ["Why is the estimated paint volume not rounded up to whole cans?", "Paint manufacturers supply paint in multiple container sizes (such as 1 L, 4 L, 10 L, or 20 L containers, or 1 quart and 1 gallon cans). The calculator provides exact net volume including your chosen wastage allowance so you can decide the most economical container combination."],
      ["How should I calculate rooms with walls of different dimensions?", "The wall count assumes identical wall dimensions. If room walls have different lengths or ceiling heights, calculate each wall separately and combine the quantities, or enter the total room perimeter as the length with a wall count of 1."],
    ],
  },
  {
    id: "concrete-calculator",
    fields: [dimension("length", "Length", "4"), dimension("width", "Width", "3"), dimension("depth", "Depth", "100", "mm"), wastage],
    intro: "Estimate the wet concrete volume for a rectangular pour from length, width and depth, then add a separate wastage allowance. Enter a shallow depth in millimeters or inches while using meters or feet for the plan dimensions; results are shown in both cubic meters and cubic feet.",
    formulas: ["Wet volume = length × width × depth (all converted to meters)", "Wastage-adjusted wet volume = wet volume × (1 + wastage / 100)", "Cubic feet = cubic meters ÷ 0.028316846592"],
    notes: ["This is a geometric wet-volume estimate, not a structural design, strength assessment or mix specification.", "Only a rectangular, constant-depth pour is modeled. Divide irregular shapes into separate measured sections and add their volumes.", "No dry-material factor or cement, sand and aggregate breakdown is assumed. The wastage percentage adds extra wet volume."],
    examples: [
      { title: "A 4 × 3 m rectangular pour", input: "4 m × 3 m × 100 mm; 10% wastage", values: { length: "4", width: "3", depth: "100", wastage: "10" }, resultIds: ["wetVolumeM3", "adjustedVolumeM3"], explanation: "The 0.1 m depth gives 1.2 m³ of wet volume. Adding 10% increases the estimate to 1.32 m³." },
      { title: "A pour measured in feet and inches", input: "10 ft × 8 ft × 4 in; 5% wastage", values: { length: "10", width: "8", depth: "4", wastage: "5" }, units: { length: "ft", width: "ft", depth: "in" }, resultIds: ["wetVolumeFt3", "adjustedVolumeFt3", "adjustedVolumeM3"], explanation: "The base volume is 26⅔ ft³. A 5% allowance brings it to exactly 28 ft³, or 0.792871704576 m³." },
      { title: "A smaller 150 mm-deep section", input: "2 m × 1.5 m × 150 mm; 0% wastage", values: { length: "2", width: "1.5", depth: "150", wastage: "0" }, resultIds: ["wetVolumeM3", "adjustedVolumeM3"], explanation: "The base and adjusted volumes both equal 0.45 m³ because no extra allowance is selected." },
    ],
    faqs: [
      ["How much wastage should I add for concrete pours?", "For standard slabs, footings, and pathways poured against smooth formwork, a 5% to 10% wastage allowance is customary. For uneven subgrades, deep trench excavations, or pump-line residue, contractors typically allow 10% to 15% extra."],
      ["Can I enter slab depth in inches or millimeters while entering plan dimensions in feet or meters?", "Yes. Each dimension has an independent unit selector. You can enter length and width in meters or feet and depth in millimeters or inches. The calculator normalizes all units and displays the result in both cubic meters (m³) and cubic feet (ft³)."],
      ["Does this calculate wet placed volume or dry bagged mix?", "This calculates wet placed concrete volume. Ready-mix trucks are ordered directly by wet volume (m³ or cubic yards). If hand-mixing pre-blended dry concrete bags, note that dry ingredients compact by approximately 30–35% when water is added."],
    ],
  },
];

export function getConstruction(id: string) { return constructionDefinitions.find((definition) => definition.id === id); }
