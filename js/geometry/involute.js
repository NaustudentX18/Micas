import { Mesh } from './mesh.js';
import { deg2rad } from '../utils/math.utils.js';

/**
 * Involute gear geometry.
 *
 * Generates a spur gear with proper involute tooth profiles.
 * Based on standard involute geometry equations.
 */

/**
 * Compute a point on the involute of a base circle.
 * @param {number} baseR — base circle radius
 * @param {number} t     — parameter (angle in radians)
 * @returns {[number, number]}
 */
function involutePoint(baseR, t) {
  return [
    baseR * (Math.cos(t) + t * Math.sin(t)),
    baseR * (Math.sin(t) - t * Math.cos(t))
  ];
}

/**
 * Generate a single gear tooth profile polygon (2D, in XY plane).
 * Returns array of [x, y] points forming the tooth outline.
 */
function toothProfile(module, teeth, pressureAngle = 20, steps = 8) {
  const pa = deg2rad(pressureAngle);
  const pitchR = (module * teeth) / 2;
  const baseR = pitchR * Math.cos(pa);
  const addendumR = pitchR + module;           // tip circle
  const dedendumR = Math.max(pitchR - 1.25 * module, baseR * 0.8); // root circle

  const toothAngle = (2 * Math.PI) / teeth;
  const halfTooth = toothAngle / 4;

  // Involute parameter range: from base circle to addendum
  const tStart = 0;
  const tEnd = Math.sqrt(Math.max((addendumR/baseR)**2 - 1, 0));

  const profile = [];

  // Right flank (involute from base to tip)
  for (let i = 0; i <= steps; i++) {
    const t = tStart + (i / steps) * (tEnd - tStart);
    const [x, y] = involutePoint(baseR, t);
    const angle = Math.atan2(y, x);
    const r = Math.sqrt(x*x + y*y);
    profile.push([r, angle]);
  }

  // Convert to Cartesian (right flank), rotated to center on tooth
  const flangeOffset = Math.atan(Math.sqrt(Math.max(0, (pitchR/baseR)**2 - 1)) - pa) - pa;
  const rightFlank = profile.map(([r, a]) => [
    r * Math.cos(a - flangeOffset + halfTooth/2),
    r * Math.sin(a - flangeOffset + halfTooth/2)
  ]);

  // Left flank (mirror of right)
  const leftFlank = rightFlank.map(([x, y]) => [x, -y]).reverse();

  // Root circle arc (between teeth)
  const arcPoints = 4;
  const rootArc = [];
  const rootStart = -halfTooth * 1.5;
  const rootEnd = -halfTooth * 0.5;
  for (let i = 0; i <= arcPoints; i++) {
    const a = rootStart + (i / arcPoints) * (rootEnd - rootStart);
    rootArc.push([dedendumR * Math.cos(a), dedendumR * Math.sin(a)]);
  }

  // Tip arc
  const tipArc = [];
  const tipHalf = Math.atan2(rightFlank[rightFlank.length-1][1], rightFlank[rightFlank.length-1][0]);
  const tipStart = -tipHalf;
  const tipEnd = tipHalf;
  for (let i = 0; i <= 3; i++) {
    const a = tipStart + (i/3) * (tipEnd - tipStart);
    tipArc.push([addendumR * Math.cos(a), addendumR * Math.sin(a)]);
  }

  return [...rightFlank, ...tipArc, ...leftFlank.slice(1), ...rootArc];
}

/**
 * Extrude a 2D polygon profile along Z to create a 3D mesh.
 */
function extrude2D(polygon, height) {
  const m = new Mesh();
  const n = polygon.length;
  const hz = height / 2;

  const bot = polygon.map(([x, y]) => m.addVertex(x, y, -hz));
  const top = polygon.map(([x, y]) => m.addVertex(x, y,  hz));

  // Side walls
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    m.addQuad(bot[i], bot[j], top[j], top[i]);
  }

  // Caps (fan triangulation from first vertex)
  for (let i = 1; i < n - 1; i++) { m.addFace(bot[0], bot[i+1], bot[i]); }
  for (let i = 1; i < n - 1; i++) { m.addFace(top[0], top[i], top[i+1]); }

  return m;
}

/**
 * Generate a spur gear mesh.
 * @param {Object} params
 * @param {number} params.teeth        — number of teeth (≥ 8)
 * @param {number} params.module       — module (mm), controls size (pitch = module*π)
 * @param {number} params.bore         — bore (shaft hole) diameter in mm
 * @param {number} params.height       — gear thickness (extrusion height) in mm
 * @param {number} [params.pressureAngle=20] — pressure angle in degrees
 * @returns {Mesh}
 */
export function gear({ teeth = 20, module = 1, bore = 5, height = 6, pressureAngle = 20 } = {}) {
  const m = new Mesh();
  const toothAngle = (2 * Math.PI) / teeth;
  const profile = toothProfile(module, teeth, pressureAngle);

  for (let t = 0; t < teeth; t++) {
    const angle = t * toothAngle;
    const cos = Math.cos(angle), sin = Math.sin(angle);

    // Rotate tooth profile
    const rotated = profile.map(([x, y]) => [
      x * cos - y * sin,
      x * sin + y * cos
    ]);

    m.merge(extrude2D(rotated, height));
  }

  // Subtract bore hole (add inner cylinder with reversed winding)
  if (bore > 0) {
    const boreR = bore / 2;
    const segs = 24;
    const hz = height / 2;
    const bBot = [], bTop = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      bBot.push(m.addVertex(Math.cos(a)*boreR, Math.sin(a)*boreR, -hz));
      bTop.push(m.addVertex(Math.cos(a)*boreR, Math.sin(a)*boreR,  hz));
    }
    const bc = m.addVertex(0, 0, -hz), tc = m.addVertex(0, 0, hz);
    for (let i = 0; i < segs; i++) {
      const n = (i + 1) % segs;
      // Reversed winding = hole
      m.addQuad(bBot[n], bTop[n], bTop[i], bBot[i]);
      m.addFace(bc, bBot[i], bBot[n]);
      m.addFace(tc, bTop[n], bTop[i]);
    }
  }

  return m;
}
