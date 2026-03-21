import { Mesh } from './mesh.js';

/**
 * Helical geometry for threaded connector generator.
 * Creates a mesh representing external or internal thread geometry.
 */

/**
 * Generate helical thread geometry.
 * @param {Object} params
 * @param {number} params.majorDiameter — outer thread diameter (mm)
 * @param {number} params.minorDiameter — inner (root) thread diameter (mm)
 * @param {number} params.pitch         — thread pitch (mm per revolution)
 * @param {number} params.length        — total threaded length (mm)
 * @param {number} [params.starts=1]    — number of thread starts
 * @param {number} [params.segmentsPerTurn=32] — tessellation quality
 * @param {boolean} [params.external=true] — external (bolt) or internal (nut) thread
 * @returns {Mesh}
 */
export function helixThread({
  majorDiameter = 10,
  minorDiameter = 8.5,
  pitch = 1.5,
  length = 20,
  starts = 1,
  segmentsPerTurn = 32,
  external = true
} = {}) {
  const m = new Mesh();

  const majorR = majorDiameter / 2;
  const minorR = minorDiameter / 2;
  const turns = length / pitch;
  const totalSegs = Math.ceil(turns * segmentsPerTurn);

  // Thread cross-section: isoceles triangle (simplified ISO profile)
  // At each step along the helix, we sweep a trapezoid profile

  const halfPitch = pitch / 2;
  const threadH = (majorR - minorR); // radial height of thread

  for (let i = 0; i < totalSegs; i++) {
    const t0 = i / segmentsPerTurn;
    const t1 = (i + 1) / segmentsPerTurn;

    const z0 = (t0 / turns) * length - length / 2;
    const z1 = (t1 / turns) * length - length / 2;

    // Helical angle
    const a0 = (t0 * 2 * Math.PI) % (2 * Math.PI);
    const a1 = (t1 * 2 * Math.PI) % (2 * Math.PI);

    // Pitch offset at each angle (for helical advance)
    const pz0 = t0 * pitch - Math.floor(t0) * pitch; // 0..pitch
    const pz1 = t1 * pitch - Math.floor(t1) * pitch;

    // Thread tip positions (major radius)
    const tipZ0 = z0 + (pz0 / pitch - 0.5) * pitch;
    const tipZ1 = z1 + (pz1 / pitch - 0.5) * pitch;

    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    // 4 vertices per step: inner-low, outer-mid (tip), inner-high (two sides of tooth)
    const innerLow0  = m.addVertex(cos0 * minorR, sin0 * minorR, z0 - halfPitch/4);
    const outerMid0  = m.addVertex(cos0 * majorR, sin0 * majorR, z0);
    const innerHigh0 = m.addVertex(cos0 * minorR, sin0 * minorR, z0 + halfPitch/4);

    const innerLow1  = m.addVertex(cos1 * minorR, sin1 * minorR, z1 - halfPitch/4);
    const outerMid1  = m.addVertex(cos1 * majorR, sin1 * majorR, z1);
    const innerHigh1 = m.addVertex(cos1 * minorR, sin1 * minorR, z1 + halfPitch/4);

    // Forward face of thread tooth
    m.addFace(innerLow0, outerMid0, innerLow1);
    m.addFace(outerMid0, outerMid1, innerLow1);

    // Back face
    m.addFace(outerMid0, innerHigh0, outerMid1);
    m.addFace(innerHigh0, innerHigh1, outerMid1);
  }

  return m;
}

/**
 * Cylindrical shaft (for threaded connector body).
 */
export function shaft(diameter, length, segments = 24) {
  const m = new Mesh();
  const r = diameter / 2;
  const hz = length / 2;
  const bot = [], top = [];

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    bot.push(m.addVertex(Math.cos(a)*r, Math.sin(a)*r, -hz));
    top.push(m.addVertex(Math.cos(a)*r, Math.sin(a)*r,  hz));
  }

  const bc = m.addVertex(0, 0, -hz), tc = m.addVertex(0, 0, hz);
  for (let i = 0; i < segments; i++) {
    const n = (i + 1) % segments;
    m.addQuad(bot[i], top[i], top[n], bot[n]);
    m.addFace(bc, bot[n], bot[i]);
    m.addFace(tc, top[i], top[n]);
  }
  return m;
}
