import { Mesh } from '../geometry/mesh.js';

/**
 * STL parser — supports both binary and ASCII formats.
 * Used by the Three.js preview to load the generated mesh without a round-trip.
 */

/**
 * Parse an STL ArrayBuffer or string into a Mesh.
 */
export function parseSTL(data) {
  if (data instanceof ArrayBuffer) {
    if (isBinary(data)) return parseBinarySTL(data);
    return parseASCIISTL(new TextDecoder().decode(data));
  }
  if (typeof data === 'string') return parseASCIISTL(data);
  throw new Error('parseSTL: expected ArrayBuffer or string');
}

function isBinary(buffer) {
  // Binary STL: first 80 bytes are header, next 4 bytes are triangle count
  // Check: if "solid" appears in first 5 bytes → likely ASCII
  const view = new DataView(buffer);
  // Some ASCII STLs start with "solid" at byte 0
  const firstBytes = new Uint8Array(buffer, 0, 5);
  const startsWithSolid = String.fromCharCode(...firstBytes).toLowerCase() === 'solid';
  if (!startsWithSolid) return true;

  // If it starts with "solid", check if triangle count makes sense
  const triCount = view.getUint32(80, true);
  const expectedSize = 84 + triCount * 50;
  return buffer.byteLength === expectedSize;
}

function parseBinarySTL(buffer) {
  const m = new Mesh();
  const view = new DataView(buffer);
  const triCount = view.getUint32(80, true);

  let offset = 84;
  for (let i = 0; i < triCount; i++) {
    // Skip normal (12 bytes) — we recompute from vertices
    offset += 12;

    const v0 = [view.getFloat32(offset, true), view.getFloat32(offset+4, true), view.getFloat32(offset+8, true)]; offset += 12;
    const v1 = [view.getFloat32(offset, true), view.getFloat32(offset+4, true), view.getFloat32(offset+8, true)]; offset += 12;
    const v2 = [view.getFloat32(offset, true), view.getFloat32(offset+4, true), view.getFloat32(offset+8, true)]; offset += 12;
    offset += 2; // attribute

    const i0 = m.addVertex(...v0);
    const i1 = m.addVertex(...v1);
    const i2 = m.addVertex(...v2);
    m.addFace(i0, i1, i2);
  }
  return m;
}

function parseASCIISTL(text) {
  const m = new Mesh();
  const lines = text.split('\n');
  let verts = [];

  for (const line of lines) {
    const t = line.trim().toLowerCase();
    if (t.startsWith('vertex')) {
      const parts = t.split(/\s+/);
      verts.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
      if (verts.length === 3) {
        const i0 = m.addVertex(...verts[0]);
        const i1 = m.addVertex(...verts[1]);
        const i2 = m.addVertex(...verts[2]);
        m.addFace(i0, i1, i2);
        verts = [];
      }
    }
  }
  return m;
}

/**
 * Convert Mesh to Three.js BufferGeometry attributes (position + normal Float32Arrays).
 * Caller creates the BufferGeometry and sets attributes.
 */
export function meshToBufferGeometryData(mesh) {
  return mesh.toFlatTriangles();
}
