/**
 * Rule-based offline AI provider.
 * Deterministic fallback — always available, confidence capped at 75.
 * Uses keyword matching and measurement heuristics.
 */

const KEYWORD_MAP = {
  'box': ['box', 'cube', 'container', 'storage', 'tray', 'drawer', 'bin', 'case'],
  'bracket': ['bracket', 'mount', 'holder', 'support', 'wall mount', 'arm', 'clamp'],
  'spacer': ['spacer', 'shim', 'washer', 'ring', 'gap', 'standoff', 'distance'],
  'organizer': ['organizer', 'organiser', 'divider', 'caddy', 'rack', 'shelf', 'tray', 'compartment'],
  'phone-stand': ['phone', 'stand', 'dock', 'cradle', 'charger stand', 'tablet'],
  'enclosure': ['enclosure', 'housing', 'cover', 'shell', 'project box', 'electronics', 'pcb', 'raspberry', 'arduino'],
  'adapter': ['adapter', 'adaptor', 'converter', 'connector', 'coupler', 'fitting', 'thread adapter'],
  'gear': ['gear', 'cog', 'sprocket', 'pinion', 'rack'],
  'threaded-connector': ['threaded', 'thread', 'bolt', 'nut', 'screw', 'coupling', 'm3', 'm4', 'm5', 'm6', 'm8'],
  'hinge': ['hinge', 'pivot', 'rotate', 'fold', 'flap', 'lid hinge'],
  'snap-fit': ['snap', 'clip', 'latch', 'snap-fit', 'click', 'detent'],
};

const MATERIAL_KEYWORDS = {
  'PLA': ['pla', 'print', 'prototype', 'decorative', 'simple'],
  'PETG': ['petg', 'food safe', 'outdoor', 'moisture', 'chemical'],
  'ABS': ['abs', 'uv resistant', 'high temp', 'automotive'],
  'TPU': ['tpu', 'flex', 'flexible', 'rubber', 'grip', 'soft', 'gasket'],
};

function detectGenerator(description) {
  const lower = (description || '').toLowerCase();
  let bestMatch = 'custom';
  let bestScore = 0;

  for (const [gen, keywords] of Object.entries(KEYWORD_MAP)) {
    const score = keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; bestMatch = gen; }
  }
  return bestMatch;
}

