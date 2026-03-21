import { faceNormal } from '../utils/math.utils.js';

/**
 * Triangle mesh data structure.
 * Stores indexed geometry: vertices + faces (triangles).
 * toFlatTriangles() de-indexes for STL export and Three.js BufferGeometry.
 */

export class Mesh {
  constructor() {
    this.vertices = []; // [[x,y,z], ...]
    this.faces = [];    // [[i0,i1,i2], ...]
  }

  addVertex(x, y, z) {
    this.vertices.push([x, y, z]);
    return this.vertices.length - 1;
  }

  addFace(i0, i1, i2) {
    this.faces.push([i0, i1, i2]);
    return this.faces.length - 1;
  }

  /** Add a quad as two triangles (CCW winding: i0,i1,i2,i3 in order) */
  addQuad(i0, i1, i2, i3) {
    this.addFace(i0, i1, i2);
    this.addFace(i0, i2, i3);
  }

  /**
   * Returns flat (de-indexed) arrays for STL/Three.js.
   * Each triangle has 3 vertices with computed face normal.
   * @returns {{ positions: Float32Array, normals: Float32Array }}
   */
  toFlatTriangles() {
    const n = this.faces.length;
    const positions = new Float32Array(n * 9);
    const normals = new Float32Array(n * 9);

    for (let i = 0; i < n; i++) {
      const [i0, i1, i2] = this.faces[i];
      const v0 = this.vertices[i0];
      const v1 = this.vertices[i1];
      const v2 = this.vertices[i2];

      const norm = faceNormal(v0, v1, v2);

      const base = i * 9;
      positions[base + 0] = v0[0]; positions[base + 1] = v0[1]; positions[base + 2] = v0[2];
      positions[base + 3] = v1[0]; positions[base + 4] = v1[1]; positions[base + 5] = v1[2];
      positions[base + 6] = v2[0]; positions[base + 7] = v2[1]; positions[base + 8] = v2[2];

      normals[base + 0] = norm[0]; normals[base + 1] = norm[1]; normals[base + 2] = norm[2];
      normals[base + 3] = norm[0]; normals[base + 4] = norm[1]; normals[base + 5] = norm[2];
      normals[base + 6] = norm[0]; normals[base + 7] = norm[1]; normals[base + 8] = norm[2];
    }

    return { positions, normals };
  }

  get triangleCount() { return this.faces.length; }
  get vertexCount() { return this.vertices.length; }

  /** Bounding box */
  bounds() {
    if (this.vertices.length === 0) return { min: [0,0,0], max: [0,0,0] };
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const [x,y,z] of this.vertices) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    return { min: [minX,minY,minZ], max: [maxX,maxY,maxZ] };
  }

  /** Approximate volume via divergence theorem */
  volume() {
    let v = 0;
    for (const [i0, i1, i2] of this.faces) {
      const [x1,y1,z1] = this.vertices[i0];
      const [x2,y2,z2] = this.vertices[i1];
      const [x3,y3,z3] = this.vertices[i2];
      v += (x1*(y2*z3 - y3*z2) + x2*(y3*z1 - y1*z3) + x3*(y1*z2 - y2*z1)) / 6;
    }
    return Math.abs(v);
  }

  clone() {
    const m = new Mesh();
    m.vertices = this.vertices.map(v => [...v]);
    m.faces = this.faces.map(f => [...f]);
    return m;
  }

  /** Merge another mesh into this one (in-place, adjusting face indices) */
  merge(other) {
    const offset = this.vertices.length;
    for (const v of other.vertices) this.vertices.push([...v]);
    for (const [i0, i1, i2] of other.faces) {
      this.faces.push([i0 + offset, i1 + offset, i2 + offset]);
    }
    return this;
  }
}

export function createMesh() { return new Mesh(); }
