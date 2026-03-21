import { Mesh } from './mesh.js';
import { deg2rad } from '../utils/math.utils.js';

/**
 * Parametric geometry primitives. All return Mesh instances.
 * Coordinate system: X=width, Y=depth, Z=height (up).
 */

/**
 * Solid box centered at origin.
 * @param {number} w width  @param {number} d depth  @param {number} h height
 */
export function box(w = 10, d = 10, h = 10) {
  const m = new Mesh();
  const hw = w / 2, hd = d / 2, hh = h / 2;

  // 8 vertices
  const v = [
    m.addVertex(-hw, -hd, -hh), // 0 front-bottom-left
    m.addVertex( hw, -hd, -hh), // 1 front-bottom-right
    m.addVertex( hw,  hd, -hh), // 2 back-bottom-right
    m.addVertex(-hw,  hd, -hh), // 3 back-bottom-left
    m.addVertex(-hw, -hd,  hh), // 4 front-top-left
    m.addVertex( hw, -hd,  hh), // 5 front-top-right
    m.addVertex( hw,  hd,  hh), // 6 back-top-right
    m.addVertex(-hw,  hd,  hh), // 7 back-top-left
  ];

  // 6 faces × 2 triangles (CCW from outside)
  m.addQuad(v[0], v[3], v[2], v[1]); // bottom
  m.addQuad(v[4], v[5], v[6], v[7]); // top
  m.addQuad(v[0], v[1], v[5], v[4]); // front
  m.addQuad(v[2], v[3], v[7], v[6]); // back
  m.addQuad(v[0], v[4], v[7], v[3]); // left
  m.addQuad(v[1], v[2], v[6], v[5]); // right

  return m;
}

/**
 * Hollow box (open-top shell). wallThickness controls wall/floor.
 */
export function hollowBox(w, d, h, wall = 2.0, closedTop = false) {
  const outer = box(w, d, h);

  const iw = w - wall * 2;
  const id = d - wall * 2;
  const ih = h - wall;

  const inner = box(iw, id, ih);
  // Translate inner up by wall/2 (floor thickness = wall)
  for (const v of inner.vertices) v[2] += wall / 2;

  // Simple hollow: build faces manually for shell
  const m = new Mesh();
  const ow = w / 2, od = d / 2, oh = h / 2;
  const iW = iw / 2, iD = id / 2;
  const floorZ = -oh;
  const wallTop = oh;
  const innerTop = floorZ + wall + ih;

  // Build as 5-face shell (no top by default)
  // Floor
  addFlatQuad(m, [-ow,-od,floorZ], [ow,-od,floorZ], [ow,od,floorZ], [-ow,od,floorZ]);
  // Outer front  (Y = -od)
  addFlatQuad(m, [-ow,-od,floorZ], [-ow,-od,wallTop], [ow,-od,wallTop], [ow,-od,floorZ]);
  // Outer back
  addFlatQuad(m, [ow,od,floorZ], [ow,od,wallTop], [-ow,od,wallTop], [-ow,od,floorZ]);
  // Outer left
  addFlatQuad(m, [-ow,od,floorZ], [-ow,od,wallTop], [-ow,-od,wallTop], [-ow,-od,floorZ]);
  // Outer right
  addFlatQuad(m, [ow,-od,floorZ], [ow,-od,wallTop], [ow,od,wallTop], [ow,od,floorZ]);
  // Inner front
  addFlatQuad(m, [iW,-iD,floorZ+wall], [ow,-od,floorZ+wall+0.001], [ow,-od,wallTop], [iW,-iD,wallTop]);
  addFlatQuad(m, [-ow,-od,floorZ+wall+0.001], [-iW,-iD,floorZ+wall], [-iW,-iD,wallTop], [-ow,-od,wallTop]);
  // (simplified walls — complete outer shell is sufficient for printability)

  // Top rim
  if (closedTop) {
    addFlatQuad(m, [-ow,-od,wallTop], [ow,-od,wallTop], [ow,od,wallTop], [-ow,od,wallTop]);
  }

  return buildHollowBoxMesh(w, d, h, wall, closedTop);
}

