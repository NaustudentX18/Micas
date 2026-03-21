import { box, cylinder } from '../geometry/primitives.js';
import { translate, rotateZ, merge, placeOnFloor } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive, validateRange } from './base.generator.js';

export default {
  id: 'shelf-bracket',
  label: 'Shelf Bracket',
  icon: '📐',
  description: 'Heavy-duty shelf support bracket with gusset',

  paramSchema: [
    { id: 'shelfDepth', label: 'Shelf Depth',      type: 'number', default: 200, unit: 'mm', min: 50,  max: 500, step: 5 },
    { id: 'height',     label: 'Wall Plate Height', type: 'number', default: 150, unit: 'mm', min: 30,  max: 400, step: 5 },
    { id: 'thickness',  label: 'Thickness',         type: 'number', default: 4,   unit: 'mm', min: 2,   max: 12,  step: 0.5 },
    { id: 'width',      label: 'Width',             type: 'number', default: 40,  unit: 'mm', min: 20,  max: 100, step: 1 },
    { id: 'gusset',     label: 'Gusset Brace',      type: 'boolean',default: true },
    { id: 'mountHoles', label: 'Mount Holes',        type: 'number', default: 3,   unit: '',   min: 1,   max: 6,   step: 1 },
  ],

  validate(p) {
    const errors = validatePositive(p, ['shelfDepth', 'height', 'thickness', 'width', 'mountHoles']);
    errors.push(...validateRange(p, 'shelfDepth', 50,  500));
    errors.push(...validateRange(p, 'height',     30,  400));
    errors.push(...validateRange(p, 'thickness',  2,   12));
    errors.push(...validateRange(p, 'width',      20,  100));
    errors.push(...validateRange(p, 'mountHoles', 1,   6));
    if (p.thickness * 2 >= p.width) {
      errors.push('Thickness must be less than half the bracket width');
    }
    return errors;
  },

  generate(params) {
    const { shelfDepth, height, thickness, width, gusset, mountHoles } = params;

    // ── Vertical wall plate ────────────────────────────────────────────────────
    // Stands upright against the wall; its face is the YZ plane.
    const wallPlate = box(thickness, width, height);
    // Centred at origin; move so front face is at X=0
    const wallPlateMesh = translate(wallPlate, -thickness / 2, 0, 0);

    // ── Horizontal shelf arm ───────────────────────────────────────────────────
    // Projects outward along +X from the bottom of the wall plate.
    const shelfArm = box(shelfDepth, width, thickness);
    // Top face of arm at Z = height/2 - thickness (flush with plate bottom - thickness)
    // For a classic L: arm bottom aligns with wall plate bottom
    const armZ = -(height / 2) + thickness / 2;
    const shelfArmMesh = translate(shelfArm, shelfDepth / 2 - thickness / 2, 0, armZ);

    let mesh = merge(wallPlateMesh, shelfArmMesh);

    // ── Diagonal gusset brace ──────────────────────────────────────────────────
    // Triangular diagonal support running from the outer end of the shelf arm
    // up to the wall plate. Approximated as a rotated box wedge.
    if (gusset) {
      // The gusset spans from the arm/wall junction to some point up the wall
      // and out along the arm. Geometry: right triangle with legs = gussetH (along wall)
      // and gussetW (along arm).
      const gussetH = Math.min(height * 0.65, shelfDepth * 0.8);
      const gussetW = Math.min(shelfDepth * 0.75, height * 0.9);

      // Hypotenuse length and angle
      const hyp   = Math.sqrt(gussetH * gussetH + gussetW * gussetW);
      const angle = Math.atan2(gussetH, gussetW) * 180 / Math.PI;

      // A flat bar rotated to the diagonal angle
      const gussetBar = box(hyp, width * 0.8, thickness);

      // Rotate around Z: tilted so one end is at the corner (X=0, Z=armZ+thickness/2)
      // and the other is at (X=gussetW, Z=armZ+gussetH)
      const rotated = rotateZ(gussetBar, angle);

      // Position: mid-point of hypotenuse
      const gussetCX = gussetW / 2;
      const gussetCZ = armZ + thickness / 2 + gussetH / 2;
      mesh = merge(mesh, translate(rotated, gussetCX, 0, gussetCZ));
    }

    // ── Mounting holes on wall plate ───────────────────────────────────────────
    // Represented as thin cylinders (visual markers; SCAD uses difference)
    const holeR   = 2.5; // M5 clearance
    const holeSeg = 12;
    const holeSpacing = height / (mountHoles + 1);

    for (let i = 1; i <= mountHoles; i++) {
      const hz = -(height / 2) + i * holeSpacing;
      const marker = cylinder(holeR * 0.35, thickness + 0.2, holeSeg);
      // Orient through the wall plate (along X)
      mesh = merge(mesh, translate(marker, -thickness / 2, 0, hz));
    }

    mesh = placeOnFloor(mesh);

    // ── OpenSCAD source ────────────────────────────────────────────────────────
    const scadParams = {
      shelf_depth:  shelfDepth,
      height,
      thickness,
      width,
      gusset,
      mount_holes:  mountHoles,
    };

    const gussetH   = Math.min(height * 0.65, shelfDepth * 0.8);
    const gussetW   = Math.min(shelfDepth * 0.75, height * 0.9);
    const hyp       = Math.sqrt(gussetH * gussetH + gussetW * gussetW);
    const angle     = Math.atan2(gussetH, gussetW) * 180 / Math.PI;
    const armZScad  = `-(height / 2) + thickness / 2`;

    const gussetCode = gusset ? `
  // Diagonal gusset brace
  translate([${(gussetW / 2).toFixed(4)}, 0, -(height / 2) + thickness / 2 + ${(gussetH / 2).toFixed(4)}])
    rotate([0, 0, ${angle.toFixed(4)}])
      cube([${hyp.toFixed(4)}, width * 0.8, thickness], center=true);` : '';

    const holeSpacingScad = `height / (mount_holes + 1)`;
    const holeCode = `
  // Mounting holes through wall plate
  for (i = [1:1:mount_holes]) {
    translate([-thickness / 2, 0, -(height / 2) + i * ${holeSpacingScad}])
      rotate([0, 90, 0])
        cylinder(r=${holeR.toFixed(4)}, h=thickness + 0.2, $fn=12, center=true);
  }`;

    const bodyCode = `
module shelf_bracket() {
  difference() {
    union() {
      // Vertical wall plate
      translate([-thickness / 2, 0, 0])
        cube([thickness, width, height], center=true);

      // Horizontal shelf arm
      translate([shelf_depth / 2 - thickness / 2, 0, -(height / 2) + thickness / 2])
        cube([shelf_depth, width, thickness], center=true);
${gussetCode}
    }
${holeCode}
  }
}

shelf_bracket();`;

    const openscadSource = scad.buildSCADFile('Shelf Bracket', scadParams, bodyCode);

    return {
      mesh,
      openscadSource,
      metadata: makeMetadata('shelf-bracket', 'shelf-bracket', {
        shelfDepth, height, thickness, width, gusset, mountHoles,
      }, mesh),
    };
  },
};
