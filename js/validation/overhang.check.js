/**
 * Overhang detection.
 * Checks face normals against Z-up print direction.
 * Angles > 45° from vertical are flagged as overhangs.
 */

import { faceNormal } from '../utils/math.utils.js';

const MAX_SELF_SUPPORTING_ANGLE = 45; // degrees from vertical

export function checkOverhangs(mesh) {
  const issues = [];
  const warnings = [];
  let criticalCount = 0;
  let warnCount = 0;

  for (const [i0, i1, i2] of mesh.faces) {
    const v0 = mesh.vertices[i0];
    const v1 = mesh.vertices[i1];
    const v2 = mesh.vertices[i2];

    const norm = faceNormal(v0, v1, v2);

    // downDot > 0 means face is pointing downward
    // angle from vertical = acos(|norm_z|) = acos(|1 - downDot_magnitude|)
    const angleFromVertical = Math.acos(Math.min(1, Math.abs(norm[2]))) * (180 / Math.PI);

    if (norm[2] < 0 && angleFromVertical > MAX_SELF_SUPPORTING_ANGLE) {
      criticalCount++;
    } else if (norm[2] < 0 && angleFromVertical > 30) {
      warnCount++;
    }
  }

  const totalFaces = mesh.faces.length;

  if (criticalCount > totalFaces * 0.15) {
    issues.push({
      title: `Significant overhangs detected`,
      description: `About ${Math.round(criticalCount/totalFaces*100)}% of faces overhang beyond 45°. Support material will be required. Consider reorienting the model or adding chamfers.`,
      code: 'OVERHANG_CRITICAL',
      count: criticalCount
    });
  } else if (criticalCount > 0 || warnCount > 0) {
    warnings.push({
      title: `Moderate overhangs present`,
      description: `${criticalCount + warnCount} face(s) have overhangs. Some may require support or careful orientation.`,
      code: 'OVERHANG_MODERATE',
      count: criticalCount + warnCount
    });
  }

  return { issues, warnings, overhangFaceCount: criticalCount + warnCount };
}
