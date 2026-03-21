/**
 * Binary STL serializer.
 * Format: 80-byte header + uint32 triangle count + per-triangle (50 bytes):
 *   3×float32 normal + 3×3×float32 vertices + uint16 attribute = 0
 * All values little-endian.
 */

const HEADER_TEXT = 'Binary STL - My Personal CAD v2 | github.com/micas-cad';

/**
 * Write a Mesh to binary STL format.
 * @param {Mesh} mesh
 * @returns {ArrayBuffer}
 */
export function writeBinarySTL(mesh) {
  const flat = mesh.toFlatTriangles();
  const triCount = flat.positions.length / 9;

  const bufSize = 80 + 4 + triCount * 50;
  const buffer = new ArrayBuffer(bufSize);
  const view = new DataView(buffer);

  // 80-byte header (ASCII)
  const encoder = new TextEncoder();
  const header = encoder.encode(HEADER_TEXT.slice(0, 79).padEnd(80, '\0'));
  new Uint8Array(buffer, 0, 80).set(header.slice(0, 80));

  // Triangle count
  view.setUint32(80, triCount, true);

  let offset = 84;
  const { positions, normals } = flat;

  for (let t = 0; t < triCount; t++) {
    const ni = t * 3;  // normal index in flat normals (one per triangle × 3 components)
    const vi = t * 9;  // vertex index in flat positions

    // Normal vector (from per-face normal — all 3 verts share same normal in flat array)
    view.setFloat32(offset,      normals[ni],     true); offset += 4;
    view.setFloat32(offset,      normals[ni + 1], true); offset += 4;
    view.setFloat32(offset,      normals[ni + 2], true); offset += 4;

    // Vertex 1
    view.setFloat32(offset, positions[vi],     true); offset += 4;
    view.setFloat32(offset, positions[vi + 1], true); offset += 4;
    view.setFloat32(offset, positions[vi + 2], true); offset += 4;

    // Vertex 2
    view.setFloat32(offset, positions[vi + 3], true); offset += 4;
    view.setFloat32(offset, positions[vi + 4], true); offset += 4;
    view.setFloat32(offset, positions[vi + 5], true); offset += 4;

    // Vertex 3
    view.setFloat32(offset, positions[vi + 6], true); offset += 4;
    view.setFloat32(offset, positions[vi + 7], true); offset += 4;
    view.setFloat32(offset, positions[vi + 8], true); offset += 4;

    // Attribute byte count (always 0)
    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}

/**
 * Write mesh to STL and return as Blob (ready for download or FileReader).
 */
export function meshToSTLBlob(mesh) {
  return new Blob([writeBinarySTL(mesh)], { type: 'model/stl' });
}