function detectMaterial(description) {
  const lower = (description || '').toLowerCase();
  for (const [mat, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return mat;
  }
  return 'PLA';
}

function extractDimensions(measurements, description) {
  const dims = {
    width: null, depth: null, height: null,
    wallThickness: 2.0, tolerance: 0.2
  };

  // Direct from measurements
  const m = measurements || {};
  if (m.width)  dims.width  = parseFloat(m.width);
  if (m.depth)  dims.depth  = parseFloat(m.depth);
  if (m.height) dims.height = parseFloat(m.height);
  if (m.length) dims.depth  = dims.depth ?? parseFloat(m.length);
  if (m.thickness) dims.wallThickness = parseFloat(m.thickness);
  if (m.diameter) { dims.width = parseFloat(m.diameter); dims.depth = parseFloat(m.diameter); }

  // Try to extract from description text: numbers followed by mm or x
  const numRe = /(\d+(?:\.\d+)?)\s*(?:mm|cm|")?/g;
  const nums = [];
  let match;
  const lower = description || '';
  while ((match = numRe.exec(lower)) !== null) {
    const v = parseFloat(match[1]);
    if (v > 0 && v < 500) nums.push(v);
  }

  // Heuristic: if we have 3 nums and no dims, assign them
  if (nums.length >= 3 && !dims.width && !dims.height) {
    [dims.width, dims.depth, dims.height] = nums.slice(0, 3).sort((a,b) => b - a);
  } else if (nums.length >= 2 && !dims.width) {
    [dims.width, dims.depth] = nums.slice(0, 2).sort((a,b) => b - a);
    dims.height = dims.height ?? 20;
  } else if (nums.length >= 1 && !dims.width) {
    dims.width = nums[0]; dims.depth = nums[0]; dims.height = dims.height ?? 20;
  }

  // Defaults if still missing
  dims.width  = dims.width  ?? 50;
  dims.depth  = dims.depth  ?? 50;
  dims.height = dims.height ?? 30;

  return dims;
}

function buildAssumptions(intake, answers, generator, dims, material) {
  const assumptions = [];
  const missingInfo = [];
  const m = intake.measurements || {};

  if (!m.width)  { assumptions.push(`Width assumed to be ${dims.width}mm based on description`); missingInfo.push('Exact width measurement'); }
  if (!m.depth)  { assumptions.push(`Depth assumed to be ${dims.depth}mm based on description`); missingInfo.push('Exact depth/length measurement'); }
  if (!m.height) { assumptions.push(`Height assumed to be ${dims.height}mm based on description`); missingInfo.push('Exact height measurement'); }
  if (!answers.find(a => a.questionId === 'material_type')) {
    assumptions.push(`Material assumed to be ${material} (default for prototyping)`);
    missingInfo.push('Material type (PLA, PETG, ABS, TPU)');
  }
  assumptions.push(`Wall thickness defaulted to ${dims.wallThickness}mm (standard FDM)`);
  assumptions.push(`Print tolerance set to ${dims.tolerance}mm`);

  // Answer-based assumptions
  for (const a of answers) {
    if (a.questionId === 'material_type') assumptions.push(`Material set to ${a.value} per user answer`);
    if (a.questionId === 'tolerance_class') {
      if (a.value === 'precise') dims.tolerance = 0.1;
      if (a.value === 'loose') dims.tolerance = 0.4;
      assumptions.push(`Tolerance class set to ${a.value} per user answer`);
    }
    if (a.questionId === 'wall_thickness') {
      dims.wallThickness = parseFloat(a.value) || dims.wallThickness;
      assumptions.push(`Wall thickness set to ${dims.wallThickness}mm per user answer`);
    }
  }

  return { assumptions, missingInfo };
}

function computeConfidence(intake, answers, dims) {
  let score = 30; // base
  const m = intake.measurements || {};

  if (intake.description && intake.description.length > 20) score += 15;
  if (m.width)  score += 12;
  if (m.depth)  score += 12;
  if (m.height) score += 12;
  if ((intake.photos || []).length > 0) score += 8;
  score += Math.min(answers.length * 4, 20);

  return Math.min(score, 75); // rule-based cap
}

const ruleBasedProvider = {
  id: 'rule-based',
  label: 'Offline Analysis',
  requiresNetwork: false,

  isAvailable() { return true; },

  async analyze(intake, answers) {
    const description = intake.description || '';
    const measurements = intake.measurements || {};

    const generator = detectGenerator(description);
    const material = (answers.find(a => a.questionId === 'material_type')?.value) || detectMaterial(description);
    const dims = extractDimensions(measurements, description);
    const { assumptions, missingInfo } = buildAssumptions(intake, answers, generator, dims, material);
    const confidence = computeConfidence(intake, answers, dims);

    const cadBrief = {
      object_type: description.slice(0, 60) || 'Unknown part',
      recommended_generator: generator,
      dimensions: dims,
      features: ['parametric', 'fdm-printable'],
      constraints: [],
      tolerances: {
        fit: answers.find(a => a.questionId === 'tolerance_class')?.value || 'standard',
        printTolerance: dims.tolerance
      },
      material_recommendation: material,
      print_strategy: {
        infill: generator === 'enclosure' || generator === 'bracket' ? 40 : 20,
        supports: generator === 'bracket' || generator === 'hinge',
        orientation: 'flat side down'
      },
      confidence,
      assumptions,
      missing_info: missingInfo,
    };

    const reasoning = `The offline analysis engine detected "${generator}" as the most likely part type based on keyword matching in your description. Dimensions were ${Object.values(measurements).some(v => v) ? 'taken from your measurements' : 'estimated from context clues'}. For a more precise analysis, add an OpenRouter API key in Settings to enable AI-powered analysis.`;

    return {
      cadBrief,
      confidence,
      assumptions,
      missingInfo,
      reasoning,
      provider: 'rule-based'
    };
  }
};

export default ruleBasedProvider;
