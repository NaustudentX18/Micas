export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const deg2rad = (d) => d * DEG;
export const rad2deg = (r) => r * RAD;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const round2 = (v) => Math.round(v * 100) / 100;
export const round3 = (v) => Math.round(v * 1000) / 1000;

/** Cross product of two 3D vectors (as arrays [x,y,z]) */
export function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

/** Dot product */
export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Normalize a 3D vector */
export function normalize(v) {
  const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
  if (len < 1e-9) return [0, 0, 1];
  return [v[0]/len, v[1]/len, v[2]/len];
}

/** Subtract two vectors */
export function sub(a, b) {
  return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
}

/** Add two vectors */
export function add(a, b) {
  return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
}

/** Scale vector */
export function scale(v, s) {
  return [v[0]*s, v[1]*s, v[2]*s];
}

/** Compute face normal of triangle (CCW winding) */
export function faceNormal(v0, v1, v2) {
  return normalize(cross(sub(v1, v0), sub(v2, v0)));
}

/** Triangle area */
export function triArea(v0, v1, v2) {
  const c = cross(sub(v1, v0), sub(v2, v0));
  return 0.5 * Math.sqrt(c[0]*c[0] + c[1]*c[1] + c[2]*c[2]);
}

/** mm to inches */
export const mmToIn = (mm) => mm / 25.4;
export const inToMm = (inches) => inches * 25.4;
