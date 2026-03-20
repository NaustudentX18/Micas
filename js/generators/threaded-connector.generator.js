import { helixThread, shaft } from '../geometry/helix.js';
import { tube, cylinder } from '../geometry/primitives.js';
import { translate, placeOnFloor, merge } from '../geometry/transform.js';
import { Mesh } from '../geometry/mesh.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive } from './base.generator.js';

// Standard metric thread parameters [major_mm, pitch_mm, minor_mm]
const METRIC_STANDARDS = {
  'M3':  [3.0,  0.5,  2.459],
  'M4':  [4.0,  0.7,  3.242],
  'M5':  [5.0,  0.8,  4.134],
  'M6':  [6.0,  1.0,  4.917],
  'M8':  [8.0,  1.25, 6.647],
  'M10': [10.0, 1.5,  8.376],
  'M12': [12.0, 1.75, 10.106],
};

export default {
  id: 'threaded-connector',
  label: 'Threaded Connector',
  icon: '🔩',
  description: 'External or internal threaded connector — bolt, nut, coupling, or standoff',
  paramSchema: [
    { id: 'threadStandard', label: 'Thread Standard', type: 'select', default: 'M6',
      options: Object.keys(METRIC_STANDARDS).map(k => ({ value: k, label: k })).concat([{ value: 'custom', label: 'Custom' }])
    },
    { id: 'majorDia',   label: 'Major Diameter',  type: 'number', default: 6.0, unit: 'mm', min: 1, max: 50, step: 0.1 },
    { id: 'pitch',      label: 'Pitch',           type: 'number', default: 1.0, unit: 'mm', min: 0.25, max: 8, step: 0.25 },
    { id: 'length',     label: 'Thread Length',   type: 'number', default: 20,  unit: 'mm', min: 2, max: 200, step: 1 },
    { id: 'external',   label: 'Type', type: 'select', default: 'external',
      options: [{ value: 'external', label: 'External thread (bolt/stud)' }, { value: 'internal', label: 'Internal thread (nut/coupling)' }]
    },
    { id: 'tolerance',  label: 'Print Tolerance', type: 'number', default: 0.3, unit: 'mm', min: 0, max: 1, step: 0.05 },
    { id: 'hexFlats',   label: 'Hex flats (mm)',  type: 'number', default: 0,   unit: 'mm', min: 0, max: 30, step: 0.5, description: '0 = no hex head' },
    { id: 'segments',   label: 'Thread quality',  type: 'number', default: 24,  unit: '',   min: 8, max: 48, step: 4 },
  ],

  validate(p) { return validatePositive(p, ['majorDia', 'pitch', 'length']); },

  generate(params) {
    const { threadStandard, pitch, length, external, tolerance, segments } = params;
    let { majorDia } = params;

    // Apply standard thread dimensions
    if (threadStandard !== 'custom' && METRIC_STANDARDS[threadStandard]) {
      const [maj, pch] = METRIC_STANDARDS[threadStandard];
      majorDia = maj;
      // Keep user pitch or use standard
    }

    const minorDia = majorDia - pitch * 1.227; // ISO formula
    const tolSign = external === 'external' ? -1 : +1;
    const adjMajor = majorDia + tolSign * tolerance;
    const adjMinor = minorDia + tolSign * tolerance;

    const mesh = new Mesh();

    // Shaft / cylinder body
    const shaftDia = external === 'external' ? adjMinor : adjMajor + 4;
    const shaftMesh = shaft(shaftDia, length, Math.round(segments));
    mesh.merge(shaftMesh);

    // Thread helix overlay
    const threadMesh = helixThread({
      majorDiameter: adjMajor,
      minorDiameter: adjMinor,
      pitch,
      length,
      segmentsPerTurn: Math.round(segments),
      external: external === 'external'
    });
    mesh.merge(threadMesh);

    placeOnFloor(mesh);

    const p = { major_dia: majorDia, pitch, length, tolerance, thread_standard: threadStandard };
    const threadType = external === 'external' ? 'External' : 'Internal';
    const openscadSource = scad.buildSCADFile(`${threadType}Thread_${threadStandard}`, p, `
// ${threadType} threaded connector (${threadStandard}, pitch=${pitch}mm)
// For accurate threads, use the threading.scad library:
// https://github.com/rcolyer/threads-scad

// Simplified representation:
cylinder(d=${majorDia.toFixed(2)}, h=${length}, $fn=${Math.round(segments) * 2});
// Uncomment below for actual threads using threads-scad:
// use <threads.scad>
// ${external === 'external' ? `metric_thread(diameter=${majorDia}, pitch=${pitch}, length=${length});` : `nut(diameter=${majorDia}, pitch=${pitch}, length=${length});`}
`);

    return { mesh, openscadSource, metadata: makeMetadata('threaded-connector', 'threaded-connector', { majorDia, pitch, length }, mesh) };
  }
};
