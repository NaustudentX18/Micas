import { checkThinWalls } from './thin-wall.check.js';
import { checkOverhangs } from './overhang.check.js';
import { adviseOrientation } from './orientation.advisor.js';

/**
 * Engineering validation engine.
 * Runs all checks and produces a ValidationReport.
 *
 * ValidationReport: {
 *   score: 0-100,
 *   issues: [{title, description, code}],
 *   warnings: [{title, description, code}],
 *   recommendations: [{title, description}],
 *   orientation: OrientationAdvisory,
 *   printable: boolean
 * }
 */

export async function validate(mesh) {
  if (!mesh || mesh.faces.length === 0) {
    return {
      score: 0,
      issues: [{ title: 'No geometry', description: 'No mesh was generated.', code: 'NO_GEOMETRY' }],
      warnings: [], recommendations: [], orientation: null, printable: false
    };
  }

  const issues = [];
  const warnings = [];
  const recommendations = [];

  // Run checks
  const wallResult = checkThinWalls(mesh);
  issues.push(...wallResult.issues);
  warnings.push(...wallResult.warnings);

  const overhangResult = checkOverhangs(mesh);
  issues.push(...overhangResult.issues);
  warnings.push(...overhangResult.warnings);

  // Orientation
  const orientation = adviseOrientation(mesh);

  // Additional recommendations
  const bounds = mesh.bounds();
  const dims = {
    x: bounds.max[0] - bounds.min[0],
    y: bounds.max[1] - bounds.min[1],
    z: bounds.max[2] - bounds.min[2]
  };

  // Size warning
  if (dims.x > 250 || dims.y > 250) {
    warnings.push({
      title: 'Large print dimensions',
      description: `Part is ${dims.x.toFixed(0)}×${dims.y.toFixed(0)}mm — exceeds typical FDM bed size. Verify it fits your printer.`,
      code: 'LARGE_PART'
    });
  }

  // Very small part
  if (Math.max(dims.x, dims.y, dims.z) < 5) {
    warnings.push({
      title: 'Very small part',
      description: 'Part dimensions are very small. Ensure minimum feature size is at least 0.4mm for FDM.',
      code: 'SMALL_PART'
    });
  }

  // Orientation recommendation
  if (orientation) {
    if (orientation.index !== 0) {
      recommendations.push({
        title: `Reorient for best result`,
        description: `Print in "${orientation.name}" orientation to minimize supports. ${orientation.description}.`
      });
    }
    if (orientation.overhangs > mesh.faces.length * 0.05) {
      recommendations.push({
        title: 'Enable support structures',
        description: `Detected ${orientation.overhangs} overhanging faces. Use slicer support generation.`
      });
    }
  }

  // Volume check
  const volume = mesh.volume();
  if (volume > 200000) { // ~200 cm³
    recommendations.push({
      title: 'Large volume — use low infill',
      description: `Volume ~${(volume/1000).toFixed(0)}cm³. Consider 10-15% infill to save material and time.`
    });
  }

  // Compute score
  const issueDeduction = issues.length * 15;
  const warnDeduction = warnings.length * 5;
  const score = Math.max(0, 100 - issueDeduction - warnDeduction);

  return {
    score,
    issues,
    warnings,
    recommendations,
    orientation,
    printable: issues.length === 0,
    stats: {
      triangles: mesh.triangleCount,
      volume: volume,
      bounds: dims
    }
  };
}
