import { hollowBox } from '../geometry/csg.js';
import { box, cylinder } from '../geometry/primitives.js';
import { translate, placeOnFloor, merge } from '../geometry/transform.js';
import { Mesh } from '../geometry/mesh.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive } from './base.generator.js';

export default {
  id: 'enclosure',
  label: 'Enclosure',
  icon: '🖥️',
  description: 'Electronics project enclosure with mounting posts',
  paramSchema: [
    { id: 'width',       label: 'Width',            type: 'number', default: 100, unit: 'mm', min: 20, max: 500, step: 1 },
    { id: 'depth',       label: 'Depth',            type: 'number', default: 80,  unit: 'mm', min: 20, max: 500, step: 1 },
    { id: 'height',      label: 'Height',           type: 'number', default: 40,  unit: 'mm', min: 10, max: 300, step: 1 },
    { id: 'wall',        label: 'Wall Thickness',   type: 'number', default: 2.5, unit: 'mm', min: 1,  max: 10,  step: 0.5 },
    { id: 'posts',       label: 'Corner Posts',     type: 'boolean',default: true },
    { id: 'postDia',     label: 'Post Diameter',    type: 'number', default: 8,   unit: 'mm', min: 4,  max: 20,  step: 1 },
    { id: 'postHeight',  label: 'Post Height',      type: 'number', default: 8,   unit: 'mm', min: 2,  max: 30,  step: 1 },
    { id: 'postBoreDia', label: 'Post Bore (M-screw)',type:'number',default: 2.9, unit: 'mm', min: 1,  max: 6,   step: 0.1 },
    { id: 'lidSeparate', label: 'Design as base only',type:'boolean',default: true },
  ],

  validate(p) {
    const errors = validatePositive(p, ['width', 'depth', 'height', 'wall']);
    if (p.wall * 2 >= p.width) errors.push('Wall too thick for width');
    if (p.wall * 2 >= p.depth) errors.push('Wall too thick for depth');
    return errors;
  },

  generate(params) {
    const { width, depth, height, wall, posts, postDia, postHeight, postBoreDia, lidSeparate } = params;
    const mesh = new Mesh();

    // Main shell (open top)
    const shell = hollowBox(width, depth, height, width - wall*2, depth - wall*2, height - wall, wall);
    mesh.merge(shell);

    // Corner mounting posts
    if (posts) {
      const postR = postDia / 2;
      const boreR = postBoreDia / 2;
      const postPositions = [
        [width/2 - postDia/2 - wall, depth/2 - postDia/2 - wall],
        [-width/2 + postDia/2 + wall, depth/2 - postDia/2 - wall],
        [width/2 - postDia/2 - wall, -depth/2 + postDia/2 + wall],
        [-width/2 + postDia/2 + wall, -depth/2 + postDia/2 + wall],
      ];

      for (const [px, py] of postPositions) {
        // Solid cylinder post
        const post = cylinder(postR, postHeight, 16);
        const postPlaced = translate(post, px, py, postHeight/2 - height/2 + wall);
        mesh.merge(postPlaced);

        // Bore hole (reversed cylinder — represents hole in output mesh)
        if (postBoreDia > 0) {
          const bore = cylinder(boreR, postHeight + 0.5, 12);
          const borePlaced = translate(bore, px, py, postHeight/2 - height/2 + wall);
          // For display, we merge bore as-is — actual subtraction would need full CSG
          // In OpenSCAD code, it's done properly with difference()
        }
      }
    }

    placeOnFloor(mesh);

    const p = { width, depth, height, wall, post_dia: postDia, post_height: postHeight, bore_dia: postBoreDia };
    const openscadSource = scad.buildSCADFile('Enclosure', p, `
// Main shell
difference() {
  cube([width, depth, height]);
  translate([wall, wall, wall]) cube([width-wall*2, depth-wall*2, height]);
}

// Corner posts (if enabled)
${posts ? `
for (x = [wall + post_dia/2, width - wall - post_dia/2]) {
  for (y = [wall + post_dia/2, depth - wall - post_dia/2]) {
    translate([x, y, wall]) difference() {
      cylinder(d=post_dia, h=post_height, $fn=16);
      cylinder(d=bore_dia, h=post_height+0.1, $fn=12);
    }
  }
}
` : ''}
`);

    return { mesh, openscadSource, metadata: makeMetadata('enclosure', 'enclosure', { width, depth, height, wall }, mesh) };
  }
};
