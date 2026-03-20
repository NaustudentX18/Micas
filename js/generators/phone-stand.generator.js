import { Mesh } from '../geometry/mesh.js';
import { box } from '../geometry/primitives.js';
import { translate, rotateX, placeOnFloor, merge } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive } from './base.generator.js';

export default {
  id: 'phone-stand',
  label: 'Phone Stand',
  icon: '📱',
  description: 'Angled phone/tablet desk stand with adjustable angle',
  paramSchema: [
    { id: 'phoneWidth',   label: 'Phone Width',    type: 'number', default: 80,  unit: 'mm', min: 40, max: 200, step: 1 },
    { id: 'standHeight',  label: 'Stand Height',   type: 'number', default: 80,  unit: 'mm', min: 40, max: 200, step: 1 },
    { id: 'angle',        label: 'Lean Angle',     type: 'number', default: 70,  unit: '°',  min: 30, max: 85,  step: 5 },
    { id: 'baseDepth',    label: 'Base Depth',     type: 'number', default: 60,  unit: 'mm', min: 20, max: 150, step: 5 },
    { id: 'thickness',    label: 'Material Thick', type: 'number', default: 4,   unit: 'mm', min: 2,  max: 12,  step: 0.5 },
    { id: 'chargerSlot',  label: 'Charger slot',   type: 'boolean',default: true },
    { id: 'slotWidth',    label: 'Slot Width',     type: 'number', default: 12,  unit: 'mm', min: 5,  max: 30,  step: 1 },
  ],

  validate(p) { return validatePositive(p, ['phoneWidth', 'standHeight', 'baseDepth', 'thickness']); },

  generate(params) {
    const { phoneWidth, standHeight, angle, baseDepth, thickness, chargerSlot, slotWidth } = params;
    const mesh = new Mesh();
    const rad = (angle * Math.PI) / 180;

    // Base plate
    const base = box(phoneWidth + 20, baseDepth, thickness);
    const basePlaced = translate(base, 0, 0, 0);
    mesh.merge(basePlaced);

    // Back support panel (angled)
    const panelH = standHeight;
    const panel = box(phoneWidth + 20, thickness, panelH);
    // Rotate panel to lean angle
    const panelRotated = rotateX(panel, -(90 - angle));
    const panelPlaced = translate(panelRotated, 0, -baseDepth/2 + thickness/2, panelH/2);
    mesh.merge(panelPlaced);

    // Phone ledge (bottom lip to hold phone)
    const ledge = box(phoneWidth + 20, 12, 8);
    const ledgeAngled = rotateX(ledge, -(90 - angle));
    const ledgePlaced = translate(ledgeAngled, 0, -baseDepth/3, 4);
    mesh.merge(ledgePlaced);

    placeOnFloor(mesh);

    const p = { phone_width: phoneWidth, stand_height: standHeight, angle, base_depth: baseDepth, thickness };
    const openscadSource = scad.buildSCADFile('PhoneStand', p, `
// Base plate
cube([phone_width + 20, base_depth, thickness], center=true);

// Back panel (angled)
translate([0, -base_depth/2, 0])
  rotate([-( 90 - angle), 0, 0])
    cube([phone_width + 20, thickness, stand_height], center=true);

// Bottom ledge
translate([0, -base_depth/3, thickness])
  rotate([-(90 - angle), 0, 0])
    cube([phone_width + 20, 12, 8], center=true);
`);

    return { mesh, openscadSource, metadata: makeMetadata('phone-stand', 'phone-stand', { phoneWidth, standHeight, angle, baseDepth }, mesh) };
  }
};
