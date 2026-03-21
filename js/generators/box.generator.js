import { hollowBox as buildHollowBox } from '../geometry/csg.js';
import { box as solidBox } from '../geometry/primitives.js';
import { placeOnFloor } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive } from './base.generator.js';

export default {
  id: 'box',
  label: 'Box',
  icon: '📦',
  description: 'Rectangular container with optional hollow interior',
  paramSchema: [
    { id: 'width',         label: 'Width',          type: 'number', default: 80,  unit: 'mm', min: 1, max: 500, step: 0.5 },
    { id: 'depth',         label: 'Depth',          type: 'number', default: 60,  unit: 'mm', min: 1, max: 500, step: 0.5 },
    { id: 'height',        label: 'Height',         type: 'number', default: 40,  unit: 'mm', min: 1, max: 500, step: 0.5 },
    { id: 'wallThickness', label: 'Wall Thickness', type: 'number', default: 2.0, unit: 'mm', min: 0.8, max: 20, step: 0.2 },
    { id: 'hollow',        label: 'Hollow interior',type: 'boolean',default: true },
    { id: 'closedTop',     label: 'Closed top',     type: 'boolean',default: false },
  ],

  validate(params) {
    const errors = validatePositive(params, ['width', 'depth', 'height']);
    if (params.hollow && params.wallThickness >= params.width / 2) {
      errors.push('Wall thickness too large for given width');
    }
    if (params.hollow && params.wallThickness >= params.depth / 2) {
      errors.push('Wall thickness too large for given depth');
    }
    return errors;
  },

  generate(params) {
    const { width, depth, height, wallThickness, hollow, closedTop } = params;
    let mesh;

    if (hollow) {
      const wall = wallThickness;
      const iw = width - wall * 2;
      const id = depth - wall * 2;
      const ih = closedTop ? height - wall * 2 : height - wall;
      mesh = buildHollowBox(width, depth, height, iw, id, ih, wall);
    } else {
      mesh = solidBox(width, depth, height);
    }

    mesh = placeOnFloor(mesh);

    // OpenSCAD
    const p = { width, depth, height, wall_thickness: wallThickness };
    let body;
    if (hollow) {
      body = scad.difference([
        scad.cube('width', 'depth', 'height'),
        scad.translate([wallThickness, wallThickness, wallThickness],
          scad.cube(
            `width - wall_thickness * 2`,
            `depth - wall_thickness * 2`,
            closedTop ? `height - wall_thickness * 2` : `height - wall_thickness + 0.01`
          )
        )
      ]);
    } else {
      body = scad.cube('width', 'depth', 'height');
    }

    const openscadSource = scad.buildSCADFile('Box', p,
      `// ${hollow ? 'Hollow box' : 'Solid box'}${closedTop ? ' with closed top' : ' (open top)'}\n` +
      scad.translate([0, 0, 0], body)
    );

    return {
      mesh,
      openscadSource,
      metadata: makeMetadata('box', 'box', { width, depth, height, wallThickness }, mesh)
    };
  }
};

