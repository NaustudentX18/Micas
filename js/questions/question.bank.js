/**
 * Question bank — 18 adaptive questions covering all major design parameters.
 * Each question has:
 *   id, text, type (select|text|number|multi|boolean), options?, placeholder?,
 *   condition(intake, answers) → boolean,  // whether to ask this question
 *   confidenceWeight,   // how much answering this adds to confidence
 *   category            // material | geometry | fit | function | print
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
];

export default questions;
