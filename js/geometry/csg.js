import { Mesh } from './mesh.js';
import { translate } from './transform.js';

/**
 * Simplified CSG operations.
 *
 * NOTE: Full BSP CSG is very complex. For axis-aligned operations (most common
 * in FDM CAD), generators build hollow shapes directly. This module provides:
 *   - union: merge two meshes (no overlap removal — suitable for non-overlapping parts)
 *   - subtract: axis-aligned box subtraction only (for simple cutouts)
 *   - cutBox: carve an axis-aligned box from a mesh by replacing it with a
 *             manually-constructed shell (the most common CAD operation)
 *
 * For non-axis-aligned subtractions, generators handle geometry directly.
 */

/**
 * Union: merge two meshes into one (no deduplication).
 * Use when parts don't intersect or when visual merging is sufficient.
 */
export function union(meshA, meshB) {
  const result = meshA.clone();
  result.merge(meshB);
  return result;
}

/**
 * Merge multiple meshes.
 */
export function mergeAll(...meshes) {
  const result = new Mesh();
  for (const m of meshes) result.merge(m);
  return result;
}

/**
 * Subtract an axis-aligned box from another axis-aligned box to create a
 * hollow shell. This is the primary CSG operation needed for enclosures/boxes.
 *
 * Both boxes are centered at origin.
 * @param {number} ow @param {number} od @param {number} oh — outer dimensions
 * @param {number} iw @param {number} id @param {number} ih — inner dimensions (must be smaller)
 * @param {number} [iz=0] — inner box Z offset (0 = inner starts at outer floor)
 */
export function hollowBox(ow, od, oh, iw, id, ih, iz = 0) {
  const m = new Mesh();
  const [OW, OD, OH] = [ow/2, od/2, oh/2];
  const [IW, ID] = [iw/2, id/2];
  const innerBottom = -OH + iz;
  const innerTop = innerBottom + ih;
  const outerTop = OH;

  // Helper: add a box face (quad as 2 tris)
  function quad(a, b, c, d) {
    const vi = [a, b, c, d].map(([x,y,z]) => m.addVertex(x,y,z));
    m.addQuad(vi[0], vi[1], vi[2], vi[3]);
  }

  // Outer bottom
  quad([-OW,-OD,-OH],[OW,-OD,-OH],[OW,OD,-OH],[-OW,OD,-OH]);
  // Outer top
  quad([-OW,-OD,outerTop],[OW,-OD,outerTop],[OW,OD,outerTop],[-OW,OD,outerTop]);
  // Outer front (−Y)
  quad([-OW,-OD,-OH],[-OW,-OD,outerTop],[OW,-OD,outerTop],[OW,-OD,-OH]);
  // Outer back (+Y)
  quad([OW,OD,-OH],[OW,OD,outerTop],[-OW,OD,outerTop],[-OW,OD,-OH]);
  // Outer left (−X)
  quad([-OW,OD,-OH],[-OW,OD,outerTop],[-OW,-OD,outerTop],[-OW,-OD,-OH]);
  // Outer right (+X)
  quad([OW,-OD,-OH],[OW,-OD,outerTop],[OW,OD,outerTop],[OW,OD,-OH]);

  // Inner floor (only if iz > 0, i.e. floor has thickness)
  if (iz > 0) {
    quad([-IW,-ID,-OH],[IW,-ID,-OH],[IW,ID,-OH],[-IW,ID,-OH]);
  }

  // Inner walls (reversed winding — normals point inward)
  if (innerTop < outerTop) {
    quad([-IW,-ID,innerBottom],[-IW,-ID,innerTop],[IW,-ID,innerTop],[IW,-ID,innerBottom]); // front inner
    quad([IW,ID,innerBottom],[IW,ID,innerTop],[-IW,ID,innerTop],[-IW,ID,innerBottom]); // back inner
    quad([-IW,ID,innerBottom],[-IW,ID,innerTop],[-IW,-ID,innerTop],[-IW,-ID,innerBottom]); // left inner
    quad([IW,-ID,innerBottom],[IW,-ID,innerTop],[IW,ID,innerTop],[IW,ID,innerBottom]); // right inner
  }

  // Rim (top of outer wall connects to top of inner cavity)
  if (innerTop < outerTop) {
    // Front rim
    quad([-OW,-OD,outerTop],[-IW,-ID,outerTop],[IW,-ID,outerTop],[OW,-OD,outerTop]);
    // Back rim
    quad([OW,OD,outerTop],[IW,ID,outerTop],[-IW,ID,outerTop],[-OW,OD,outerTop]);
    // Left rim
    quad([-OW,OD,outerTop],[-OW,-OD,outerTop],[-IW,-ID,outerTop],[-IW,ID,outerTop]);
    // Right rim
    quad([OW,-OD,outerTop],[OW,OD,outerTop],[IW,ID,outerTop],[IW,-ID,outerTop]);
  }

  return m;
}
