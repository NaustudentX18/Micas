import { box } from '../geometry/primitives.js';
import { placeOnFloor } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata } from './base.generator.js';

/**
 * Custom generator — bounding box placeholder with full parameter control.
 * Outputs a solid box of the specified dimensions as a starting point.
 * Users can download the OpenSCAD file and customize from there.
 */
export default {
  id: 'custom',
  label: 'Custom',
  icon: '✏️',
  description: 'Start with a bounding box placeholder — download OpenSCAD to customize',
  paramSchema: [
    { id: 'width',    label: 'Width',    type: 'number', default: 50, unit: 'mm', min: 1, max: 1000, step: 0.5 },
    { id: 'depth',    label: 'Depth',    type: 'number', default: 50, unit: 'mm', min: 1, max: 1000, step: 0.5 },
    { id: 'height',   label: 'Height',   type: 'number', default: 50, unit: 'mm', min: 1, max: 1000, step: 0.5 },
    { id: 'notes',    label: 'Design Notes', type: 'text', default: '', description: 'Optional design intent for the OpenSCAD comment' },
  ],

  validate(p) {
    const errors = [];
    if (!p.width || p.width <= 0) errors.push('Width must be positive');
    if (!p.depth || p.depth <= 0) errors.push('Depth must be positive');
    if (!p.height || p.height <= 0) errors.push('Height must be positive');
    return errors;
  },

  generate(params) {
    const { width, depth, height, notes } = params;
    let mesh = box(width, depth, height);
    mesh = placeOnFloor(mesh);

    const openscadSource = scad.buildSCADFile('CustomPart', { width, depth, height },
      `// ${notes || 'Custom part — modify geometry below'}\n` +
      `// This is a bounding-box placeholder. Replace with your actual geometry.\n\n` +
      `// Example: start with a cube and subtract/add shapes\n` +
      scad.difference([
        scad.cube('width', 'depth', 'height'),
        `// Add cutouts, holes, or features here`
      ])
    );

    return { mesh, openscadSource, metadata: makeMetadata('custom', 'custom', { width, depth, height }, mesh) };
  }
};
