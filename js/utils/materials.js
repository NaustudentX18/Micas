/**
 * Material definitions and print estimation utilities.
 */

export const MATERIALS = [
  {
    id: 'pla',
    name: 'PLA',
    density: 1.24,        // g/cm³
    nozzleTemp: 215,      // °C
    bedTemp: 60,
    pricePerKg: 20,       // USD default
    color: '#6c8aff',
  },
  {
    id: 'pla-cf',
    name: 'PLA-CF',
    density: 1.30,
    nozzleTemp: 220,
    bedTemp: 60,
    pricePerKg: 35,
    color: '#333344',
  },
  {
    id: 'petg',
    name: 'PETG',
    density: 1.27,
    nozzleTemp: 235,
    bedTemp: 80,
    pricePerKg: 22,
    color: '#4cf0b0',
  },
  {
    id: 'abs',
    name: 'ABS',
    density: 1.05,
    nozzleTemp: 240,
    bedTemp: 100,
    pricePerKg: 18,
    color: '#f5c542',
  },
  {
    id: 'asa',
    name: 'ASA',
    density: 1.07,
    nozzleTemp: 245,
    bedTemp: 100,
    pricePerKg: 25,
    color: '#ff7a45',
  },
  {
    id: 'tpu',
    name: 'TPU',
    density: 1.21,
    nozzleTemp: 225,
    bedTemp: 40,
    pricePerKg: 28,
    color: '#e040fb',
  },
  {
    id: 'nylon',
    name: 'Nylon',
    density: 1.14,
    nozzleTemp: 250,
    bedTemp: 80,
    pricePerKg: 32,
    color: '#90caf9',
  },
  {
    id: 'pc',
    name: 'PC',
    density: 1.20,
    nozzleTemp: 270,
    bedTemp: 110,
    pricePerKg: 40,
    color: '#b0bec5',
  },
  {
    id: 'hips',
    name: 'HIPS',
    density: 1.04,
    nozzleTemp: 230,
    bedTemp: 100,
    pricePerKg: 20,
    color: '#ffe082',
  },
  {
    id: 'resin',
    name: 'Resin',
    density: 1.10,
    nozzleTemp: null,
    bedTemp: null,
    pricePerKg: 50,
    color: '#f48fb1',
  },
];

/**
 * Get a material definition by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getMaterial(id) {
  return MATERIALS.find(m => m.id === id);
}

/**
 * Estimate print time in minutes.
 * @param {number} volumeMm3    - Part volume in mm³
 * @param {number} layerHeight  - Layer height in mm (default 0.2)
 * @param {number} printSpeed   - Print speed in mm/s (default 60)
 * @param {number} infillPct    - Infill percentage 0–100 (default 20)
 * @returns {number} Estimated minutes
 */
export function estimatePrintTime(volumeMm3, layerHeight = 0.2, printSpeed = 60, infillPct = 20) {
  if (!volumeMm3 || volumeMm3 <= 0) return 0;

  // Effective volume accounting for infill (shells ~25% of volume at full density)
  const shellFraction = 0.25;
  const infillFraction = infillPct / 100;
  const effectiveVolume = volumeMm3 * (shellFraction + (1 - shellFraction) * infillFraction);

  // Extruded length in mm (nozzle 0.4mm, layer height given)
  const nozzleDiameter = 0.4;
  const lineArea = nozzleDiameter * layerHeight; // mm²
  const extrudedLength = effectiveVolume / lineArea; // mm

  // Time at given speed (mm/s → seconds → minutes)
  const seconds = extrudedLength / printSpeed;
  // Add 15% overhead for travel, retracts, layer changes
  return Math.round((seconds * 1.15) / 60);
}

/**
 * Estimate filament cost in USD.
 * @param {number} massGrams  - Filament mass in grams
 * @param {number} pricePerKg - Price per kilogram in USD
 * @returns {number} Cost in USD
 */
export function estimateCost(massGrams, pricePerKg) {
  if (!massGrams || !pricePerKg) return 0;
  return (massGrams / 1000) * pricePerKg;
}

/**
 * Format print time (minutes) to a human-readable string.
 * @param {number} minutes
 * @returns {string}
 */
export function fmtPrintTime(minutes) {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
