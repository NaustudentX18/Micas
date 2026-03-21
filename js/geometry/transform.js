import { deg2rad } from '../utils/math.utils.js';
import { Mesh } from './mesh.js';

/**
 * Geometric transforms. Return NEW meshes (non-destructive).
 */

export function translate(mesh, tx, ty, tz) {
  const m = mesh.clone();
  for (const v of m.vertices) { v[0] += tx; v[1] += ty; v[2] += tz; }
  return m;
}

export function scale(mesh, sx, sy, sz) {
  sy = sy ?? sx; sz = sz ?? sx;
  const m = mesh.clone();
  for (const v of m.vertices) { v[0] *= sx; v[1] *= sy; v[2] *= sz; }
  // Scaling flips winding if any scale component is negative
  if (sx * sy * sz < 0) {
    for (const f of m.faces) { [f[0], f[1]] = [f[1], f[0]]; }
  }
  return m;
}

export function rotateZ(mesh, angleDeg) {
  const a = deg2rad(angleDeg);
  const cos = Math.cos(a), sin = Math.sin(a);
  const m = mesh.clone();
  for (const v of m.vertices) {
    const x = v[0], y = v[1];
    v[0] = x * cos - y * sin;
    v[1] = x * sin + y * cos;
  }
  return m;
}

export function rotateX(mesh, angleDeg) {
  const a = deg2rad(angleDeg);
  const cos = Math.cos(a), sin = Math.sin(a);
  const m = mesh.clone();
  for (const v of m.vertices) {
    const y = v[1], z = v[2];
    v[1] = y * cos - z * sin;
    v[2] = y * sin + z * cos;
  }
  return m;
}

export function rotateY(mesh, angleDeg) {
  const a = deg2rad(angleDeg);
  const cos = Math.cos(a), sin = Math.sin(a);
  const m = mesh.clone();
  for (const v of m.vertices) {
    const x = v[0], z = v[2];
    v[0] = x * cos + z * sin;
    v[2] = -x * sin + z * cos;
  }
  return m;
}

/** Mirror mesh across the XZ plane (flip Y) */
export function mirrorY(mesh) { return scale(mesh, 1, -1, 1); }
/** Mirror across XY plane (flip Z) */
export function mirrorZ(mesh) { return scale(mesh, 1, 1, -1); }

/** Merge array of meshes into one */
export function merge(...meshes) {
  const result = new Mesh();
  for (const m of meshes) result.merge(m);
  return result;
}

/** Move mesh so its bottom face is at Z=0 */
export function placeOnFloor(mesh) {
  const b = mesh.bounds();
  return translate(mesh, 0, 0, -b.min[2]);
}
