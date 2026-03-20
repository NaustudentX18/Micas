import { Mesh } from '../geometry/mesh.js';
import { box } from '../geometry/primitives.js';
import { translate, placeOnFloor, merge } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive } from './base.generator.js';

export default {
  id: 'snap-fit',
  label: 'Snap-Fit',
  icon: '🔒',
  description: 'Cantilever snap-fit clip with configurable flex arm and retention bump',
  paramSchema: [
    { id: 'width',       label: 'Clip Width',      type: 'number', default: 20,  unit: 'mm', min: 5,  max: 100, step: 1 },
    { id: 'armLength',   label: 'Arm Length',      type: 'number', default: 15,  unit: 'mm', min: 3,  max: 80,  step: 1 },
    { id: 'armThick',    label: 'Arm Thickness',   type: 'number', default: 1.5, unit: 'mm', min: 0.5,max: 5,   step: 0.1 },
    { id: 'bumpHeight',  label: 'Retention Bump H',type: 'number', default: 1.5, unit: 'mm', min: 0.2,max: 5,   step: 0.1 },
    { id: 'bumpLength',  label: 'Retention Bump L',type: 'number', default: 3,   unit: 'mm', min: 1,  max: 15,  step: 0.5 },
    { id: 'baseThick',   label: 'Base Thickness',  type: 'number', default: 3,   unit: 'mm', min: 1,  max: 10,  step: 0.5 },
    { id: 'baseLength',  label: 'Base Length',     type: 'number', default: 20,  unit: 'mm', min: 5,  max: 80,  step: 1 },
    { id: 'material',    label: 'Material',        type: 'select', default: 'PETG',
      options: [{ value:'PLA', label:'PLA (more brittle)'}, { value:'PETG', label:'PETG (recommended)'}, { value:'TPU', label:'TPU (most flexible)'}]
    },
  ],

  validate(p) {
    const errors = validatePositive(p, ['width', 'armLength', 'armThick', 'bumpHeight', 'baseThick']);
    if (p.armThick > p.armLength / 3) errors.push('Arm too thick relative to length — may not flex properly');
    return errors;
  },

  generate(params) {
    const { width, armLength, armThick, bumpHeight, bumpLength, baseThick, baseLength, material } = params;
    const mesh = new Mesh();

    // Base platform
    const base = box(baseLength, width, baseThick);
    mesh.merge(translate(base, 0, 0, 0));

    // Flexible cantilever arm
    const arm = box(armLength, width, armThick);
    mesh.merge(translate(arm, armLength/2 - baseLength/4, 0, baseThick/2 + armThick/2));

    // Retention bump at end of arm (ramp geometry: wedge)
    const bump = box(bumpLength, width, bumpHeight);
    mesh.merge(translate(bump, armLength - bumpLength/2 - baseLength/4, 0, baseThick/2 + armThick + bumpHeight/2));

    // Tapered ramp on bump (simplified as another smaller box)
    const ramp = box(bumpLength, width, bumpHeight * 0.4);
    mesh.merge(translate(ramp, armLength - bumpLength * 1.4 - baseLength/4, 0, baseThick/2 + armThick + bumpHeight/2));

    placeOnFloor(mesh);

    // Approximate insertion force (simplified Castigliano theorem for cantilever)
    const E_MPa = { PLA: 3500, PETG: 2100, TPU: 50 }[material] || 2100;
    const deflection = bumpHeight; // mm
    const I = (width * armThick**3) / 12; // moment of inertia mm^4
    const F_approx = (3 * E_MPa * I * deflection) / (armLength**3); // N (Hooke's law cantilever)

    const p = { width, arm_length: armLength, arm_thick: armThick, bump_h: bumpHeight, bump_l: bumpLength, base_thick: baseThick };
    const openscadSource = scad.buildSCADFile('SnapFit', p, `
// Cantilever snap-fit clip (${material})
// Estimated insertion force: ~${F_approx.toFixed(1)} N

// Base
cube([base_length, width, base_thick], center=true);

// Arm
translate([arm_length/2, 0, base_thick/2 + arm_thick/2])
  cube([arm_length, width, arm_thick], center=true);

// Retention bump (tapered)
translate([arm_length - bump_l/2, 0, base_thick/2 + arm_thick + bump_h/2])
  cube([bump_l, width, bump_h], center=true);
`);

    return {
      mesh, openscadSource,
      metadata: {
        ...makeMetadata('snap-fit', 'snap-fit', { width, armLength, armThick, bumpHeight }, mesh),
        estimatedInsertionForce_N: F_approx,
        material
      }
    };
  }
};
