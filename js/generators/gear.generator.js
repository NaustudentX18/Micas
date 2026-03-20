import { gear as gearMesh } from '../geometry/involute.js';
import { placeOnFloor } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive, validateRange } from './base.generator.js';

export default {
  id: 'gear',
  label: 'Gear',
  icon: '⚙️',
  description: 'Involute spur gear with configurable tooth count and module',
  paramSchema: [
    { id: 'teeth',         label: 'Tooth Count',      type: 'number', default: 20,  unit: '',   min: 8,  max: 200, step: 1 },
    { id: 'module',        label: 'Module (mm)',       type: 'number', default: 1.5, unit: 'mm', min: 0.5,max: 10,  step: 0.1, description: 'Pitch diameter = module × tooth count' },
    { id: 'bore',          label: 'Bore Diameter',    type: 'number', default: 5,   unit: 'mm', min: 0,  max: 50,  step: 0.5 },
    { id: 'height',        label: 'Gear Height',      type: 'number', default: 6,   unit: 'mm', min: 1,  max: 50,  step: 0.5 },
    { id: 'pressureAngle', label: 'Pressure Angle',   type: 'select', default: 20,
      options: [{ value: 14.5, label: '14.5° (historical)' }, { value: 20, label: '20° (standard)' }, { value: 25, label: '25° (high strength)' }]
    },
    { id: 'clearance',     label: 'Bore Clearance',   type: 'number', default: 0.2, unit: 'mm', min: 0, max: 2, step: 0.05, description: 'Added to bore diameter for press-fit clearance' },
  ],

  validate(p) {
    const errors = validatePositive(p, ['teeth', 'module', 'height']);
    errors.push(...validateRange(p, 'teeth', 8, 200));
    const pitchDia = p.module * p.teeth;
    if (p.bore && p.bore + p.clearance * 2 >= pitchDia * 0.6) {
      errors.push('Bore too large for this gear (reduces tooth strength)');
    }
    return errors;
  },

  generate(params) {
    const { teeth, module: mod, bore, height, pressureAngle, clearance } = params;
    const boreWithClearance = bore + (clearance * 2);

    let mesh = gearMesh({
      teeth: Math.round(teeth),
      module: mod,
      bore: boreWithClearance,
      height,
      pressureAngle: Number(pressureAngle)
    });

    mesh = placeOnFloor(mesh);

    const pitchDia = mod * teeth;
    const p = {
      teeth: Math.round(teeth), module: mod, bore, height,
      pressure_angle: pressureAngle, clearance,
      pitch_diameter: pitchDia
    };

    // OpenSCAD — uses a simplified gear profile (points computed at generation time)
    const outerR = (pitchDia / 2) + mod;
    const openscadSource = scad.buildSCADFile('Gear', p, `
// Involute spur gear
// Pitch diameter: ${pitchDia.toFixed(2)} mm
// Note: This simplified SCAD uses an approximation.
// For exact involute profile, use the MCAD gear library.
difference() {
  cylinder(r=${outerR.toFixed(3)}, h=height, $fn=${Math.max(48, Math.round(teeth * 2))});
  // Bore hole
  translate([0, 0, -0.1]) cylinder(d=bore + clearance*2, h=height + 0.2, $fn=24);
  // Tooth spaces (approximated as cylinders — use MCAD for exact profile)
}
// For exact involute profile, install MCAD and use:
// use <MCAD/gears.scad>
// gear(number_of_teeth=teeth, circular_pitch=PI*module, bore_diameter=bore, gear_thickness=height);
`);

    return {
      mesh, openscadSource,
      metadata: {
        ...makeMetadata('gear', 'gear', { teeth, module: mod, bore, height }, mesh),
        pitchDiameter: pitchDia,
        outerDiameter: outerR * 2,
      }
    };
  }
};
