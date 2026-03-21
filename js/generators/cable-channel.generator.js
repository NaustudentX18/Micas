import { box, cylinder } from '../geometry/primitives.js';
import { hollowBox } from '../geometry/primitives.js';
import { translate, merge, placeOnFloor } from '../geometry/transform.js';
import * as scad from '../openscad/openscad-writer.js';
import { makeMetadata, validatePositive, validateRange } from './base.generator.js';

export default {
  id: 'cable-channel',
  label: 'Cable Channel',
  icon: '📦',
  description: 'Snap-lid cable management channel/raceway',

  paramSchema: [
    { id: 'channelWidth',  label: 'Channel Width',   type: 'number',  default: 20,  unit: 'mm', min: 10,  max: 60,  step: 1 },
    { id: 'channelHeight', label: 'Channel Height',  type: 'number',  default: 15,  unit: 'mm', min: 8,   max: 40,  step: 0.5 },
    { id: 'length',        label: 'Length',           type: 'number',  default: 100, unit: 'mm', min: 20,  max: 500, step: 5 },
    { id: 'wallThick',     label: 'Wall Thickness',  type: 'number',  default: 2,   unit: 'mm', min: 1,   max: 4,   step: 0.25 },
    { id: 'snapFit',       label: 'Snap-fit Lips',   type: 'boolean', default: true },
    { id: 'mountingTab',   label: 'Mounting Tabs',   type: 'boolean', default: true },
  ],

  validate(p) {
    const errors = validatePositive(p, ['channelWidth', 'channelHeight', 'length', 'wallThick']);
    errors.push(...validateRange(p, 'channelWidth',  10,  60));
    errors.push(...validateRange(p, 'channelHeight', 8,   40));
    errors.push(...validateRange(p, 'length',        20,  500));
    errors.push(...validateRange(p, 'wallThick',     1,   4));
    if (p.wallThick * 2 >= p.channelWidth - 4) {
      errors.push('Wall thickness too large for the channel width');
    }
    if (p.wallThick >= p.channelHeight - 4) {
      errors.push('Wall thickness too large for the channel height');
    }
    return errors;
  },

  generate(params) {
    const { channelWidth, channelHeight, length, wallThick, snapFit, mountingTab } = params;

    // ── U-channel body (open on top) ───────────────────────────────────────────
    // Built as a hollowBox — the channel sits with open side up.
    // hollowBox(w, d, h, wall) — open top, floor and 4 walls.
    // We map: channel width → w, length → d, channel height → h
    const channel = hollowBox(channelWidth, length, channelHeight, wallThick);

    let mesh = channel;

    // ── Snap-fit lips ──────────────────────────────────────────────────────────
    // Two inward-curving lips at the top edges of the channel walls,
    // pointing inward to grip the lid. Approximated as small flat boxes.
    if (snapFit) {
      const lipThick  = wallThick * 0.7;
      const lipInset  = wallThick * 0.9;   // how far they protrude inward
      const lipHeight = wallThick * 1.2;

      // Left lip: on the inner face of the left wall, at the top
      const lip = box(lipInset, length - wallThick * 2, lipHeight);
      const lipZ = channelHeight / 2 - lipHeight / 2;  // near the top

      const leftLip  = translate(lip, -(channelWidth / 2 - wallThick - lipInset / 2), 0, lipZ);
      const rightLip = translate(lip,  (channelWidth / 2 - wallThick - lipInset / 2), 0, lipZ);

      mesh = merge(mesh, leftLip, rightLip);
    }

    // ── Mounting tabs on bottom ────────────────────────────────────────────────
    // Small flanges with holes projecting from the bottom of the channel,
    // used for screwing the raceway to a surface.
    if (mountingTab) {
      const tabW     = channelWidth + wallThick * 4;
      const tabD     = wallThick * 3;
      const tabH     = wallThick * 1.2;
      const holeR    = 2;   // M4 clearance
      const holeSeg  = 12;

      // Number of tabs depends on length
      const tabCount = Math.max(2, Math.floor(length / 80));
      const tabSpacing = length / (tabCount + 1);

      for (let i = 1; i <= tabCount; i++) {
        const ty = -length / 2 + i * tabSpacing;
        const tab = box(tabW, tabD, tabH);
        const tabMesh = translate(tab, 0, ty, -(channelHeight / 2) - tabH / 2);

        // Screw hole marker
        const holeMark = cylinder(holeR * 0.4, tabH + 0.2, holeSeg);
        const holeMesh = translate(holeMark, 0, ty, -(channelHeight / 2) - tabH / 2);

        mesh = merge(mesh, tabMesh, holeMesh);
      }
    }

    mesh = placeOnFloor(mesh);

    // ── OpenSCAD source ────────────────────────────────────────────────────────
    const scadParams = {
      channel_width:  channelWidth,
      channel_height: channelHeight,
      length,
      wall_thick:     wallThick,
      snap_fit:       snapFit,
      mounting_tab:   mountingTab,
    };

    const snapCode = snapFit ? `
    // Snap-fit inward lips at channel top opening
    translate([-(channel_width / 2 - wall_thick - wall_thick * 0.45), 0, channel_height / 2 - wall_thick * 0.6])
      cube([wall_thick * 0.9, length - wall_thick * 2, wall_thick * 1.2], center=true);
    translate([ (channel_width / 2 - wall_thick - wall_thick * 0.45), 0, channel_height / 2 - wall_thick * 0.6])
      cube([wall_thick * 0.9, length - wall_thick * 2, wall_thick * 1.2], center=true);` : '';

    const tabCount = Math.max(2, Math.floor(length / 80));
    const tabSpacing = length / (tabCount + 1);
    const tabH = wallThick * 1.2;

    const tabCode = mountingTab ? `
    // Mounting tabs with screw holes
    for (i = [1:1:${tabCount}]) {
      ty = -length / 2 + i * ${tabSpacing.toFixed(4)};
      difference() {
        translate([0, ty, -(channel_height / 2) - ${(tabH / 2).toFixed(4)}])
          cube([${(channelWidth + wallThick * 4).toFixed(4)}, ${(wallThick * 3).toFixed(4)}, ${tabH.toFixed(4)}], center=true);
        translate([0, ty, -(channel_height / 2) - ${(tabH / 2).toFixed(4)}])
          cylinder(r=2, h=${(tabH + 0.2).toFixed(4)}, $fn=12, center=true);
      }
    }` : '';

    const bodyCode = `
module cable_channel() {
  union() {
    // U-channel body (open top)
    difference() {
      cube([channel_width, length, channel_height], center=true);
      translate([0, 0, wall_thick / 2])
        cube([channel_width - wall_thick * 2, length - wall_thick * 2, channel_height], center=true);
    }
${snapCode}
${tabCode}
  }
}

cable_channel();`;

    const openscadSource = scad.buildSCADFile('Cable Channel', scadParams, bodyCode);

    return {
      mesh,
      openscadSource,
      metadata: makeMetadata('cable-channel', 'cable-channel', {
        channelWidth, channelHeight, length, wallThick,
      }, mesh),
    };
  },
};
