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
/**
 * Box with chamfered (beveled) edges.
 * @param {number} w width  @param {number} d depth  @param {number} h height
 * @param {number} r chamfer radius (clamped to min dimension / 2)
 * @param {number} segs segments per quarter-circle (min 2)
 */
export function roundedBox(w = 20, d = 20, h = 20, r = 2, segs = 4) {
  // Clamp r so it doesn't exceed any half-dimension
  r = Math.min(r, w / 2, d / 2, h / 2);
  segs = Math.max(2, segs);

  const m = new Mesh();
  const hw = w / 2, hd = d / 2, hh = h / 2;

  // Corner centers (8 corners of the inner box)
  const cx = hw - r, cy = hd - r, cz = hh - r;

  // Build corner arc points for each of 8 corners
  // Each corner gets (segs+1)*(segs+1) vertices on its quarter-sphere
  const corners = [
    [ cx,  cy,  cz], // 0 +++ top-front-right
    [-cx,  cy,  cz], // 1 -++ top-front-left
    [-cx, -cy,  cz], // 2 --+ top-back-left
    [ cx, -cy,  cz], // 3 +-+ top-back-right
    [ cx,  cy, -cz], // 4 ++- bottom-front-right
    [-cx,  cy, -cz], // 5 -+- bottom-front-left
    [-cx, -cy, -cz], // 6 --- bottom-back-left
    [ cx, -cy, -cz], // 7 +-- bottom-back-right
  ];
  // Sign of arc direction per corner
  const signs = [
    [ 1,  1,  1],
    [-1,  1,  1],
    [-1, -1,  1],
    [ 1, -1,  1],
    [ 1,  1, -1],
    [-1,  1, -1],
    [-1, -1, -1],
    [ 1, -1, -1],
  ];

  // Generate a grid of vertices on a quarter-sphere for each corner
  const cornerVerts = corners.map((c, ci) => {
    const [sx, sy, sz] = signs[ci];
    const grid = [];
    for (let i = 0; i <= segs; i++) {
      const phi = (Math.PI / 2) * (i / segs);
      const row = [];
      for (let j = 0; j <= segs; j++) {
        const theta = (Math.PI / 2) * (j / segs);
        const x = c[0] + sx * r * Math.sin(phi) * Math.cos(theta);
        const y = c[1] + sy * r * Math.sin(phi) * Math.sin(theta);
        const z = c[2] + sz * r * Math.cos(phi);
        row.push(m.addVertex(x, y, z));
      }
      grid.push(row);
    }
    return grid;
  });

  // Helper: add quad (ensure CCW winding when viewed from outside)
  const quad = (a, b, c, d) => m.addQuad(a, b, c, d);

  // Tile each corner's quarter-sphere grid
  // For each corner, determine if winding needs flip based on signs product
  for (let ci = 0; ci < 8; ci++) {
    const g = cornerVerts[ci];
    const [sx, sy, sz] = signs[ci];
    const flip = (sx * sy * sz) < 0;
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < segs; j++) {
        const a = g[i][j], b = g[i+1][j], c = g[i+1][j+1], d = g[i][j+1];
        flip ? quad(a, d, c, b) : quad(a, b, c, d);
      }
    }
  }

  // Connect edge strips between adjacent corners
  // Top face edges (z+ corners 0,1,2,3): j=0 edge of phi arc is on top face
  // Bottom face edges (z- corners 4,5,6,7): j=0 edge
  // We connect matching rows between neighbouring corner grids

  // Helper: edge strip from two corner grids (bridge two rows)
  const strip = (rowA, rowB, flip = false) => {
    for (let k = 0; k < rowA.length - 1; k++) {
      const a = rowA[k], b = rowA[k+1], c = rowB[k+1], d = rowB[k];
      flip ? quad(a, d, c, b) : quad(a, b, c, d);
    }
  };

  // Top ring (corners 0-3, phi=0 row = top face, z+)
  // phi=0 row: grid[0][j], j=0..segs → arc from +z axis toward +x/+y
  // Between top corners along X edge: corners 0(+x+y) and 1(-x+y) share y+ edge
  // Corner 0 grid[0][j] sweeps from +z toward +x; corner 1 grid[0][j] sweeps from +z toward -x
  // We need to bridge the phi=0 rows of adjacent corners

  // Top face strips (z = +hh face)
  // 0↔1: share +y edge top
  strip(cornerVerts[0][0].slice().reverse(), cornerVerts[1][0], false);
  // 1↔2: share -x edge top
  strip(cornerVerts[1][0].slice().reverse(), cornerVerts[2][0], false);
  // 2↔3: share -y edge top
  strip(cornerVerts[2][0].slice().reverse(), cornerVerts[3][0], false);
  // 3↔0: share +x edge top
  strip(cornerVerts[3][0].slice().reverse(), cornerVerts[0][0], false);

  // Bottom face strips (corners 4-7, same pattern)
  strip(cornerVerts[4][0], cornerVerts[5][0].slice().reverse(), false);
  strip(cornerVerts[5][0], cornerVerts[6][0].slice().reverse(), false);
  strip(cornerVerts[6][0], cornerVerts[7][0].slice().reverse(), false);
  strip(cornerVerts[7][0], cornerVerts[4][0].slice().reverse(), false);

  // Vertical edge strips (each top corner connects to bottom corner below)
  // Corner 0(+x+y+z) ↔ corner 4(+x+y-z): theta=0 col (j=0) of both
  for (const [top, bot] of [[0,4],[1,5],[2,6],[3,7]]) {
    const colTop = cornerVerts[top].map(row => row[0]);
    const colBot = cornerVerts[bot].map(row => row[0]).slice().reverse();
    strip(colTop, colBot, false);
  }

  // Face patches (flat quads filling center of each face)
  // +Z top face center
  const tl = cornerVerts[1][0][segs]; // corner 1 top-right end of arc
  const tr = cornerVerts[0][0][segs]; // corner 0 top-left end of arc
  const bl = cornerVerts[2][0][segs]; // corner 2
  const br = cornerVerts[3][0][segs]; // corner 3
  m.addQuad(tr, tl, bl, br); // top

  // -Z bottom face center
  const btl = cornerVerts[5][0][segs];
  const btr = cornerVerts[4][0][segs];
  const bbl = cornerVerts[6][0][segs];
  const bbr = cornerVerts[7][0][segs];
  m.addQuad(btr, bbr, bbl, btl); // bottom

  // +Y front face center
  const ftr = cornerVerts[0][segs][0];
  const ftl = cornerVerts[1][segs][0];
  const fbr = cornerVerts[4][segs][0];
  const fbl = cornerVerts[5][segs][0];
  m.addQuad(ftr, fbr, fbl, ftl);

  // -Y back face center
  const batr = cornerVerts[3][segs][0];
  const batl = cornerVerts[2][segs][0];
  const babr = cornerVerts[7][segs][0];
  const babl = cornerVerts[6][segs][0];
  m.addQuad(batr, batl, babl, babr);

  // +X right face center
  const rtr = cornerVerts[0][segs][segs];
  const rtl = cornerVerts[3][segs][segs];
  const rbr = cornerVerts[4][segs][segs];
  const rbl = cornerVerts[7][segs][segs];
  m.addQuad(rtr, rtl, rbl, rbr);

  // -X left face center
  const ltr = cornerVerts[1][segs][segs];
  const ltl = cornerVerts[2][segs][segs];
  const lbr = cornerVerts[5][segs][segs];
  const lbl = cornerVerts[6][segs][segs];
  m.addQuad(ltr, lbr, lbl, ltl);

  return m;
}

