import type { ToolCategoryId } from './categories';
type Example = { title: string; input: string; result: string; explanation: string };
type IndiaTool = { id: string; name: string; description: string; category: ToolCategoryId; intro: string; instructions: readonly [string, ...string[]]; examples: readonly [Example, ...Example[]]; method: string; faqs: readonly [string, string][] };
export const indiaTools: readonly IndiaTool[] = [
  {
    id: 'india-pin-code-finder', name: 'India PIN Code Finder', category: 'business-tools',
    description: 'Find post offices for a six-digit Indian PIN code, with district, state and available delivery details from the Postal PIN Code API.',
    intro: 'A PIN can identify several post offices, not a single street or doorstep. Search the code on a postal address and compare the returned office names before choosing one. This tool displays source records without guessing missing localities.',
    instructions: ['Enter a six-digit PIN beginning with 1–9 and select Search.', 'Review all returned offices, including their district, state and delivery designation.', 'Copy or download the records if useful. Confirm time-sensitive delivery questions with India Post.'],
    method: 'Each explicit search requests one code from api.postalpincode.in. A 12-second timeout and 256 KiB response cap keep requests bounded. Missing source fields display “Not supplied”. Retrieval time describes when the request completed, not when the provider last updated its records. The provider is a third-party reference service, not a live India Post delivery guarantee.',
    examples: [
      { title: 'Multiple offices', input: '110001', result: 'A list of source post-office records', explanation: 'Compare office names; do not assume the first office is the delivery office. The exact list can change upstream.' },
      { title: 'Incomplete code', input: '11001', result: 'Validation message; no request sent', explanation: 'PINs contain exactly six digits. Do not add a guessed digit.' },
      { title: 'No source match', input: 'A valid-format PIN absent from the source', result: 'No records found', explanation: 'An absent source record does not establish that an address is invalid. Verify with the post office.' },
    ],
    faqs: [['Does “Delivery” guarantee a parcel can be delivered?', 'No. This is the office designation supplied by the data provider. It does not check a courier, service interruption, doorstep or delivery date.'], ['Why can several offices share one PIN?', 'The source groups post offices under the postal code they serve. Keep the office name with the PIN rather than treating the code as a unique office identifier.'], ['Is the directory current?', 'The response supplies no per-record update timestamp or freshness guarantee. Confirm important changes with India Post. No postal information is invented when the source fails.']],
  },
  {
    id: 'ifsc-code-finder', name: 'IFSC Code Finder', category: 'business-tools',
    description: 'Look up an Indian IFSC code to view the bank, branch and available address details from Razorpay’s public IFSC dataset, with copyable results.',
    intro: 'Use an IFSC printed on a recent bank document to look up its branch record. Syntax validation catches a mistyped structure, while the source lookup checks whether a record exists. Neither step verifies a beneficiary or confirms that a bank account is active.',
    instructions: ['Enter the 11-character IFSC. Lowercase letters are normalized to uppercase.', 'Select Search and compare the bank, branch, district and state with your bank document.', 'Use Copy result to copy the returned record. Confirm the current code with the bank before a transfer.'],
    method: 'An IFSC has four letters, the digit zero, then six letters or digits. The browser requests the exact code from ifsc.razorpay.com without an API key or account details. A 404 means the source has no matching record; other failures are shown as service errors. The Razorpay project describes its dataset as public domain. Branch mergers and code changes can outpace a snapshot.',
    examples: [
      { title: 'Exact branch lookup', input: 'SBIN0000691', result: 'Live branch record when available', explanation: 'Read the returned bank and branch together; the tool does not prefill a hardcoded bank address.' },
      { title: 'Case normalization', input: 'sbin0000691', result: 'Searches SBIN0000691', explanation: 'Case is normalized, but missing or extra characters are not silently repaired.' },
      { title: 'The fifth character', input: 'SBINO000691', result: 'Validation error', explanation: 'The fifth character is the number zero, not the letter O.' },
    ],
    faqs: [['Does a valid IFSC verify the account holder?', 'No. This lookup has no account-number or beneficiary-verification function. Never enter account credentials here.'], ['What if a branch has merged?', 'Use the code confirmed by the bank. A reference record can remain present after operational changes; this tool cannot certify transfer availability.'], ['What is sent to the data provider?', 'Only the entered IFSC is included in the request. As with a direct website request, the provider receives your IP address. The tool sends no cookies or account information.']],
  },
  {
    id: 'photo-signature-resizer', name: 'Photo & Signature Resizer', category: 'image-tools',
    description: 'Resize a photo or signature to custom pixel dimensions and a target KB limit locally in your browser, with fit, crop, previews and honest size results.',
    intro: 'Application portals often set both pixel dimensions and a file-size ceiling. Set those requirements separately, preview the framing, then inspect the measured output size before downloading. Your image stays on your device throughout the operation.',
    instructions: ['Choose a still JPG, PNG or WebP image. Select an editable photo or signature preset, or enter custom pixel dimensions.', 'Set the maximum KB size and choose Fit for white padding or Center crop to fill the frame.', 'Select Resize and preview. Inspect the face or signature, actual byte size and any unmet-limit warning before downloading.'],
    method: 'The browser draws the source onto a canvas of the requested size. Fit uses the smaller width/height scale and adds white padding; crop uses the larger scale and removes centered edges. Both preserve the source aspect ratio. JPEG and WebP try at most 20 quality settings from 100% down to 5%; PNG is encoded once because its quality parameter does not control lossy compression. The highest tested setting within the limit is returned. No output is described as within the limit unless its actual byte size fits.',
    examples: [
      { title: 'Portrait starting point', input: '200 × 230 px, maximum 50 KB, Fit', result: '200 × 230 canvas with the complete source visible', explanation: 'White bars may appear when aspect ratios differ. The preset is illustrative, not a government specification.' },
      { title: 'Wide signature', input: '140 × 60 px, maximum 20 KB', result: 'A wide preview ready to inspect', explanation: 'Fit avoids cutting off signature strokes. Check that small text remains readable after encoding.' },
      { title: 'Unreachable ceiling', input: 'Large dimensions with a 1 KB maximum', result: 'Explicit warning if tested encodings exceed the limit', explanation: 'Try smaller dimensions or another format. The tool never silently changes your requested dimensions to claim success.' },
    ],
    faqs: [['Will these presets be accepted by a recruitment portal?', 'Not necessarily. They are editable examples. Pixel size, file type, KB limit and background rules must come from the receiving portal’s current instructions.'], ['Are images uploaded or retained?', 'No. Image processing and temporary previews use browser memory and local blob URLs. Reset or leaving the page releases those references; downloaded files remain on your device.'], ['Can I keep transparency and metadata?', 'This resizer intentionally uses a white background and does not preserve metadata. JPEG and WebP encoding may lose visual detail; PNG preserves the resized pixels, not the original resolution.']],
  },
  {
    id: 'age-calculator', name: 'Age Calculator', category: 'everyday-calculators',
    description: 'Calculate age in completed years, months and days on a chosen date, with total days, a birthday countdown and an explicit leap-day convention.',
    intro: 'Use today for a current age or choose a cutoff date from an application form. The result separates completed calendar years, completed months and remaining days; it does not approximate a year as 365 days or a month as 30 days.',
    instructions: ['Enter the birth date using the date control.', 'Choose the date on which age should be calculated. It must be on or after the birth date.', 'Read completed years, months and days, total elapsed days and the birthday countdown relative to your selected date.'],
    method: 'The calculation first counts completed year anniversaries, then completed month anniversaries from that anchor, then remaining days. Missing month-end dates clamp to that month’s last day. A February 29 birthday uses February 28 in non-leap years. Calendar arithmetic uses UTC date-only values to avoid daylight-saving shifts. The selected date can be in the future for planning; a birth date after today or after the selected date is rejected. Dates from 1900 through 9998 are supported. This convention does not determine legal eligibility.',
    examples: [
      { title: 'A regular cutoff', input: 'Born 2000-06-15; on 2025-08-20', result: '25 years, 2 months, 5 days', explanation: 'The last completed yearly anniversary is June 15, followed by two complete months and five days.' },
      { title: 'Leap-day birthday', input: 'Born 2000-02-29; on 2025-02-28', result: '25 years, 0 months, 0 days', explanation: 'This calculator explicitly uses February 28 as the non-leap-year anniversary.' },
      { title: 'Month-end clamp', input: 'Born 2024-01-31; on 2024-02-29', result: '0 years, 1 month, 0 days', explanation: 'The February monthly anniversary clamps to the last day of that month.' },
    ],
    faqs: [['Does the birthday countdown use today?', 'It uses the calculation date you selected. On the birthday itself the countdown is zero, rather than jumping immediately to the following year.'], ['Which leap-day rule is used?', 'February 28 in non-leap years. Some institutions or laws use another convention; check the applicable rule before relying on an eligibility cutoff.'], ['Why might two age tools disagree on months?', 'Calendar-month lengths vary. This tool clamps month-end anniversaries and documents its order of operations, rather than dividing elapsed days by a fixed month length.']],
  },
  {
    id: 'cgpa-to-percentage', name: 'CGPA to Percentage Calculator', category: 'everyday-calculators',
    description: 'Convert CGPA using your institution’s multiplier and optional additive offset. Set the CGPA scale and see a transparent, non-universal percentage calculation.',
    intro: 'A CGPA is meaningful only with its grading scale and conversion policy. Enter your institution’s documented linear rule here; no institution-specific multiplier is assumed. Keep the official conversion certificate or policy when a form requires proof.',
    instructions: ['Enter your CGPA and the maximum of your grading scale.', 'Enter the verified multiplier and any additive offset. For a multiplier-only rule, keep the offset at zero.', 'Review the calculated percentage rounded to two decimal places. Use the institution’s own rounding rule for official submissions.'],
    method: 'Percentage = CGPA × multiplier + offset. This supports linear rules, including a multiplier-only rule or an expanded expression such as (CGPA − 0.5) × 10 = CGPA × 10 − 5. CGPA must lie between zero and the entered scale maximum. Outputs outside 0–100 are rejected, not silently clamped. Browser floating-point arithmetic is used and display rounds to two decimal places. Nonlinear, subject-weighted or grade-table rules are not supported.',
    examples: [
      { title: 'Multiplier-only illustration', input: 'CGPA 8; scale 10; multiplier 9.5; offset 0', result: '76.00%', explanation: 'Use this only if your institution specifies that multiplier. It is not a universal conversion.' },
      { title: 'Rule with an offset', input: 'CGPA 8.2; scale 10; multiplier 10; offset −5', result: '77.00%', explanation: 'This matches the algebraic expression (8.2 − 0.5) × 10.' },
      { title: 'A different scale', input: 'CGPA 3.6; scale 4; multiplier 25; offset 0', result: '90.00%', explanation: 'This is a hypothetical linear rule. A 4-point scale does not by itself justify multiplying by 25.' },
    ],
    faqs: [['Is CGPA × 9.5 always correct?', 'No. Institutions can use different multipliers, offsets, tables or certification procedures. This calculator leaves the multiplier blank so you must supply a rule.'], ['Can this produce an official certificate?', 'No. It performs arithmetic using your inputs. Obtain certification from your institution when required.'], ['What if my policy uses subject credits?', 'First calculate the CGPA according to that policy. This tool converts an already determined CGPA and does not calculate weighted subject results.']],
  },
];
export const getIndiaTool = (id: string) => indiaTools.find(tool => tool.id === id);
