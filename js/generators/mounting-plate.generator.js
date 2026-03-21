import { box, cylinder } from '../geometry/primitives.js';
import { translate, merge, placeOnFloor } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive, validateRange } from './base.generator.js';

export default {
  id: 'mounting-plate',
  label: 'Mounting Plate',
  icon: '🔩',
  description: 'Flat mounting plate with hole pattern',

  paramSchema: [
    { id: 'width',         label: 'Width',            type: 'number',  default: 80,       unit: 'mm', min: 20,  max: 300, step: 1 },
    { id: 'depth',         label: 'Depth',            type: 'number',  default: 60,       unit: 'mm', min: 20,  max: 300, step: 1 },
    { id: 'thickness',     label: 'Thickness',        type: 'number',  default: 3,        unit: 'mm', min: 1.5, max: 10,  step: 0.5 },
    { id: 'holePattern',   label: 'Hole Pattern',     type: 'select',  default: 'corners',
      options: [
        { value: 'corners', label: 'Corner Holes' },
        { value: 'grid',    label: 'Grid Pattern' },
        { value: 'vesa75',  label: 'VESA 75mm' },
        { value: 'vesa100', label: 'VESA 100mm' },
      ]
    },
    { id: 'holeDiameter',  label: 'Hole Diameter',    type: 'number',  default: 4.5,      unit: 'mm', min: 2,   max: 10,  step: 0.5 },
    { id: 'cornerRadius',  label: 'Rounded Corners',  type: 'boolean', default: true },
    { id: 'standoffHeight',label: 'Standoff Height',  type: 'number',  default: 0,        unit: 'mm', min: 0,   max: 20,  step: 0.5 },
  ],

  validate(p) {
    const errors = validatePositive(p, ['width', 'depth', 'thickness']);
    errors.push(...validateRange(p, 'width',          20,  300));
    errors.push(...validateRange(p, 'depth',          20,  300));
    errors.push(...validateRange(p, 'thickness',      1.5, 10));
    errors.push(...validateRange(p, 'holeDiameter',   2,   10));
    errors.push(...validateRange(p, 'standoffHeight', 0,   20));

    if (p.holePattern === 'vesa75' && (p.width < 80 || p.depth < 80)) {
      errors.push('Width and depth must be at least 80mm for VESA 75 pattern');
    }
    if (p.holePattern === 'vesa100' && (p.width < 110 || p.depth < 110)) {
      errors.push('Width and depth must be at least 110mm for VESA 100 pattern');
    }
    if (p.holeDiameter >= Math.min(p.width, p.depth) / 3) {
      errors.push('Hole diameter is too large for the plate size');
    }
    return errors;
  },

  generate(params) {
    const { width, depth, thickness, holePattern, holeDiameter, cornerRadius, standoffHeight } = params;

    const holeR   = holeDiameter / 2;
    const holeSeg = 16;

    // ── Base plate ─────────────────────────────────────────────────────────────
    let mesh = box(width, depth, thickness);

    // Corner rounding: add small cylinders at each corner to visually soften
    if (cornerRadius) {
      const crR  = Math.min(4, width * 0.05, depth * 0.05);
      const crCyl = cylinder(crR, thickness, 12);
      const cx = width / 2 - crR;
      const cy = depth / 2 - crR;
      mesh = merge(
        mesh,
        translate(crCyl, -cx, -cy, 0),
        translate(crCyl,  cx, -cy, 0),
        translate(crCyl,  cx,  cy, 0),
        translate(crCyl, -cx,  cy, 0),
      );
    }

    // ── Hole positions ─────────────────────────────────────────────────────────
    let holePositions = [];

    if (holePattern === 'corners') {
      const margin = Math.max(holeDiameter * 2, 8);
      const hx = width  / 2 - margin;
      const hy = depth  / 2 - margin;
      holePositions = [
        [-hx, -hy], [ hx, -hy],
        [ hx,  hy], [-hx,  hy],
      ];

    } else if (holePattern === 'grid') {
      // 3×2 or 4×3 grid depending on aspect ratio
      const cols = width  >= 100 ? 4 : 3;
      const rows = depth  >= 80  ? 3 : 2;
      const xStep = width  / (cols + 1);
      const yStep = depth  / (rows + 1);
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          holePositions.push([
            -width  / 2 + c * xStep,
            -depth  / 2 + r * yStep,
          ]);
        }
      }

    } else if (holePattern === 'vesa75') {
      const half = 75 / 2;
      holePositions = [
        [-half, -half], [half, -half],
        [ half,  half], [-half,  half],
      ];

    } else if (holePattern === 'vesa100') {
      const half = 100 / 2;
      holePositions = [
        [-half, -half], [half, -half],
        [ half,  half], [-half,  half],
      ];
    }

    // Hole markers: thin cylinders placed at hole centres (visual only —
    // actual boolean subtract is handled in SCAD via difference())
    for (const [hx, hy] of holePositions) {
      const marker = cylinder(holeR * 0.3, thickness + 0.2, holeSeg);
      mesh = merge(mesh, translate(marker, hx, hy, 0));
    }

    // ── Optional standoffs ──────────────────────────────────────────────────────
    if (standoffHeight > 0) {
      const soR      = holeR + 2.5;          // standoff outer radius
      const standoff = cylinder(soR, standoffHeight, 16);

      for (const [hx, hy] of holePositions) {
        // Place standoffs below (printed side down) or above depending on
        // orientation; here above the plate surface
        mesh = merge(mesh, translate(standoff, hx, hy, thickness / 2 + standoffHeight / 2));
      }
    }

    mesh = placeOnFloor(mesh);

    // ── OpenSCAD source ─────────────────────────────────────────────────────────
    const scadParams = {
      width,
      depth,
      thickness,
      hole_pattern: holePattern,
      hole_diameter: holeDiameter,
      corner_radius: cornerRadius,
      standoff_height: standoffHeight,
    };

    const holeScadList = holePositions
      .map(([hx, hy]) => `[${hx.toFixed(3)}, ${hy.toFixed(3)}]`)
      .join(', ');

    const standoffScad = standoffHeight > 0
      ? `\n  // Standoffs\n  for (pos = hole_positions) {\n    translate([pos[0], pos[1], thickness / 2 + standoff_height / 2])\n      cylinder(r=${(holeR + 2.5).toFixed(4)}, h=standoff_height, $fn=16, center=true);\n  }`
      : '';

    const bodyCode = `
hole_positions = [${holeScadList}];

module mounting_plate() {
  difference() {
    union() {
      // Base plate
      cube([width, depth, thickness], center=true);
${standoffScad}
    }

    // Hole pattern: ${holePattern}
    for (pos = hole_positions) {
      translate([pos[0], pos[1], 0])
        cylinder(r=hole_diameter / 2, h=thickness + 0.2, $fn=16, center=true);
    }
  }
}

mounting_plate();`;

    const openscadSource = scad.buildSCADFile('Mounting Plate', scadParams, bodyCode);

    return {
      mesh,
      openscadSource,
      metadata: makeMetadata('mounting-plate', 'mounting-plate', {
        width, depth, thickness, holePattern, holeDiameter, standoffHeight,
      }, mesh),
    };
  },
};
