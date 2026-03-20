import { Mesh } from '../geometry/mesh.js';
import { box } from '../geometry/primitives.js';
import { translate, placeOnFloor, merge } from '../geometry/transform.js';
import { hollowBox } from '../geometry/csg.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive } from './base.generator.js';

export default {
  id: 'organizer',
  label: 'Organizer',
  icon: '🗂️',
  description: 'Grid organizer tray with configurable rows and columns',
  paramSchema: [
    { id: 'width',       label: 'Total Width',   type: 'number', default: 120, unit: 'mm', min: 20, max: 500, step: 1 },
    { id: 'depth',       label: 'Total Depth',   type: 'number', default: 80,  unit: 'mm', min: 20, max: 500, step: 1 },
    { id: 'height',      label: 'Height',        type: 'number', default: 30,  unit: 'mm', min: 5,  max: 200, step: 1 },
    { id: 'cols',        label: 'Columns',       type: 'number', default: 3,   unit: '',   min: 1,  max: 10,  step: 1 },
    { id: 'rows',        label: 'Rows',          type: 'number', default: 2,   unit: '',   min: 1,  max: 10,  step: 1 },
    { id: 'wallThick',   label: 'Wall Thickness',type: 'number', default: 1.5, unit: 'mm', min: 0.8,max: 5,   step: 0.2 },
  ],

  validate(p) {
    return validatePositive(p, ['width', 'depth', 'height', 'cols', 'rows', 'wallThick']);
  },

  generate(params) {
    const { width, depth, height, cols, rows, wallThick } = params;
    const mesh = new Mesh();

    // Outer shell
    const outer = hollowBox(width, depth, height, width - wallThick*2, depth - wallThick*2, height - wallThick, wallThick);
    mesh.merge(outer);

    // Vertical dividers (along Y-axis, separating columns)
    const divW = wallThick;
    const cellW = (width - wallThick * (cols + 1)) / cols;
    for (let c = 1; c < cols; c++) {
      const xPos = -width/2 + wallThick * c + cellW * c;
      const divider = box(divW, depth - wallThick*2, height - wallThick);
      const placed = translate(divider, xPos, 0, wallThick/2);
      mesh.merge(placed);
    }

    // Horizontal dividers (along X-axis, separating rows)
    const cellD = (depth - wallThick * (rows + 1)) / rows;
    for (let r = 1; r < rows; r++) {
      const yPos = -depth/2 + wallThick * r + cellD * r;
      const divider = box(width - wallThick*2, divW, height - wallThick);
      const placed = translate(divider, 0, yPos, wallThick/2);
      mesh.merge(placed);
    }

    placeOnFloor(mesh);

    const p = { width, depth, height, cols, rows, wall: wallThick };
    const openscadSource = scad.buildSCADFile('Organizer', p, `
// Outer shell
difference() {
  cube([width, depth, height], center=true);
  translate([0, 0, wall/2]) cube([width-wall*2, depth-wall*2, height-wall+0.1], center=true);
}

// Column dividers
for (c = [1:cols-1]) {
  translate([-width/2 + (width/cols)*c, 0, wall/2]) cube([wall, depth-wall*2, height-wall], center=true);
}

// Row dividers
for (r = [1:rows-1]) {
  translate([0, -depth/2 + (depth/rows)*r, wall/2]) cube([width-wall*2, wall, height-wall], center=true);
}
`);

    return { mesh, openscadSource, metadata: makeMetadata('organizer', 'organizer', { width, depth, height, cols, rows }, mesh) };
  }
};
