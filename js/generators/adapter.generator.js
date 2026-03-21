import { tube, cylinder, cone } from '../geometry/primitives.js';
import { placeOnFloor, merge } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive } from './base.generator.js';

export default {
  id: 'adapter',
  label: 'Adapter',
  icon: '🔌',
  description: 'Tube-to-tube adapter with different inner/outer diameters on each end',
  paramSchema: [
    { id: 'dia1Outer',  label: 'End 1 Outer Dia',  type: 'number', default: 30,  unit: 'mm', min: 1, max: 200, step: 0.5 },
    { id: 'dia1Inner',  label: 'End 1 Inner Dia',  type: 'number', default: 25,  unit: 'mm', min: 0, max: 199, step: 0.5 },
    { id: 'dia2Outer',  label: 'End 2 Outer Dia',  type: 'number', default: 20,  unit: 'mm', min: 1, max: 200, step: 0.5 },
    { id: 'dia2Inner',  label: 'End 2 Inner Dia',  type: 'number', default: 16,  unit: 'mm', min: 0, max: 199, step: 0.5 },
    { id: 'length',     label: 'Total Length',     type: 'number', default: 30,  unit: 'mm', min: 5, max: 300, step: 1 },
    { id: 'wallMin',    label: 'Min Wall Thick',   type: 'number', default: 2,   unit: 'mm', min: 0.8, max: 10, step: 0.2 },
    { id: 'segments',   label: 'Facets',           type: 'number', default: 32,  unit: '', min: 8, max: 64, step: 4 },
  ],

  validate(p) {
    const errors = validatePositive(p, ['dia1Outer', 'dia2Outer', 'length']);
    if (p.dia1Inner >= p.dia1Outer) errors.push('End 1: inner diameter must be smaller than outer');
    if (p.dia2Inner >= p.dia2Outer) errors.push('End 2: inner diameter must be smaller than outer');
    return errors;
  },

  generate(params) {
    const { dia1Outer, dia1Inner, dia2Outer, dia2Inner, length, segments } = params;
    const seg = Math.round(segments);

    // Outer frustum
    const outerCone = cone(dia1Outer/2, dia2Outer/2, length, seg);
    // Inner frustum (for hole — reversed by merging as-is)
    const innerCone = cone(dia1Inner/2, dia2Inner/2, length, seg);

    // For the visual mesh, just show the outer cone with a note about inner bore
    let mesh = outerCone;
    mesh = placeOnFloor(mesh);

    const p = { d1_outer: dia1Outer, d1_inner: dia1Inner, d2_outer: dia2Outer, d2_inner: dia2Inner, length, fn: segments };
    const openscadSource = scad.buildSCADFile('Adapter', p,
      scad.difference([
        scad.cylinderRH(dia1Outer/2, dia2Outer/2, length, segments),
        scad.cylinderRH(dia1Inner/2, dia2Inner/2, `length + 0.1`, segments)
      ])
    );

    return { mesh, openscadSource, metadata: makeMetadata('adapter', 'adapter', { dia1Outer, dia1Inner, dia2Outer, dia2Inner, length }, mesh) };
  }
};
