import { Mesh } from '../geometry/mesh.js';
import { box, cylinder, tube } from '../geometry/primitives.js';
import { translate, rotateX, placeOnFloor, merge } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive } from './base.generator.js';

export default {
  id: 'hinge',
  label: 'Hinge',
  icon: '🔗',
  description: 'Parametric pin hinge — print-in-place or assembled',
  paramSchema: [
    { id: 'width',       label: 'Hinge Width',      type: 'number', default: 40,  unit: 'mm', min: 10, max: 200, step: 1 },
    { id: 'leafLength',  label: 'Leaf Length',      type: 'number', default: 30,  unit: 'mm', min: 10, max: 200, step: 1 },
    { id: 'leafThick',   label: 'Leaf Thickness',   type: 'number', default: 3,   unit: 'mm', min: 1,  max: 10,  step: 0.5 },
    { id: 'pinDia',      label: 'Pin Diameter',     type: 'number', default: 4,   unit: 'mm', min: 1,  max: 20,  step: 0.5 },
    { id: 'knuckles',    label: 'Knuckle Count',    type: 'number', default: 3,   unit: '',   min: 2,  max: 9,   step: 1 },
    { id: 'printInPlace',label: 'Print-in-place',   type: 'boolean',default: true },
    { id: 'clearance',   label: 'Joint Clearance',  type: 'number', default: 0.25,unit: 'mm', min: 0.1,max: 1,   step: 0.05 },
  ],

  validate(p) {
    return validatePositive(p, ['width', 'leafLength', 'leafThick', 'pinDia', 'knuckles']);
  },

  generate(params) {
    const { width, leafLength, leafThick, pinDia, knuckles, printInPlace, clearance } = params;
    const pinR = pinDia / 2;
    const knuckleH = width / knuckles;
    const clearGap = printInPlace ? clearance : 0;
    const mesh = new Mesh();

    // === Leaf A (stationary) — every other knuckle ===
    const leafA = new Mesh();
    const leafBoxA = box(leafLength, leafThick, width);
    leafA.merge(translate(leafBoxA, -leafLength/2, 0, 0));

    // Knuckles on leaf A
    for (let k = 0; k < knuckles; k += 2) {
      const kZ = -width/2 + k * knuckleH + knuckleH/2;
      const knuckle = cylinder(pinR + leafThick, knuckleH - clearGap, 16);
      const kMesh = translate(knuckle, 0, 0, kZ);
      leafA.merge(kMesh);

      // Pin bore in knuckle A
      const bore = cylinder(pinR, knuckleH - clearGap + 0.1, 12);
      const boreMesh = translate(bore, 0, 0, kZ);
      leafA.merge(boreMesh); // visual only — represents the bore location
    }

    // === Leaf B (moving) — other knuckles ===
    const leafB = new Mesh();
    const leafBoxB = box(leafLength, leafThick, width);
    leafB.merge(translate(leafBoxB, leafLength/2, 0, 0));

    for (let k = 1; k < knuckles; k += 2) {
      const kZ = -width/2 + k * knuckleH + knuckleH/2;
      const knuckle = cylinder(pinR + leafThick, knuckleH - clearGap, 16);
      leafB.merge(translate(knuckle, 0, 0, kZ));
    }

    // === Pin ===
    const pin = cylinder(pinR - clearGap, width, 12);

    mesh.merge(leafA);
    mesh.merge(leafB);
    if (!printInPlace) mesh.merge(pin); // Pin as separate object

    placeOnFloor(mesh);

    const p = { width, leaf_length: leafLength, leaf_thick: leafThick, pin_dia: pinDia, knuckles, clearance };
    const openscadSource = scad.buildSCADFile('Hinge', p, `
// Parametric hinge — ${printInPlace ? 'print-in-place' : 'assembled'}
// Leaf A
translate([-leaf_length/2, 0, 0]) {
  cube([leaf_length, leaf_thick, width], center=true);
  // Knuckles A (every other)
  for (k = [0:2:knuckles-1]) {
    translate([0, 0, -width/2 + k*(width/knuckles) + width/knuckles/2])
      cylinder(r=pin_dia/2 + leaf_thick, h=width/knuckles - clearance, $fn=16, center=true);
  }
}

// Leaf B
translate([leaf_length/2, 0, 0]) {
  cube([leaf_length, leaf_thick, width], center=true);
  for (k = [1:2:knuckles-1]) {
    translate([0, 0, -width/2 + k*(width/knuckles) + width/knuckles/2])
      cylinder(r=pin_dia/2 + leaf_thick, h=width/knuckles - clearance, $fn=16, center=true);
  }
}

// Pin
${printInPlace ? '// Pin printed in-place' : `cylinder(r=pin_dia/2 - clearance, h=width, $fn=12, center=true);`}
`);

    return { mesh, openscadSource, metadata: makeMetadata('hinge', 'hinge', { width, leafLength, leafThick, pinDia, knuckles }, mesh) };
  }
};
