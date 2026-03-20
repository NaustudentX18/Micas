import { fmtDate, fmtVolume, fmtMass } from '../utils/format.utils.js';

/**
 * Bambu Print Sheet export.
 * Generates a JSON compatible with Bambu Studio project notes / print settings.
 */

const MATERIAL_PRESETS = {
  PLA:  { nozzleTemp: 220, bedTemp: 55,  fanSpeed: 100, speed: 80,  retraction: 0.8 },
  PETG: { nozzleTemp: 235, bedTemp: 70,  fanSpeed: 30,  speed: 60,  retraction: 1.0 },
  ABS:  { nozzleTemp: 250, bedTemp: 100, fanSpeed: 0,   speed: 50,  retraction: 1.2 },
  TPU:  { nozzleTemp: 230, bedTemp: 40,  fanSpeed: 50,  speed: 25,  retraction: 0.5 },
  ASA:  { nozzleTemp: 255, bedTemp: 100, fanSpeed: 10,  speed: 50,  retraction: 1.2 },
  Nylon:{ nozzleTemp: 260, bedTemp: 80,  fanSpeed: 0,   speed: 40,  retraction: 1.0 },
};

export function generateBambuSheet(brief, metadata, validationReport) {
  const material = brief?.material_recommendation || 'PLA';
  const preset = MATERIAL_PRESETS[material] || MATERIAL_PRESETS.PLA;
  const printStrategy = brief?.print_strategy || {};
  const infill = printStrategy.infill || 20;
  const supports = printStrategy.supports || false;

  const volume = metadata?.volume || 0;
  const mass = metadata?.estimatedMass || 0;

  const sheet = {
    _generator: 'My Personal CAD v2',
    _generated: new Date().toISOString(),
    project: {
      name: metadata?.partType ? `${metadata.partType}_part` : 'cad_part',
      description: brief?.object_type || 'FDM 3D Printed Part',
    },
    material: {
      name: material,
      nozzle_temperature: preset.nozzleTemp,
      bed_temperature: preset.bedTemp,
      fan_speed_percent: preset.fanSpeed,
    },
    print_settings: {
      layer_height: 0.2,
      first_layer_height: 0.3,
      infill_percentage: infill,
      infill_pattern: infill > 40 ? 'grid' : 'gyroid',
      print_speed: preset.speed,
      enable_support: supports,
      support_threshold: 45,
      retraction_length: preset.retraction,
      perimeters: 3,
      top_layers: 5,
      bottom_layers: 4,
    },
    part_info: {
      volume_cm3: parseFloat((volume / 1000).toFixed(2)),
      estimated_mass_g: parseFloat(mass.toFixed(1)),
      dimensions_mm: metadata?.dimensions || {},
      bounds: metadata?.bounds || {},
      triangle_count: metadata?.triangleCount || 0,
    },
    confidence: brief?.confidence || 0,
    assumptions: brief?.assumptions || [],
    validation: validationReport ? {
      score: validationReport.score,
      printable: validationReport.printable,
      issue_count: validationReport.issues?.length || 0,
      warning_count: validationReport.warnings?.length || 0,
    } : null,
  };

  return JSON.stringify(sheet, null, 2);
}
