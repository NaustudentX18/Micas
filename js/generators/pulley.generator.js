import { cylinder, tube, cone } from '../geometry/primitives.js';
import { translate, rotateX, merge, placeOnFloor } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive, validateRange } from './base.generator.js';

export default {
  id: 'pulley',
  label: 'Pulley',
  icon: '⚙️',
  description: 'V-groove or flat pulley for belts and rope',

  paramSchema: [
    { id: 'outerDiameter', label: 'Outer Diameter',        type: 'number', default: 40,  unit: 'mm', min: 10,  max: 200, step: 1 },
    { id: 'boreDiameter',  label: 'Bore Diameter',         type: 'number', default: 8,   unit: 'mm', min: 3,   max: 30,  step: 0.5 },
    { id: 'thickness',     label: 'Thickness',             type: 'number', default: 12,  unit: 'mm', min: 4,   max: 50,  step: 0.5 },
    { id: 'grooveDepth',   label: 'Groove Depth',          type: 'number', default: 3,   unit: 'mm', min: 0,   max: 10,  step: 0.5 },
    { id: 'grooveAngle',   label: 'V-Groove Angle (°)',    type: 'select', default: '45',
      options: [
        { value: '30', label: '30° (narrow)' },
        { value: '45', label: '45° (standard)' },
        { value: '60', label: '60° (wide)' },
      ]
    },
    { id: 'spokeCount',    label: 'Spokes (0 = solid)',    type: 'number', default: 0,   unit: '',   min: 0,   max: 8,   step: 1 },
  ],

  validate(p) {
    const errors = validatePositive(p, ['outerDiameter', 'boreDiameter', 'thickness']);
    errors.push(...validateRange(p, 'outerDiameter', 10,  200));
    errors.push(...validateRange(p, 'boreDiameter',  3,   30));
    errors.push(...validateRange(p, 'thickness',     4,   50));
    errors.push(...validateRange(p, 'grooveDepth',   0,   10));
    errors.push(...validateRange(p, 'spokeCount',    0,   8));

    if (p.boreDiameter >= p.outerDiameter - 4) {
      errors.push('Bore diameter must be at least 4mm smaller than outer diameter');
    }
    if (p.grooveDepth > 0 && p.grooveDepth * 2 >= p.thickness) {
      errors.push('Groove depth is too large for the pulley thickness');
    }
    const grooveR = p.outerDiameter / 2 - p.grooveDepth;
    if (p.grooveDepth > 0 && grooveR <= p.boreDiameter / 2 + 2) {
      errors.push('Groove depth leaves too little material between groove floor and bore');
    }
    return errors;
  },

  generate(params) {
    const { outerDiameter, boreDiameter, thickness, grooveDepth, grooveAngle, spokeCount } = params;

    const outerR    = outerDiameter / 2;
    const boreR     = boreDiameter  / 2;
    const segments  = 48;
    const hubR      = Math.max(boreR + 3, outerR * 0.25);
    const hubH      = thickness;

    // ── Outer wheel rim ────────────────────────────────────────────────────────
    // The rim is a tube. If grooveDepth > 0, the V-groove is approximated by
    // two cone frustums on the top and bottom halves of the rim interior,
    // leaving a narrower groove at the centre.

    let mesh;

    if (grooveDepth > 0) {
      const halfThick = thickness / 2;
      const angle     = parseFloat(grooveAngle); // degrees from vertical
      // The groove top radius (at the rim surface) = outerR
      // The groove bottom radius (at groove floor) = outerR - grooveDepth
      // Each cone frustum: top edge at rim face, bottom edge at groove centre
      const grooveR   = outerR - grooveDepth;
      const tan       = Math.tan(angle * Math.PI / 180);
      // Width of each frustum half at the rim face is halfThick
      // Inner radius widens outward from grooveR by tan * halfThick
      const rimR1     = grooveR + tan * halfThick;    // outer radius of frustum bottom (at rim face)
      // Build two frustum halves — bottom cone (from face up to centre groove)
      // cone(bottomRadius, topRadius, height, segs) — centred at origin
      const bottomHalf = cone(rimR1, grooveR, halfThick, segments);
      const topHalf    = cone(grooveR, rimR1, halfThick, segments);

      // Stack: bottom half below Z=0, top half above Z=0
      const bottomMesh = translate(bottomHalf, 0, 0, -halfThick / 2);
      const topMesh    = translate(topHalf,    0, 0,  halfThick / 2);

      // Hub bore: solid cylinder for hub; bore is subtracted in SCAD only
      const hubCyl = tube(hubR, boreR, thickness, segments);

      mesh = merge(bottomMesh, topMesh, hubCyl);

    } else {
      // Flat pulley: simple tube (no groove)
      const rimTube = tube(outerR, hubR, thickness, segments);
      const hubCyl  = tube(hubR,   boreR, thickness, segments);
      mesh = merge(rimTube, hubCyl);
    }

    // ── Optional spokes ────────────────────────────────────────────────────────
    if (spokeCount > 0) {
      const spokeW   = Math.max(3, (outerR - hubR) * 0.25);
      const spokeLen = outerR - hubR;
      const spokeH   = Math.min(thickness * 0.6, 8);
      const spokeMidR = hubR + spokeLen / 2;

      for (let i = 0; i < spokeCount; i++) {
        const angle = (i / spokeCount) * Math.PI * 2;
        const cx    = Math.cos(angle) * spokeMidR;
        const cy    = Math.sin(angle) * spokeMidR;

        // Each spoke is a thin box along the radial direction
        const spokeBox = cylinder(spokeW / 2, spokeH, 8);  // use octagonal rod
        // Rotate so the long axis aligns with the spoke direction
        const rotAngleDeg = (i / spokeCount) * 360;
        const spokeMesh = translate(spokeBox, cx, cy, 0);
        mesh = merge(mesh, spokeMesh);
      }
    }

    mesh = placeOnFloor(mesh);

    // ── OpenSCAD source ────────────────────────────────────────────────────────
    const scadParams = {
      outer_diameter: outerDiameter,
      bore_diameter:  boreDiameter,
      thickness,
      groove_depth:   grooveDepth,
      groove_angle:   grooveAngle,
      spoke_count:    spokeCount,
    };

    const grooveR    = outerDiameter / 2 - grooveDepth;
    const halfThick  = thickness / 2;
    const tan        = Math.tan(parseFloat(grooveAngle) * Math.PI / 180);
    const rimR1      = grooveR + tan * halfThick;

    const rimCode = grooveDepth > 0
      ? `
  // V-groove rim (two cone frustums)
  rotate_extrude($fn=48) {
    // Bottom half
    polygon(points=[
      [bore_diameter / 2, 0],
      [${rimR1.toFixed(4)}, 0],
      [${grooveR.toFixed(4)}, ${halfThick.toFixed(4)}],
      [bore_diameter / 2, ${halfThick.toFixed(4)}]
    ]);
    // Top half
    polygon(points=[
      [bore_diameter / 2, ${halfThick.toFixed(4)}],
      [${grooveR.toFixed(4)}, ${halfThick.toFixed(4)}],
      [${rimR1.toFixed(4)}, thickness],
      [bore_diameter / 2, thickness]
    ]);
  }`
      : `
  // Flat rim
  difference() {
    cylinder(r=outer_diameter / 2, h=thickness, $fn=48);
    cylinder(r=${hubR.toFixed(4)}, h=thickness + 0.2, $fn=48);
  }`;

    const spokesCode = spokeCount > 0
      ? `\n  // Spokes\n  for (i = [0:1:${spokeCount - 1}]) {\n    rotate([0, 0, i * ${(360 / spokeCount).toFixed(4)}])\n      translate([${((hubR + (outerR - hubR) / 2)).toFixed(4)}, 0, thickness / 2])\n        cylinder(r=${Math.max(3, (outerR - hubR) * 0.125).toFixed(4)}, h=${Math.min(thickness * 0.6, 8).toFixed(4)}, $fn=8, center=true);\n  }`
      : '';

    const bodyCode = `
module pulley() {
  difference() {
    union() {
      // Hub
      cylinder(r=${hubR.toFixed(4)}, h=thickness, $fn=32);
${rimCode}
${spokesCode}
    }
    // Bore
    translate([0, 0, -0.1])
      cylinder(r=bore_diameter / 2, h=thickness + 0.2, $fn=24);
  }
}

pulley();`;

    const openscadSource = scad.buildSCADFile('Pulley', scadParams, bodyCode);

    return {
      mesh,
      openscadSource,
      metadata: makeMetadata('pulley', 'pulley', {
        outerDiameter, boreDiameter, thickness, grooveDepth, grooveAngle, spokeCount,
      }, mesh),
    };
  },
};