function buildHollowBoxMesh(w, d, h, wall, closedTop) {
  const m = new Mesh();
  const hw = w/2, hd = d/2, hh = h/2;
  const iw = (w - wall*2)/2, id = (d - wall*2)/2;
  const floorZ = -hh, topZ = hh;
  const innerTopZ = floorZ + wall + (h - wall); // = topZ

  // Floor
  const fl = [
    m.addVertex(-hw,-hd,floorZ), m.addVertex(hw,-hd,floorZ),
    m.addVertex(hw,hd,floorZ), m.addVertex(-hw,hd,floorZ)
  ];
  m.addQuad(fl[0],fl[3],fl[2],fl[1]);

  // Outer walls
  walls(m, hw, hd, floorZ, topZ, +1);

  // Inner walls (reversed winding)
  walls(m, iw, id, floorZ+wall, topZ, -1);

  // Rim (connecting outer top edge to inner top edge)
  addRim(m, hw, hd, iw, id, topZ, wall);

  if (closedTop) {
    const tl = [
      m.addVertex(-hw,-hd,topZ), m.addVertex(hw,-hd,topZ),
      m.addVertex(hw,hd,topZ), m.addVertex(-hw,hd,topZ)
    ];
    m.addQuad(tl[0],tl[1],tl[2],tl[3]);
  }

  return m;
}

function walls(m, hw, hd, z0, z1, winding) {
  const verts = [
    [-hw,-hd,z0],[-hw,-hd,z1],[hw,-hd,z1],[hw,-hd,z0],
    [hw,hd,z0],[hw,hd,z1],[-hw,hd,z1],[-hw,hd,z0]
  ].map(([x,y,z]) => m.addVertex(x,y,z));
  if (winding > 0) {
    m.addQuad(verts[0],verts[1],verts[2],verts[3]); // front
    m.addQuad(verts[3],verts[2],verts[5],verts[4]); // right
    m.addQuad(verts[4],verts[5],verts[6],verts[7]); // back
    m.addQuad(verts[7],verts[6],verts[1],verts[0]); // left
  } else {
    m.addQuad(verts[3],verts[2],verts[1],verts[0]);
    m.addQuad(verts[4],verts[5],verts[2],verts[3]);
    m.addQuad(verts[7],verts[6],verts[5],verts[4]);
    m.addQuad(verts[0],verts[1],verts[6],verts[7]);
  }
}

function addRim(m, hw, hd, iw, id, z, wall) {
  // Front rim
  const o0 = m.addVertex(-hw,-hd,z), o1 = m.addVertex(hw,-hd,z);
  const i0 = m.addVertex(-iw,-id,z), i1 = m.addVertex(iw,-id,z);
  m.addQuad(o0,o1,i1,i0);
  // Back
  const o2 = m.addVertex(hw,hd,z), o3 = m.addVertex(-hw,hd,z);
  const i2 = m.addVertex(iw,id,z), i3 = m.addVertex(-iw,id,z);
  m.addQuad(o2,o3,i3,i2);
  // Left
  const ol = m.addVertex(-hw,hd,z), il = m.addVertex(-iw,id,z);
  m.addFace(m.addVertex(-hw,-hd,z), ol, il);
  m.addFace(m.addVertex(-hw,-hd,z), il, m.addVertex(-iw,-id,z));
  // Right
  const or2 = m.addVertex(hw,hd,z), ir2 = m.addVertex(iw,id,z);
  m.addFace(m.addVertex(hw,-hd,z), m.addVertex(iw,-id,z), ir2);
  m.addFace(m.addVertex(hw,-hd,z), ir2, or2);
}

function addFlatQuad(m, a, b, c, d) {
  const i = [a, b, c, d].map(([x,y,z]) => m.addVertex(x,y,z));
  m.addQuad(i[0],i[1],i[2],i[3]);
}

/**
 * Cylinder (Z axis). Segments control smoothness.
 */
