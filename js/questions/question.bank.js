/**
 * Question bank — 43 adaptive questions covering all major design parameters.
 * Each question has:
 *   id, text, type (select|text|number|multi|boolean), options?, placeholder?,
 *   condition(intake, answers) → boolean,  // whether to ask this question
 *   confidenceWeight,   // how much answering this adds to confidence
 *   category            // material | geometry | fit | function | print | mechanical | thermal | electrical | assembly | aesthetic | strength | fdm
 */

export const questions = [
  {
    id: 'material_type',
    text: 'What material will you print this in?',
    type: 'select',
    options: [
      { value: 'PLA',  label: 'PLA — Standard, easy to print' },
      { value: 'PETG', label: 'PETG — Durable, moisture-resistant' },
      { value: 'ABS',  label: 'ABS — Heat resistant, tough' },
      { value: 'TPU',  label: 'TPU — Flexible, rubber-like' },
      { value: 'ASA',  label: 'ASA — UV resistant, outdoor' },
      { value: 'Nylon', label: 'Nylon — Strong, wear-resistant' },
    ],
    condition: () => true,
    confidenceWeight: 10,
    category: 'material',
  },
  {
    id: 'functional_purpose',
    text: 'What is the primary purpose of this part?',
    type: 'select',
    options: [
      { value: 'structural', label: 'Structural / load-bearing' },
      { value: 'enclosure',  label: 'Enclosure / housing' },
      { value: 'decorative', label: 'Decorative / aesthetic' },
      { value: 'mechanical', label: 'Mechanical / moving parts' },
      { value: 'mounting',   label: 'Mounting / fastening' },
      { value: 'prototype',  label: 'Prototype / testing' },
    ],
    condition: () => true,
    confidenceWeight: 12,
    category: 'function',
  },
  {
    id: 'tolerance_class',
    text: 'How precise does the fit need to be?',
    type: 'select',
    options: [
      { value: 'loose',    label: 'Loose — general purpose (±0.4mm)' },
      { value: 'standard', label: 'Standard — good fit (±0.2mm)' },
      { value: 'precise',  label: 'Precise — tight assembly (±0.1mm)' },
    ],
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      return purpose !== 'decorative';
    },
    confidenceWeight: 8,
    category: 'fit',
  },
  {
    id: 'wall_thickness',
    text: 'What wall thickness do you need? (mm)',
    type: 'number',
    placeholder: '2.0',
    unit: 'mm',
    min: 0.8, max: 10, step: 0.2,
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      return ['structural', 'enclosure', 'mechanical', 'mounting'].includes(purpose);
    },
    confidenceWeight: 8,
    category: 'geometry',
  },
  {
    id: 'has_lid',
    text: 'Does this part need a removable lid or cover?',
    type: 'boolean',
    condition: (intake, _) => {
      const desc = (intake.description || '').toLowerCase();
      return desc.includes('box') || desc.includes('container') ||
             desc.includes('enclosure') || desc.includes('case');
    },
    confidenceWeight: 6,
    category: 'function',
  },
  {
    id: 'mounting_type',
    text: 'How will this part be mounted or attached?',
    type: 'select',
    options: [
      { value: 'screws',     label: 'Screws / bolts' },
      { value: 'adhesive',   label: 'Adhesive / glue' },
      { value: 'snap',       label: 'Snap-fit / press-fit' },
      { value: 'magnetic',   label: 'Magnetic' },
      { value: 'gravity',    label: 'Sits by gravity / weight' },
      { value: 'none',       label: 'No mounting needed' },
    ],
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      return ['structural', 'mounting', 'enclosure'].includes(purpose);
    },
    confidenceWeight: 7,
    category: 'function',
  },
  {
    id: 'screw_size',
    text: 'What screw or bolt size will be used? (e.g. M3, M4, #6-32)',
    type: 'text',
    placeholder: 'M3',
    condition: (_, answers) => {
      return answers.find(a => a.questionId === 'mounting_type')?.value === 'screws';
    },
    confidenceWeight: 6,
    category: 'geometry',
  },
  {
    id: 'infill_strength',
    text: 'How strong does the internal structure need to be?',
    type: 'select',
    options: [
      { value: 'light',    label: 'Light — decorative, minimal load (15%)' },
      { value: 'standard', label: 'Standard — typical use (25%)' },
      { value: 'strong',   label: 'Strong — mechanical, load-bearing (40%)' },
      { value: 'solid',    label: 'Solid — maximum strength (80%)' },
    ],
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      return purpose !== 'decorative';
    },
    confidenceWeight: 7,
    category: 'print',
  },
  {
    id: 'surface_finish',
    text: 'How important is surface quality?',
    type: 'select',
    options: [
      { value: 'none',       label: 'Not important — functional only' },
      { value: 'moderate',   label: 'Moderate — presentable' },
      { value: 'high',       label: 'High — display quality' },
    ],
    condition: () => true,
    confidenceWeight: 5,
    category: 'print',
  },
  {
    id: 'heat_exposure',
    text: 'Will this part be exposed to heat above 60°C?',
    type: 'boolean',
    condition: (_, answers) => {
      const mat = answers.find(a => a.questionId === 'material_type')?.value;
      return !mat || mat === 'PLA';
    },
    confidenceWeight: 6,
    category: 'material',
  },
  {
    id: 'outdoor_use',
    text: 'Will this part be used outdoors or in UV light?',
    type: 'boolean',
    condition: () => true,
    confidenceWeight: 5,
    category: 'material',
  },
  {
    id: 'supports_needed',
    text: 'Does the geometry have significant overhangs that will need support material?',
    type: 'boolean',
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      return ['structural', 'mechanical', 'mounting'].includes(purpose);
    },
    confidenceWeight: 5,
    category: 'print',
  },
  {
    id: 'gear_teeth',
    text: 'How many teeth does the gear need?',
    type: 'number',
    placeholder: '20',
    min: 8, max: 200, step: 1,
    condition: (intake, _) => {
      return (intake.description || '').toLowerCase().includes('gear') ||
             (intake.description || '').toLowerCase().includes('cog');
    },
    confidenceWeight: 10,
    category: 'geometry',
  },
  {
    id: 'thread_standard',
    text: 'What thread standard are you targeting?',
    type: 'select',
    options: [
      { value: 'M3',  label: 'M3 (3mm metric)' },
      { value: 'M4',  label: 'M4 (4mm metric)' },
      { value: 'M5',  label: 'M5 (5mm metric)' },
      { value: 'M6',  label: 'M6 (6mm metric)' },
      { value: 'M8',  label: 'M8 (8mm metric)' },
      { value: '1/4-20', label: '1/4-20 (imperial)' },
      { value: '3/8-16', label: '3/8-16 (imperial)' },
      { value: 'custom', label: 'Custom pitch' },
    ],
    condition: (intake, _) => {
      const desc = (intake.description || '').toLowerCase();
      return desc.includes('thread') || desc.includes('screw') || desc.includes('bolt') || desc.includes('nut');
    },
    confidenceWeight: 10,
    category: 'geometry',
  },
  {
    id: 'print_in_place',
    text: 'Should this be printed in-place as a single piece (no assembly)?',
    type: 'boolean',
    condition: (intake, _) => {
      const desc = (intake.description || '').toLowerCase();
      return desc.includes('hinge') || desc.includes('joint') || desc.includes('pivot');
    },
    confidenceWeight: 8,
    category: 'print',
  },
  {
    id: 'weight_limit',
    text: 'Is there a weight limit or restriction for this part? (grams)',
    type: 'number',
    placeholder: 'None',
    min: 1, max: 5000, step: 1,
    unit: 'g',
    condition: (_, answers) => {
      return answers.find(a => a.questionId === 'functional_purpose')?.value === 'structural';
    },
    confidenceWeight: 4,
    category: 'geometry',
  },
  {
    id: 'waterproof',
    text: 'Does this part need to be water-resistant or sealed?',
    type: 'boolean',
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      return ['enclosure', 'structural'].includes(purpose);
    },
    confidenceWeight: 5,
    category: 'function',
  },
  {
    id: 'color_count',
    text: 'How many colors or materials will be used for this print?',
    type: 'select',
    options: [
      { value: '1', label: 'Single color / material' },
      { value: '2', label: 'Two colors (multi-filament)' },
      { value: '3+', label: 'Three or more colors' },
    ],
    condition: (_, answers) => {
      const finish = answers.find(a => a.questionId === 'surface_finish')?.value;
      return finish === 'high';
    },
    confidenceWeight: 3,
    category: 'print',
  },

  // ── MECHANICAL ─────────────────────────────────────────────────────────────
  {
    id: 'gear_ratio',
    text: 'What gear ratio do you need? (e.g. 2:1, 3:1)',
    type: 'text',
    placeholder: '2:1',
    condition: (intake, _) => {
      const desc = (intake.description || '').toLowerCase();
      return desc.includes('gear') || desc.includes('drive') || desc.includes('transmission');
    },
    confidenceWeight: 8,
    category: 'mechanical',
  },
  {
    id: 'shaft_diameter',
    text: 'What is the shaft diameter this part mounts on? (mm)',
    type: 'number',
    placeholder: '5',
    unit: 'mm',
    min: 1, max: 50, step: 0.5,
    condition: (intake, _) => {
      const desc = (intake.description || '').toLowerCase();
      return desc.includes('pulley') || desc.includes('gear') || desc.includes('hub') ||
             desc.includes('shaft') || desc.includes('motor') || desc.includes('wheel');
    },
    confidenceWeight: 9,
    category: 'mechanical',
  },
  {
    id: 'load_type',
    text: 'What type of load will this part experience?',
    type: 'select',
    options: [
      { value: 'static',    label: 'Static — constant force' },
      { value: 'dynamic',   label: 'Dynamic — varying / cyclic force' },
      { value: 'impact',    label: 'Impact — sudden shock loads' },
      { value: 'torsional', label: 'Torsional — twisting forces' },
    ],
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      return ['structural', 'mechanical'].includes(purpose);
    },
    confidenceWeight: 8,
    category: 'strength',
  },
  {
    id: 'safety_factor',
    text: 'What safety factor do you want? (2× = twice the required strength)',
    type: 'select',
    options: [
      { value: '1.5', label: '1.5× — prototype / one-off' },
      { value: '2',   label: '2× — standard engineering (recommended)' },
      { value: '3',   label: '3× — safety-critical' },
      { value: '4',   label: '4× — life-critical' },
    ],
    condition: (_, answers) => {
      return answers.find(a => a.questionId === 'load_type') !== undefined;
    },
    confidenceWeight: 6,
    category: 'strength',
  },
  {
    id: 'rpm_range',
    text: 'What is the expected RPM range for rotating parts?',
    type: 'select',
    options: [
      { value: 'low',    label: 'Low — under 100 RPM (slow mechanisms)' },
      { value: 'medium', label: 'Medium — 100–1000 RPM (motors, drills)' },
      { value: 'high',   label: 'High — 1000–5000 RPM' },
      { value: 'none',   label: 'No rotation' },
    ],
    condition: (intake, _) => {
      const desc = (intake.description || '').toLowerCase();
      return desc.includes('gear') || desc.includes('pulley') || desc.includes('wheel') ||
             desc.includes('motor') || desc.includes('fan') || desc.includes('rotat');
    },
    confidenceWeight: 7,
    category: 'mechanical',
  },

  // ── THERMAL ────────────────────────────────────────────────────────────────
  {
    id: 'max_temp',
    text: 'What is the maximum operating temperature? (°C)',
    type: 'number',
    placeholder: '40',
    unit: '°C',
    min: -40, max: 300, step: 5,
    condition: (intake, _) => {
      const desc = (intake.description || '').toLowerCase();
      return desc.includes('heat') || desc.includes('engine') || desc.includes('oven') ||
             desc.includes('thermal') || desc.includes('enclosur') || desc.includes('hot');
    },
    confidenceWeight: 7,
    category: 'thermal',
  },
  {
    id: 'thermal_cycling',
    text: 'Will this part experience repeated heating and cooling cycles?',
    type: 'boolean',
    condition: (_, answers) => {
      return answers.find(a => a.questionId === 'max_temp') !== undefined;
    },
    confidenceWeight: 5,
    category: 'thermal',
  },
  {
    id: 'heatsink_needed',
    text: 'Does this part need integrated heat dissipation features (fins, channels)?',
    type: 'boolean',
    condition: (_, answers) => {
      const temp = answers.find(a => a.questionId === 'max_temp')?.value;
      return temp !== undefined && Number(temp) > 60;
    },
    confidenceWeight: 6,
    category: 'thermal',
  },

  // ── ELECTRICAL ─────────────────────────────────────────────────────────────
  {
    id: 'ip_rating',
    text: 'What IP (Ingress Protection) rating is needed?',
    type: 'select',
    options: [
      { value: 'none', label: 'None — indoor, dry use' },
      { value: 'IP42', label: 'IP42 — splash-proof' },
      { value: 'IP54', label: 'IP54 — dust and splash protected' },
      { value: 'IP65', label: 'IP65 — fully dust-tight, water jets' },
      { value: 'IP67', label: 'IP67 — submersible (1m, 30min)' },
    ],
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      const waterproof = answers.find(a => a.questionId === 'waterproof')?.value;
      return purpose === 'enclosure' || waterproof === 'true' || waterproof === true;
    },
    confidenceWeight: 8,
    category: 'electrical',
  },
  {
    id: 'cable_passthrough',
    text: 'Are there cables or connectors that need to pass through? (diameter in mm)',
    type: 'number',
    placeholder: '8',
    unit: 'mm',
    min: 2, max: 50, step: 0.5,
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      return purpose === 'enclosure';
    },
    confidenceWeight: 7,
    category: 'electrical',
  },
  {
    id: 'pcb_size',
    text: 'What PCB size needs to fit inside? (e.g. Raspberry Pi Zero, Arduino Nano, custom)',
    type: 'text',
    placeholder: 'Raspberry Pi Zero',
    condition: (intake, _) => {
      const desc = (intake.description || '').toLowerCase();
      return desc.includes('pcb') || desc.includes('electronic') || desc.includes('arduino') ||
             desc.includes('pi') || desc.includes('board') || desc.includes('circuit');
    },
    confidenceWeight: 9,
    category: 'electrical',
  },

  // ── ASSEMBLY ───────────────────────────────────────────────────────────────
  {
    id: 'part_count',
    text: 'How many printed parts will this design consist of?',
    type: 'select',
    options: [
      { value: '1',   label: 'Single piece (print-in-place preferred)' },
      { value: '2-3', label: '2–3 parts (bolted or glued together)' },
      { value: '4+',  label: '4 or more parts (modular assembly)' },
    ],
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      return ['structural', 'mechanical', 'enclosure', 'mounting'].includes(purpose);
    },
    confidenceWeight: 6,
    category: 'assembly',
  },
  {
    id: 'hardware_inserts',
    text: 'Will you use heat-set inserts, nuts, or other embedded hardware?',
    type: 'boolean',
    condition: (_, answers) => {
      const mounting = answers.find(a => a.questionId === 'mounting_type')?.value;
      return mounting === 'screws';
    },
    confidenceWeight: 7,
    category: 'assembly',
  },
  {
    id: 'clearance_fit',
    text: 'What clearance do you need between mating parts? (µm)',
    type: 'select',
    options: [
      { value: '100', label: '0.1mm — tight slide fit (shafts, guides)' },
      { value: '200', label: '0.2mm — standard running fit (recommended)' },
      { value: '400', label: '0.4mm — loose / print-in-place clearance' },
      { value: '600', label: '0.6mm — loose assembly / toolless removal' },
    ],
    condition: (_, answers) => {
      const tolerance = answers.find(a => a.questionId === 'tolerance_class')?.value;
      return tolerance === 'precise' || tolerance === 'standard';
    },
    confidenceWeight: 7,
    category: 'assembly',
  },

  // ── AESTHETIC ──────────────────────────────────────────────────────────────
  {
    id: 'texture_preference',
    text: 'Do you want any surface texture on the exterior?',
    type: 'select',
    options: [
      { value: 'smooth',   label: 'Smooth — flat layer lines' },
      { value: 'ribbed',   label: 'Ribbed — grip ridges' },
      { value: 'matte',    label: 'Matte — fine textured surface' },
      { value: 'none',     label: 'No preference' },
    ],
    condition: (_, answers) => {
      const finish = answers.find(a => a.questionId === 'surface_finish')?.value;
      return finish === 'high' || finish === 'moderate';
    },
    confidenceWeight: 3,
    category: 'aesthetic',
  },
  {
    id: 'label_emboss',
    text: 'Do you want text or a logo embossed or debossed into the surface?',
    type: 'boolean',
    condition: (_, answers) => {
      const finish = answers.find(a => a.questionId === 'surface_finish')?.value;
      return finish === 'high';
    },
    confidenceWeight: 3,
    category: 'aesthetic',
  },

  // ── FDM-SPECIFIC ───────────────────────────────────────────────────────────
  {
    id: 'layer_adhesion_direction',
    text: 'Which axis carries the highest load? (determines optimal print orientation)',
    type: 'select',
    options: [
      { value: 'xy', label: 'XY plane — load along length/width (print flat)' },
      { value: 'z',  label: 'Z axis — load along print height (print upright)' },
      { value: 'mixed', label: 'Mixed / unknown' },
    ],
    condition: (_, answers) => {
      const purpose = answers.find(a => a.questionId === 'functional_purpose')?.value;
      return ['structural', 'mechanical'].includes(purpose);
    },
    confidenceWeight: 7,
    category: 'fdm',
  },
  {
    id: 'split_for_size',
    text: 'If this is larger than your printer bed, should it be split into interlocking pieces?',
    type: 'boolean',
    condition: (intake, _) => {
      const dims = [intake.width, intake.depth, intake.height].filter(Boolean);
      return dims.some(d => Number(d) > 200);
    },
    confidenceWeight: 6,
    category: 'fdm',
  },
  {
    id: 'support_material',
    text: 'What support material strategy do you prefer?',
    type: 'select',
    options: [
      { value: 'none',      label: 'No supports (redesign overhangs)' },
      { value: 'normal',    label: 'Standard supports (same material)' },
      { value: 'breakaway', label: 'Breakaway supports' },
      { value: 'soluble',   label: 'Soluble supports (PVA/HIPS)' },
    ],
    condition: (_, answers) => {
      return answers.find(a => a.questionId === 'supports_needed')?.value === true ||
             answers.find(a => a.questionId === 'supports_needed')?.value === 'true';
    },
    confidenceWeight: 5,
    category: 'fdm',
  },
  {
    id: 'nozzle_size',
    text: 'What nozzle size are you printing with?',
    type: 'select',
    options: [
      { value: '0.2', label: '0.2mm — detail nozzle (slow)' },
      { value: '0.4', label: '0.4mm — standard (recommended)' },
      { value: '0.6', label: '0.6mm — fast / draft quality' },
      { value: '0.8', label: '0.8mm — very fast, thick walls' },
    ],
    condition: () => true,
    confidenceWeight: 5,
    category: 'fdm',
  },
  {
    id: 'layer_height',
    text: 'What layer height do you plan to use?',
    type: 'select',
    options: [
      { value: '0.1', label: '0.1mm — fine detail (slow)' },
      { value: '0.2', label: '0.2mm — standard quality' },
      { value: '0.3', label: '0.3mm — draft quality (fast)' },
    ],
    condition: (_, answers) => {
      const finish = answers.find(a => a.questionId === 'surface_finish')?.value;
      return finish !== undefined;
    },
    confidenceWeight: 4,
    category: 'fdm',
  },

  // ── STRENGTH / ADVANCED ────────────────────────────────────────────────────
  {
    id: 'fatigue_life',
    text: 'How many load cycles is this part expected to survive?',
    type: 'select',
    options: [
      { value: 'one-time',   label: 'One-time or rare use' },
      { value: 'low',        label: 'Up to 1,000 cycles' },
      { value: 'medium',     label: '1,000–100,000 cycles' },
      { value: 'high',       label: '100,000+ cycles (high fatigue)' },
    ],
    condition: (_, answers) => {
      const load = answers.find(a => a.questionId === 'load_type')?.value;
      return load === 'dynamic' || load === 'impact';
    },
    confidenceWeight: 6,
    category: 'strength',
  },
  {
    id: 'flex_requirement',
    text: 'Should this part be rigid or have some flexibility?',
    type: 'select',
    options: [
      { value: 'rigid',     label: 'Rigid — no flex allowed' },
      { value: 'semi-flex', label: 'Semi-flexible — slight give (PETG territory)' },
      { value: 'flexible',  label: 'Flexible / elastic (TPU)' },
    ],
    condition: (intake, _) => {
      const desc = (intake.description || '').toLowerCase();
      return desc.includes('flex') || desc.includes('rubber') || desc.includes('elastic') ||
             desc.includes('soft') || desc.includes('grip');
    },
    confidenceWeight: 8,
    category: 'material',
  },
  {
    id: 'chemical_resistance',
    text: 'Will this part be exposed to chemicals, oils, or solvents?',
    type: 'boolean',
    condition: (intake, _) => {
      const desc = (intake.description || '').toLowerCase();
      return desc.includes('chemical') || desc.includes('oil') || desc.includes('solvent') ||
             desc.includes('fuel') || desc.includes('acid') || desc.includes('outdoors');
    },
    confidenceWeight: 7,
    category: 'material',
  },
];

export default questions;
