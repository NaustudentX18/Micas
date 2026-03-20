/**
 * Thin wall detection.
 * Checks minimum edge lengths in the mesh against FDM print thresholds.
 */

const MIN_WALL_FDM = 1.2;    // mm — minimum printable wall at 0.4mm nozzle
const WARN_WALL = 2.0;       // mm — recommended minimum

export function checkThinWalls(mesh) {
  const issues = [];
  const warnings = [];
  let thinCount = 0;
  let warnCount = 0;

  for (const [i0, i1, i2] of mesh.faces) {
    const v0 = mesh.vertices[i0];
    const v1 = mesh.vertices[i1];
    const v2 = mesh.vertices[i2];

    const edges = [
      edgeLen(v0, v1), edgeLen(v1, v2), edgeLen(v0, v2)
    ];
    const minEdge = Math.min(...edges);

    if (minEdge < MIN_WALL_FDM) thinCount++;
    else if (minEdge < WARN_WALL) warnCount++;
  }

  if (thinCount > 0) {
    issues.push({
      title: `Thin features detected (${thinCount} triangle${thinCount > 1 ? 's' : ''})`,
      description: `Some features are thinner than ${MIN_WALL_FDM}mm — may not print reliably at standard 0.4mm nozzle. Consider thickening walls to at least 1.5mm.`,
      code: 'THIN_WALL',
      count: thinCount
    });
  } else if (warnCount > 0) {
    warnings.push({
      title: `Fine features present (${warnCount} triangle${warnCount > 1 ? 's' : ''})`,
      description: `Some features are thinner than ${WARN_WALL}mm. Print at slow speed with good cooling for best results.`,
      code: 'THIN_WALL_WARN',
      count: warnCount
    });
  }

  return { issues, warnings };
}

function edgeLen(a, b) {
  const dx = a[0]-b[0], dy = a[1]-b[1], dz = a[2]-b[2];
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}