/**
 * UV Sphere centered at origin.
 * @param {number} r radius
 * @param {number} latSegs latitude segments (stacks)
 * @param {number} lonSegs longitude segments (slices)
 */
export function sphere(r = 5, latSegs = 16, lonSegs = 24) {
  const m = new Mesh();
  const verts = [];

  for (let lat = 0; lat <= latSegs; lat++) {
    const theta = (lat / latSegs) * Math.PI;
    const sinT = Math.sin(theta), cosT = Math.cos(theta);
    const row = [];
    for (let lon = 0; lon <= lonSegs; lon++) {
      const phi = (lon / lonSegs) * Math.PI * 2;
      const x = r * sinT * Math.cos(phi);
      const y = r * sinT * Math.sin(phi);
      const z = r * cosT;
      row.push(m.addVertex(x, y, z));
    }
    verts.push(row);
  }

  for (let lat = 0; lat < latSegs; lat++) {
    for (let lon = 0; lon < lonSegs; lon++) {
      const a = verts[lat][lon];
      const b = verts[lat][lon + 1];
      const c = verts[lat + 1][lon + 1];
      const d = verts[lat + 1][lon];
      if (lat === 0) {
        m.addFace(a, b, c);
        m.addFace(a, c, d);
      } else if (lat === latSegs - 1) {
        m.addFace(a, b, d);
        m.addFace(b, c, d);
      } else {
        m.addQuad(a, b, c, d);
      }
    }
  }

  return m;
}

