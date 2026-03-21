import { cylinder, tube, box } from '../geometry/primitives.js';
import { translate, rotateX, rotateZ, merge, placeOnFloor } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive, validateRange } from './base.generator.js';

export default {
  id: 'cable-clip',
  label: 'Cable Clip',
  icon: '🔗',
  description: 'Snap-on cable clip for wire management',
  paramSchema: [
    { id: 'cableOD',     label: 'Cable Outer Diameter', type: 'number',  default: 6,    unit: 'mm', min: 2,  max: 30,  step: 0.5 },
    { id: 'clipHeight',  label: 'Clip Height',          type: 'number',  default: 8,    unit: 'mm', min: 4,  max: 30,  step: 0.5 },
    { id: 'wallThick',   label: 'Wall Thickness',       type: 'number',  default: 1.8,  unit: 'mm', min: 1,  max: 4,   step: 0.1 },
    { id: 'flangeWidth', label: 'Flange Width',         type: 'number',  default: 12,   unit: 'mm', min: 6,  max: 30,  step: 0.5 },
    { id: 'mountHole',   label: 'Mounting Hole',        type: 'boolean', default: true },
    { id: 'mountHoleD',  label: 'Mount Hole Diameter',  type: 'number',  default: 4,    unit: 'mm', min: 2,  max: 8,   step: 0.5 },
  ],

  validate(p) {
    const errors = validatePositive(p, ['cableOD', 'clipHeight', 'wallThick', 'flangeWidth']);
    errors.push(...validateRange(p, 'cableOD',     2,  30));
    errors.push(...validateRange(p, 'clipHeight',  4,  30));
    errors.push(...validateRange(p, 'wallThick',   1,  4));
    errors.push(...validateRange(p, 'flangeWidth', 6,  30));
    if (p.mountHole) {
      errors.push(...validatePositive(p, ['mountHoleD']));
      errors.push(...validateRange(p, 'mountHoleD', 2, 8));
    }
    if (p.wallThick * 2 >= p.cableOD) {
      errors.push('Wall thickness is too large for the cable diameter');
    }
    return errors;
  },

  generate(params) {
    const { cableOD, clipHeight, wallThick, flangeWidth, mountHole, mountHoleD } = params;

    const cableR    = cableOD / 2;
    const outerR    = cableR + wallThick;
    const segments  = 32;

    // ── U-shaped clip body ──────────────────────────────────────────────────
    // Build using two half-tube arcs: a 270° wrap around the cable.
    // Approximated as a full tube then merge a gap-closing box on top.
    // The "snap gap" is represented by two small lip boxes on each side
    // of the opening, which face downward (cable is inserted from below).

    // Outer tube arc: full tube approximation for the clip body
    const clipTube = tube(outerR, cableR, clipHeight, segments);

    // Back half of tube (U shape facing down: opening at top center).
    // We model it as a full tube then overlay the gap region with the flange.
    // For the mesh, the full tube gives a solid representation; the snap
    // opening is communicated via SCAD which uses difference().
    let mesh = clipTube;

    // Snap lips: small horizontal overhangs on each side of the opening
    const lipThick = wallThick * 0.6;
    const lipLen   = wallThick * 1.2;
    const lipW     = clipHeight;

    // Left lip
    const lipLeft  = box(lipLen, lipW, lipThick);
    const lipRight = box(lipLen, lipW, lipThick);

    // Position lips at the gap opening (top of the clip, ±outerR on X axis)
    const lLeft  = translate(lipLeft,  -(outerR - lipLen / 2), 0, outerR - lipThick / 2);
    const lRight = translate(lipRight,  (outerR - lipLen / 2), 0, outerR - lipThick / 2);

    mesh = merge(mesh, lLeft, lRight);

    // ── Mounting flange ──────────────────────────────────────────────────────
    // A flat rectangular flange centred below the clip body
    const flangeThick = wallThick * 1.5;
    const flangeDepth = outerR * 2 + wallThick * 2;
    const flange = box(flangeWidth, clipHeight, flangeThick);

    // Place flange at the bottom of the clip (lowest extent of outer radius)
    const flangeZ = -(outerR + flangeThick / 2);
    const flangeMesh = translate(flange, 0, 0, flangeZ);

    mesh = merge(mesh, flangeMesh);

    // Mount hole: represented as a small protruding cylinder placeholder
    // (actual hole shown in SCAD via difference)
    if (mountHole) {
      const holeR  = mountHoleD / 2;
      // Add a thin cylinder to show hole centre on the flange surface
      const holeMark = cylinder(holeR * 0.4, flangeThick + 0.2, 16);
      const holePos  = translate(holeMark, 0, 0, flangeZ);
      mesh = merge(mesh, holePos);
    }

    mesh = placeOnFloor(mesh);

    // ── OpenSCAD ─────────────────────────────────────────────────────────────
    const scadParams = {
      cable_od:      cableOD,
      clip_height:   clipHeight,
      wall_thick:    wallThick,
      flange_width:  flangeWidth,
      mount_hole:    mountHole,
      mount_hole_d:  mountHoleD,
    };

    const outerRStr  = `cable_od / 2 + wall_thick`;
    const cableRStr  = `cable_od / 2`;
    const flangeStr  = `wall_thick * 1.5`;

    const snapOpening = `
// Snap-opening gap at the top of the clip (cable insertion slot)
translate([0, 0, cable_od / 2 + wall_thick / 2])
  cube([cable_od * 0.6, clip_height + 0.2, cable_od + wall_thick], center=true);`;

    const holeCode = mountHole
      ? `\n  // Mounting hole\n  translate([0, 0, -(cable_od / 2 + wall_thick + 0.1)])\n    rotate([-90, 0, 0])\n      cylinder(r=mount_hole_d / 2, h=clip_height + 0.2, $fn=16, center=true);`
      : '';

    const bodyCode = `
module cable_clip() {
  difference() {
    union() {
      // Clip body (tube section)
      rotate([90, 0, 0])
        difference() {
          cylinder(r=${outerRStr}, h=clip_height, $fn=32, center=true);
          cylinder(r=${cableRStr}, h=clip_height + 0.2, $fn=32, center=true);
        }

      // Snap lips on either side of opening
      translate([-(cable_od / 2 + wall_thick - wall_thick * 0.6), 0, cable_od / 2 + wall_thick - wall_thick * 0.3])
        cube([wall_thick * 1.2, clip_height, wall_thick * 0.6], center=true);
      translate([ (cable_od / 2 + wall_thick - wall_thick * 0.6), 0, cable_od / 2 + wall_thick - wall_thick * 0.3])
        cube([wall_thick * 1.2, clip_height, wall_thick * 0.6], center=true);

      // Mounting flange
      translate([0, 0, -(cable_od / 2 + wall_thick + ${flangeStr} / 2)])
        cube([flange_width, clip_height, ${flangeStr}], center=true);
    }
${snapOpening}${holeCode}
  }
}

cable_clip();`;

    const openscadSource = scad.buildSCADFile('Cable Clip', scadParams, bodyCode);

    return {
      mesh,
      openscadSource,
      metadata: makeMetadata('cable-clip', 'cable-clip', { cableOD, clipHeight, wallThick, flangeWidth }, mesh),
    };
  },
};
