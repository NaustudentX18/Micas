import { box, cylinder } from '../geometry/primitives.js';
import { translate, rotateZ, merge, placeOnFloor } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive, validateRange } from './base.generator.js';

export default {
  id: 'fan-guard',
  label: 'Fan Guard',
  icon: '💨',
  description: 'Parametric protective fan grille',
  paramSchema: [
    { id: 'fanSize',      label: 'Fan Size',        type: 'number', default: 80,     unit: 'mm', min: 25,  max: 200, step: 5 },
    { id: 'frameWidth',   label: 'Frame Width',     type: 'number', default: 8,      unit: 'mm', min: 4,   max: 20,  step: 0.5 },
    { id: 'frameThick',   label: 'Frame Thickness', type: 'number', default: 2,      unit: 'mm', min: 1,   max: 5,   step: 0.5 },
    { id: 'pattern',      label: 'Grid Pattern',    type: 'select', default: 'hex',
      options: [
        { value: 'hex',    label: 'Hexagonal' },
        { value: 'square', label: 'Square Grid' },
        { value: 'radial', label: 'Radial' },
      ]
    },
    { id: 'clearance',    label: 'Clearance',       type: 'number', default: 1,      unit: 'mm', min: 0,   max: 3,   step: 0.25 },
    { id: 'cornerRadius', label: 'Corner Radius',   type: 'number', default: 4,      unit: 'mm', min: 0,   max: 10,  step: 0.5 },
  ],

  validate(p) {
    const errors = validatePositive(p, ['fanSize', 'frameWidth', 'frameThick']);
    errors.push(...validateRange(p, 'fanSize',      25,  200));
    errors.push(...validateRange(p, 'frameWidth',   4,   20));
    errors.push(...validateRange(p, 'frameThick',   1,   5));
    errors.push(...validateRange(p, 'clearance',    0,   3));
    errors.push(...validateRange(p, 'cornerRadius', 0,   10));
    if (p.frameWidth * 2 >= p.fanSize) {
      errors.push('Frame width is too large relative to fan size');
    }
    return errors;
  },

  generate(params) {
    const { fanSize, frameWidth, frameThick, pattern, clearance, cornerRadius } = params;

    const totalSize  = fanSize + clearance * 2;
    const innerSize  = totalSize - frameWidth * 2;
    const rodR       = frameThick * 0.35;    // radius of grid rods
    const rodSeg     = 12;

    // ── Outer square frame ───────────────────────────────────────────────────
    // Four edge bars forming the square ring
    const hBar = box(totalSize, frameWidth, frameThick);          // horizontal bar
    const vBar = box(frameWidth, totalSize, frameThick);          // vertical bar

    const halfOuter = totalSize / 2;
    const halfFrame = frameWidth / 2;

    const topBar    = translate(hBar,  0,  halfOuter - halfFrame, 0);
    const botBar    = translate(hBar,  0, -(halfOuter - halfFrame), 0);
    const leftBar   = translate(vBar, -(halfOuter - halfFrame), 0, 0);
    const rightBar  = translate(vBar,  (halfOuter - halfFrame), 0, 0);

    // Corner posts: small cylinders at the four corners (mounting bosses)
    const cornerR    = Math.max(frameWidth * 0.5, cornerRadius > 0 ? cornerRadius : frameWidth * 0.4);
    const cornerPost = cylinder(cornerR, frameThick, 16);
    const cOffset    = halfOuter - halfFrame;

    const cTL = translate(cornerPost, -cOffset,  cOffset, 0);
    const cTR = translate(cornerPost,  cOffset,  cOffset, 0);
    const cBL = translate(cornerPost, -cOffset, -cOffset, 0);
    const cBR = translate(cornerPost,  cOffset, -cOffset, 0);

    let mesh = merge(topBar, botBar, leftBar, rightBar, cTL, cTR, cBL, cBR);

    // ── Grid rods (pattern-dependent) ────────────────────────────────────────
    const gridParts = [];

    if (pattern === 'square') {
      // Evenly spaced horizontal and vertical rods across the inner opening
      const spacing   = innerSize / 5;
      const rodLength = innerSize;
      const hRod      = box(rodLength, rodR * 2, frameThick * 0.8);
      const vRod      = box(rodR * 2, rodLength, frameThick * 0.8);

      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue; // centre rods still added — keep symmetric
        const offset = i * spacing;
        gridParts.push(translate(hRod, 0, offset, 0));
        gridParts.push(translate(vRod, offset, 0, 0));
      }
      // Centre cross
      gridParts.push(translate(hRod, 0, 0, 0));
      gridParts.push(translate(vRod, 0, 0, 0));

    } else if (pattern === 'hex') {
      // Hex-like pattern approximated by offset rows of short rods
      const rowSpacing = innerSize / 6;
      const colSpacing = innerSize / 4;
      const rodLen     = innerSize * 0.6;
      const rod        = box(rodLen, rodR * 2, frameThick * 0.8);
      const rodV       = box(rodR * 2, rodLen, frameThick * 0.8);

      for (let row = -2; row <= 2; row++) {
        const yOff   = row * rowSpacing;
        const xShift = (row % 2 === 0) ? 0 : colSpacing / 2;
        for (let col = -2; col <= 2; col++) {
          const xOff = col * colSpacing + xShift;
          if (Math.abs(xOff) > innerSize / 2 || Math.abs(yOff) > innerSize / 2) continue;
          gridParts.push(translate(rod,  xOff, yOff, 0));
        }
      }
      // Vertical connecting rods
      for (let col = -2; col <= 2; col++) {
        const xOff = col * colSpacing;
        if (Math.abs(xOff) > innerSize / 2) continue;
        gridParts.push(translate(rodV, xOff, 0, 0));
      }

    } else if (pattern === 'radial') {
      // Radial spokes from centre + concentric ring
      const spokeCount = 8;
      const spokeLen   = innerSize / 2 * 0.9;
      const spokeBar   = box(spokeLen, rodR * 2, frameThick * 0.8);
      const ringR      = innerSize / 4;
      const ringThick  = rodR * 2;

      for (let i = 0; i < spokeCount; i++) {
        const angle = (i / spokeCount) * 360;
        const spoke = translate(spokeBar, spokeLen / 2, 0, 0);
        gridParts.push(rotateZ(spoke, angle));
      }

      // Concentric ring (approximated as tube-like cylinder overlay)
      const ring = cylinder(ringR + ringThick / 2, frameThick * 0.8, 32);
      gridParts.push(ring);
    }

    if (gridParts.length > 0) {
      mesh = merge(mesh, ...gridParts);
    }

    mesh = placeOnFloor(mesh);

    // ── OpenSCAD ─────────────────────────────────────────────────────────────
    const scadParams = {
      fan_size:      fanSize,
      frame_width:   frameWidth,
      frame_thick:   frameThick,
      pattern:       pattern,
      clearance:     clearance,
      corner_radius: cornerRadius,
    };

    const spokeScad = Array.from({ length: 8 }, (_, i) =>
      scad.rotate([0, 0, i * 45],
        scad.translate([innerSize / 4, 0, 0],
          scad.cube(innerSize / 2, rodR * 2, frameThick * 0.8)))
    ).join('\n');

    const gridScad = pattern === 'square'
      ? `for (i = [-2:1:2]) {\n  translate([i * ${(innerSize / 5).toFixed(2)}, 0, 0]) cube([${(rodR * 2).toFixed(2)}, ${innerSize.toFixed(2)}, ${(frameThick * 0.8).toFixed(2)}], center=true);\n  translate([0, i * ${(innerSize / 5).toFixed(2)}, 0]) cube([${innerSize.toFixed(2)}, ${(rodR * 2).toFixed(2)}, ${(frameThick * 0.8).toFixed(2)}], center=true);\n}`
      : pattern === 'hex'
      ? `for (row = [-2:1:2]) {\n  xshift = (row % 2 == 0) ? 0 : ${(innerSize / 8).toFixed(2)};\n  for (col = [-2:1:2]) {\n    translate([col * ${(innerSize / 4).toFixed(2)} + xshift, row * ${(innerSize / 6).toFixed(2)}, 0])\n      cube([${(innerSize * 0.6).toFixed(2)}, ${(rodR * 2).toFixed(2)}, ${(frameThick * 0.8).toFixed(2)}], center=true);\n  }\n}`
      : `for (i = [0:1:7]) {\n  rotate([0, 0, i * 45])\n    translate([${(innerSize / 4).toFixed(2)}, 0, 0])\n      cube([${(innerSize / 2).toFixed(2)}, ${(rodR * 2).toFixed(2)}, ${(frameThick * 0.8).toFixed(2)}], center=true);\n}\n${scad.cylinder(innerSize / 4 + rodR, frameThick * 0.8, 32)}`;

    const bodyCode = `
module fan_guard() {
  union() {
    // Outer frame
    translate([0,  ${(halfOuter - halfFrame).toFixed(4)}, 0]) cube([${totalSize.toFixed(4)}, ${frameWidth.toFixed(4)}, frame_thick], center=true);
    translate([0, -${(halfOuter - halfFrame).toFixed(4)}, 0]) cube([${totalSize.toFixed(4)}, ${frameWidth.toFixed(4)}, frame_thick], center=true);
    translate([-${(halfOuter - halfFrame).toFixed(4)}, 0, 0]) cube([${frameWidth.toFixed(4)}, ${totalSize.toFixed(4)}, frame_thick], center=true);
    translate([ ${(halfOuter - halfFrame).toFixed(4)}, 0, 0]) cube([${frameWidth.toFixed(4)}, ${totalSize.toFixed(4)}, frame_thick], center=true);

    // Corner posts
    translate([-${cOffset.toFixed(4)},  ${cOffset.toFixed(4)}, 0]) cylinder(r=${cornerR.toFixed(4)}, h=frame_thick, $fn=16, center=true);
    translate([ ${cOffset.toFixed(4)},  ${cOffset.toFixed(4)}, 0]) cylinder(r=${cornerR.toFixed(4)}, h=frame_thick, $fn=16, center=true);
    translate([-${cOffset.toFixed(4)}, -${cOffset.toFixed(4)}, 0]) cylinder(r=${cornerR.toFixed(4)}, h=frame_thick, $fn=16, center=true);
    translate([ ${cOffset.toFixed(4)}, -${cOffset.toFixed(4)}, 0]) cylinder(r=${cornerR.toFixed(4)}, h=frame_thick, $fn=16, center=true);

    // Grid pattern: ${pattern}
    ${gridScad}
  }
}

fan_guard();`;

    const openscadSource = scad.buildSCADFile('Fan Guard', scadParams, bodyCode);

    return {
      mesh,
      openscadSource,
      metadata: makeMetadata('fan-guard', 'fan-guard', { fanSize, frameWidth, frameThick, pattern }, mesh),
    };
  },
};
