/**
 * Constructs structured prompts for AI analysis.
 */

export function buildAnalysisPrompt(intake, answers) {
  const measurements = Object.entries(intake.measurements || {})
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `  ${k}: ${v}mm`)
    .join('\n') || '  (none provided)';

  const answersText = answers.length > 0
    ? answers.map(a => `  ${a.questionId}: ${JSON.stringify(a.value)}`).join('\n')
    : '  (no questions answered)';

  const hasPhotos = (intake.photos || []).length > 0;

  return `You are a precision CAD engineering assistant helping design 3D-printable parts.

Analyze the following design request and produce a structured CAD brief.

## USER DESCRIPTION
${intake.description || '(none provided)'}

## MEASUREMENTS PROVIDED
${measurements}

## ANSWERED QUESTIONS
${answersText}

${hasPhotos ? `## PHOTOS
${intake.photos.length} photo(s) have been provided with this request. Use them to understand the physical context, shape references, and scale.
` : ''}

## YOUR TASK
Produce a JSON object with EXACTLY this structure. Do not add or remove fields:

{
  "object_type": "<brief name of what this part is>",
  "recommended_generator": "<one of: box | bracket | spacer | organizer | phone-stand | enclosure | adapter | custom | gear | threaded-connector | hinge | snap-fit>",
  "dimensions": {
    "width": <number in mm or null>,
    "depth": <number in mm or null>,
    "height": <number in mm or null>,
    "wallThickness": <number in mm, default 1.5-3.0>,
    "tolerance": <number in mm, default 0.2>
  },
  "features": ["<list of design features>"],
  "constraints": ["<list of constraints or requirements>"],
  "tolerances": {
    "fit": "loose | standard | precise",
    "printTolerance": <number in mm>
  },
  "material_recommendation": "<PLA | PETG | ABS | TPU | other>",
  "print_strategy": {
    "infill": <10-80 as integer>,
    "supports": true | false,
    "orientation": "<description of recommended print orientation>"
  },
  "confidence": <0-100 integer>,
  "assumptions": ["<list every assumption you made>"],
  "missing_info": ["<list what additional info would help>"],
  "reasoning": "<1-2 paragraph explanation of why you chose this design approach>"
}

## RULES
- NEVER guess silently — list ALL assumptions
- If confidence < 80, add to missing_info what would raise it
- Prefer simple, printable geometry
- All dimensions in millimeters
- Only output valid JSON — no markdown, no explanation outside the JSON

Output ONLY the JSON object:`;
}

export function buildClarificationPrompt(brief, userFeedback) {
  return `You previously produced this CAD brief:
${JSON.stringify(brief, null, 2)}

The user has provided this feedback or correction:
"${userFeedback}"

Update the brief accordingly and return the complete updated JSON with the same structure.
Only output valid JSON:`;
}
