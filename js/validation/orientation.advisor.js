import { faceNormal } from '../utils/math.utils.js';

/**
 * Print orientation advisor.
 * Evaluates 6 standard orientations and recommends the best one.
 */

const ORIENTATIONS = [
  { name: '+Z up (default)',    description: 'Natural orientation, flat base down' },
  { name: '-Z up (flipped)',    description: 'Part flipped upside down' },
  { name: '+X up',             description: 'Part rotated 90° — wide face down' },
  { name: '-X up',             description: 'Part rotated -90° on X axis' },
  { name: '+Y up',             description: 'Part rotated 90° on Y axis' },
  { name: '-Y up',             description: 'Part rotated -90° on Y axis' },
];

// Rotation matrices for each orientation
const ROTATIONS = [
  (v) => v,                                  // +Z (identity)
  ([x,y,z]) => [x, -y, -z],                 // -Z
  ([x,y,z]) => [z, y, -x],                  // +X
  ([x,y,z]) => [-z, y, x],                  // -X
  ([x,y,z]) => [x, z, -y],                  // +Y
  ([x,y,z]) => [x, -z, y],                  // -Y
];

function scoreOrientation(mesh, rotate) {
  let overhangs = 0;
  let contactArea = 0;
  const bounds = mesh.bounds();

  for (const [i0, i1, i2] of mesh.faces) {
    const v0 = rotate(mesh.vertices[i0]);
    const v1 = rotate(mesh.vertices[i1]);
    const v2 = rotate(mesh.vertices[i2]);

    const norm = faceNormal(v0, v1, v2);

    // Overhang: face points downward (norm_z < 0) beyond 45°
    const downward = norm[2] < 0;
    const angleFromVert = Math.acos(Math.min(1, Math.abs(norm[2]))) * (180 / Math.PI);

    if (downward && angleFromVert > 45) overhangs++;

    // Contact area: faces pointing straight down (norm_z < -0.95) near bottom
    const minZ = Math.min(v0[2], v1[2], v2[2]);
    const rotBounds = {
      min: rotate(bounds.min),
      max: rotate(bounds.max)
    };
    if (norm[2] < -0.9) contactArea++;
  }

  // Score: minimize overhangs, maximize contact area
  const total = mesh.faces.length;
  const overhangPct = overhangs / total;
  const score = 100 - overhangPct * 80 + (contactArea / total) * 20;

  return { overhangs, contactArea, score };
}

export function adviseOrientation(mesh) {
  let best = null;
  let bestScore = -Infinity;

  for (let i = 0; i < ORIENTATIONS.length; i++) {
    const { score, overhangs, contactArea } = scoreOrientation(mesh, ROTATIONS[i]);
    if (score > bestScore) {
      bestScore = score;
      best = { ...ORIENTATIONS[i], score, overhangs, contactArea, index: i };
    }
  }

  return best;
}