/**
 * Wedge (right-angle triangular prism) — ramp shape.
 * Bottom face is w×d, rises from Z=0 at front to Z=h at back.
 * @param {number} w width  @param {number} d depth  @param {number} h height
 */
export function wedge(w = 20, d = 30, h = 15) {
  const m = new Mesh();
  const hw = w / 2;

  // 6 vertices
  const v = [
    m.addVertex(-hw, -d/2, 0),   // 0 front-bottom-left
    m.addVertex( hw, -d/2, 0),   // 1 front-bottom-right
    m.addVertex( hw,  d/2, 0),   // 2 back-bottom-right
    m.addVertex(-hw,  d/2, 0),   // 3 back-bottom-left
    m.addVertex(-hw,  d/2, h),   // 4 back-top-left
    m.addVertex( hw,  d/2, h),   // 5 back-top-right
  ];

  m.addQuad(v[0], v[3], v[2], v[1]); // bottom
  m.addQuad(v[3], v[4], v[5], v[2]); // back wall
  m.addFace(v[0], v[1], v[5]);       // right slope tri 1
  m.addFace(v[0], v[5], v[4]);       // right slope tri 2 (wait, should be per-side)
  m.addFace(v[1], v[2], v[5]);       // right side
  m.addFace(v[0], v[4], v[3]);       // left side
  m.addFace(v[0], v[1], v[5]);       // slope face
  m.addFace(v[0], v[5], v[4]);       // slope face 2

  // Build cleaner wedge with correct faces
  const m2 = new Mesh();
  const vv = {
    fl: m2.addVertex(-hw, -d/2, 0),
    fr: m2.addVertex( hw, -d/2, 0),
    br: m2.addVertex( hw,  d/2, 0),
    bl: m2.addVertex(-hw,  d/2, 0),
    tl: m2.addVertex(-hw,  d/2, h),
    tr: m2.addVertex( hw,  d/2, h),
  };

  m2.addQuad(vv.fl, vv.bl, vv.br, vv.fr); // bottom
  m2.addQuad(vv.bl, vv.tl, vv.tr, vv.br); // back wall
  m2.addFace(vv.fl, vv.fr, vv.tr);         // slope face right tri
  m2.addFace(vv.fl, vv.tr, vv.tl);         // slope face left tri
  m2.addFace(vv.fl, vv.tl, vv.bl);         // left side
  m2.addFace(vv.fr, vv.br, vv.tr);         // right side

  return m2;
}

/**
 * Regular hexagonal prism (flat-top orientation).
 * @param {number} r  circumradius (center to vertex)
 * @param {number} h  height
 */
export function hexPrism(r = 5, h = 10) {
  const m = new Mesh();
  const hz = h / 2;
  const n = 6;
  const bottom = [], top = [];

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    bottom.push(m.addVertex(x, y, -hz));
    top.push(m.addVertex(x, y,  hz));
  }

  const bc = m.addVertex(0, 0, -hz);
  const tc = m.addVertex(0, 0,  hz);

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    m.addQuad(bottom[i], top[i], top[next], bottom[next]); // side
    m.addFace(bc, bottom[next], bottom[i]);                 // bottom cap
    m.addFace(tc, top[i], top[next]);                       // top cap
  }

  return m;
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
