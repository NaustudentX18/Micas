/**
 * Print time, filament, and cost estimator for FFF/FDM 3D printing.
 * All calculations are approximations based on typical printer profiles.
 */

export const MATERIALS = {
  PLA:   { label: 'PLA — Standard',       density: 1.24, costPerKg: 22,  color: '#4CAF50' },
  PETG:  { label: 'PETG — Durable',       density: 1.27, costPerKg: 25,  color: '#2196F3' },
  ABS:   { label: 'ABS — Heat resistant', density: 1.05, costPerKg: 22,  color: '#FF9800' },
  TPU:   { label: 'TPU — Flexible',       density: 1.21, costPerKg: 35,  color: '#9C27B0' },
  ASA:   { label: 'ASA — UV resistant',   density: 1.07, costPerKg: 28,  color: '#F44336' },
  Nylon: { label: 'Nylon PA — Strong',    density: 1.10, costPerKg: 40,  color: '#607D8B' },
};

export const LAYER_PRESETS = [
  { value: 0.08, label: '0.08 mm — Ultra fine' },
  { value: 0.12, label: '0.12 mm — Fine' },
  { value: 0.16, label: '0.16 mm — Detail' },
  { value: 0.20, label: '0.20 mm — Standard' },
  { value: 0.28, label: '0.28 mm — Draft' },
  { value: 0.32, label: '0.32 mm — Speed' },
];

/**
 * Estimate print parameters from part volume.
 * @param {object} opts
 * @param {number} opts.volumeMm3       - Solid volume in mm³
 * @param {number} opts.infillPct       - Infill percentage (0-100)
 * @param {number} opts.layerHeightMm   - Layer height in mm
 * @param {string} opts.material        - Key from MATERIALS
 * @param {number} [opts.printSpeedMmS] - Override print speed (mm/s)
 * @returns {{ weightG, filamentLengthM, printTimeMin, costUsd }}
 */
export function estimatePrint({ volumeMm3, infillPct, layerHeightMm, material, printSpeedMmS = 80 }) {
  const mat = MATERIALS[material] || MATERIALS.PLA;
  const infill = Math.max(5, Math.min(100, infillPct));

  // Shell fraction: 2 perimeters × 0.4 mm nozzle account for ~30% of volume
  // in a typical part. The rest is split between infill void and infill lines.
  const shellFraction = 0.30;
  const effectiveFill = shellFraction + (infill / 100) * (1 - shellFraction);
  const effectiveVolumeMm3 = volumeMm3 * effectiveFill;

  // Weight (g)
  const weightG = (effectiveVolumeMm3 / 1000) * mat.density;

  // Filament length — volume of a cylinder of 1.75 mm diameter
  const filamentRadiusMm = 1.75 / 2;
  const filamentLengthMm = effectiveVolumeMm3 / (Math.PI * filamentRadiusMm * filamentRadiusMm);
  const filamentLengthM  = filamentLengthMm / 1000;

  // Print time — simplified slicer model
  // time = volume / (extrusion cross-section × linear speed) × overhead
  const nozzleWidthMm  = 0.4;
  const overheadFactor = 1.6; // travel moves, retractions, layer changes
  const printTimeS = (effectiveVolumeMm3 / (printSpeedMmS * layerHeightMm * nozzleWidthMm)) * overheadFactor;
  const printTimeMin = Math.max(1, Math.round(printTimeS / 60));

  // Cost — typical spool price per kg
  const costUsd = (weightG / 1000) * mat.costPerKg;

  return { weightG, filamentLengthM, printTimeMin, costUsd };
}

/** Format print time as "1h 23m" or "45m" */
export function fmtPrintTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
