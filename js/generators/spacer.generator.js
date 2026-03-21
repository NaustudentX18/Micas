import { tube, cylinder } from '../geometry/primitives.js';
import { placeOnFloor } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive } from './base.generator.js';

export default {
  id: 'spacer',
  label: 'Spacer',
  icon: '⭕',
  description: 'Cylindrical spacer, standoff, or washer',
  paramSchema: [
    { id: 'outerDiameter', label: 'Outer Diameter', type: 'number', default: 12,  unit: 'mm', min: 1, max: 200, step: 0.5 },
    { id: 'innerDiameter', label: 'Inner Diameter', type: 'number', default: 5,   unit: 'mm', min: 0, max: 199, step: 0.5 },
    { id: 'height',        label: 'Height',         type: 'number', default: 10,  unit: 'mm', min: 0.5, max: 200, step: 0.5 },
    { id: 'segments',      label: 'Facets ($fn)',   type: 'number', default: 32,  unit: '', min: 8, max: 128, step: 4 },
  ],

  validate(p) {
    const errors = validatePositive(p, ['outerDiameter', 'height']);
    if (p.innerDiameter >= p.outerDiameter) errors.push('Inner diameter must be smaller than outer diameter');
    return errors;
  },

  generate(params) {
    const { outerDiameter, innerDiameter, height, segments } = params;
    const outerR = outerDiameter / 2;
    const innerR = innerDiameter / 2;

    let mesh;
    if (innerDiameter > 0) {
      mesh = tube(outerR, innerR, height, Math.round(segments));
    } else {
      mesh = cylinder(outerR, height, Math.round(segments));
    }
    mesh = placeOnFloor(mesh);

    const p = { outer_d: outerDiameter, inner_d: innerDiameter, height, fn: segments };
    const body = innerDiameter > 0
      ? scad.difference([
          scad.cylinder(outerR, height, segments),
          scad.cylinder(innerR, `height + 0.1`, segments)
        ])
      : scad.cylinder(outerR, height, segments);

    const openscadSource = scad.buildSCADFile('Spacer', p, body);

    return { mesh, openscadSource, metadata: makeMetadata('spacer', 'spacer', { outerDiameter, innerDiameter, height }, mesh) };
  }
};