export function cylinder(radius = 5, height = 10, segments = 24) {
  const m = new Mesh();
  const hz = height / 2;
  const bottom = [], top = [];

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    bottom.push(m.addVertex(x, y, -hz));
    top.push(m.addVertex(x, y,  hz));
  }

  const bc = m.addVertex(0, 0, -hz);
  const tc = m.addVertex(0, 0,  hz);

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    // Side quad
    m.addQuad(bottom[i], top[i], top[next], bottom[next]);
    // Bottom cap
    m.addFace(bc, bottom[next], bottom[i]);
    // Top cap
    m.addFace(tc, top[i], top[next]);
  }

  return m;
}

/**
 * Tube (hollow cylinder).
 */
export function tube(outerRadius, innerRadius, height, segments = 24) {
  const m = new Mesh();
  const hz = height / 2;
  const ob = [], ot = [], ib = [], it = [];

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const cx = Math.cos(a), cy = Math.sin(a);
    ob.push(m.addVertex(cx * outerRadius, cy * outerRadius, -hz));
    ot.push(m.addVertex(cx * outerRadius, cy * outerRadius,  hz));
    ib.push(m.addVertex(cx * innerRadius, cy * innerRadius, -hz));
    it.push(m.addVertex(cx * innerRadius, cy * innerRadius,  hz));
  }

  for (let i = 0; i < segments; i++) {
    const n = (i + 1) % segments;
    m.addQuad(ob[i], ot[i], ot[n], ob[n]); // outer
    m.addQuad(ib[n], it[n], it[i], ib[i]); // inner (reversed)
    m.addQuad(ob[i], ob[n], ib[n], ib[i]); // bottom ring
    m.addQuad(ot[n], ot[i], it[i], it[n]); // top ring
  }
  return m;
}

/**
 * Cone / frustum. Set topRadius=0 for a true cone.
 */
export function cone(bottomRadius, topRadius, height, segments = 24) {
  const m = new Mesh();
  const hz = height / 2;
  const bottom = [], top = [];

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const cx = Math.cos(a), cy = Math.sin(a);
    bottom.push(m.addVertex(cx * bottomRadius, cy * bottomRadius, -hz));
    if (topRadius > 0) top.push(m.addVertex(cx * topRadius, cy * topRadius, hz));
  }

  const bc = m.addVertex(0, 0, -hz);

  if (topRadius > 0) {
    const tc = m.addVertex(0, 0, hz);
    for (let i = 0; i < segments; i++) {
      const n = (i + 1) % segments;
      m.addQuad(bottom[i], top[i], top[n], bottom[n]);
      m.addFace(bc, bottom[n], bottom[i]);
      m.addFace(tc, top[i], top[n]);
    }
  } else {
    const apex = m.addVertex(0, 0, hz);
    for (let i = 0; i < segments; i++) {
      const n = (i + 1) % segments;
      m.addFace(bottom[i], bottom[n], apex);
      m.addFace(bc, bottom[n], bottom[i]);
    }
  }
  return m;
}

/**
 * Rounded box (basic — box with separate cap geometry for corners).
 * For simplicity, returns a regular box; corner rounding can be added later.
 */
export function roundedBox(w, d, h) {
  return box(w, d, h);
}

/**
 * L-shaped bracket cross-section extruded along Z.
 */
export function lBracket(armLength, armWidth, thickness, height) {
  const m = new Mesh();
  const hw = armWidth / 2;
  const hy = height / 2;

  // Profile vertices (XZ plane, extruded along Y)
  // Outer L: two arms meeting at corner
  const profile = [
    [0,          0       ],
    [armLength,  0       ],
    [armLength,  thickness],
    [thickness,  thickness],
    [thickness,  armLength],
    [0,          armLength],
  ];

  const front = profile.map(([x, z]) => m.addVertex(x - armLength/2, -hy, z - armLength/2));
  const back  = profile.map(([x, z]) => m.addVertex(x - armLength/2,  hy, z - armLength/2));

  const n = profile.length;
  // Side quads
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    m.addQuad(front[i], front[j], back[j], back[i]);
  }
  // Front and back caps (fan triangulation)
  for (let i = 1; i < n - 1; i++) { m.addFace(front[0], front[i], front[i+1]); }
  for (let i = 1; i < n - 1; i++) { m.addFace(back[0], back[i+1], back[i]); }

  return m;
}
