/**
 * Base generator contract.
 * All generators must export an object with this shape:
 *
 * {
 *   id: string,
 *   label: string,
 *   icon: string,           // emoji or SVG
 *   description: string,
 *   paramSchema: ParamDef[],
 *   generate(params) → GeneratorResult,
 *   validate(params) → string[]   // validation errors (empty = valid)
 * }
 *
 * GeneratorResult:
 * {
 *   mesh: Mesh,
 *   openscadSource: string,
 *   metadata: {
 *     partType: string,
 *     dimensions: object,
 *     volume: number,        // mm³
 *     estimatedMass: number, // grams (PLA density ~1.24 g/cm³)
 *     triangleCount: number,
 *     generatorId: string,
 *   }
 * }
 *
 * ParamDef:
 * {
 *   id: string,
 *   label: string,
 *   type: 'number' | 'boolean' | 'select' | 'text',
 *   default: any,
 *   unit?: string,
 *   min?: number, max?: number, step?: number,
 *   options?: { value, label }[],
 *   description?: string
 * }
 */

export const PLA_DENSITY = 0.00124; // g/mm³

export function estimateMass(volumeMm3, density = PLA_DENSITY) {
  return volumeMm3 * density;
}

export function makeMetadata(generatorId, partType, dimensions, mesh) {
  const volume = mesh.volume();
  return {
    generatorId,
    partType,
    dimensions,
    volume,
    estimatedMass: estimateMass(volume),
    triangleCount: mesh.triangleCount,
    vertexCount: mesh.vertexCount,
    bounds: mesh.bounds(),
  };
}

export function validatePositive(params, fields) {
  const errors = [];
  for (const field of fields) {
    const v = params[field];
    if (v == null || isNaN(v) || v <= 0) {
      errors.push(`${field} must be a positive number`);
    }
  }
  return errors;
}

export function validateRange(params, field, min, max) {
  const errors = [];
  const v = params[field];
  if (v != null && (v < min || v > max)) {
    errors.push(`${field} must be between ${min} and ${max}`);
  }
  return errors;
}
