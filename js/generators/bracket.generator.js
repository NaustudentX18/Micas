import { lBracket } from '../geometry/primitives.js';
import { cylinder } from '../geometry/primitives.js';
import { merge, placeOnFloor, translate } from '../geometry/transform.js';
import { Mesh } from '../geometry/mesh.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive } from './base.generator.js';

export default {
  id: 'bracket',
  label: 'Bracket',
  icon: '🔧',
  description: 'L-shaped mounting bracket with optional screw holes',
  paramSchema: [
    { id: 'armLength',   label: 'Arm Length',    type: 'number', default: 60,  unit: 'mm', min: 10, max: 300, step: 1 },
    { id: 'armWidth',    label: 'Arm Width',     type: 'number', default: 30,  unit: 'mm', min: 5, max: 150, step: 1 },
    { id: 'thickness',   label: 'Thickness',     type: 'number', default: 4,   unit: 'mm', min: 1, max: 20,  step: 0.5 },
    { id: 'height',      label: 'Extrusion Depth',type:'number', default: 20,  unit: 'mm', min: 5, max: 150, step: 1 },
    { id: 'screwHoles',  label: 'Screw Holes',   type: 'boolean',default: true },
    { id: 'screwDia',    label: 'Screw Diameter', type:'number', default: 3.5, unit: 'mm', min: 1, max: 10,  step: 0.5 },
  ],

  validate(p) {
    return validatePositive(p, ['armLength', 'armWidth', 'thickness', 'height']);
  },

  generate(params) {
    const { armLength, armWidth, thickness, height, screwHoles, screwDia } = params;
    let mesh = lBracket(armLength, armWidth, thickness, height);

    // Add screw holes (represented as cylinders merged — visual only, actual subtraction requires full CSG)
    // For printability, we indicate hole positions in metadata
    if (screwHoles) {
      // Mount holes at each arm end — add as small cylinders inset into the bracket
      const holeR = screwDia / 2;
      const hole = cylinder(holeR, thickness + 0.1, 16);
      // Position holes near arm ends (simplistic placement)
      const h1 = translate(hole, armLength / 2 - 8, -height / 4, 0);
      const h2 = translate(hole, 8 - armLength / 2, height / 4, 0);
      mesh = merge(mesh, h1, h2);
    }

    mesh = placeOnFloor(mesh);

    const p = { arm_length: armLength, arm_width: armWidth, thickness, height, screw_dia: screwDia };
    const openscadSource = scad.buildSCADFile('Bracket', p,
      `// L-bracket\nmodule bracket() {\n  difference() {\n    union() {\n      cube([arm_length, thickness, height]);\n      cube([thickness, arm_length, height]);\n    }\n    ${screwHoles ? `// Screw holes\ntranslate([arm_length - 8, -1, height/2]) rotate([-90,0,0]) cylinder(r=screw_dia/2, h=thickness+2, $fn=16);\ntranslate([thickness/2, arm_length - 8, -1]) cylinder(r=screw_dia/2, h=thickness+2, $fn=16);` : ''}\n  }\n}\nbracket();`
    );

    return { mesh, openscadSource, metadata: makeMetadata('bracket', 'bracket', { armLength, armWidth, thickness, height }, mesh) };
  }
};
