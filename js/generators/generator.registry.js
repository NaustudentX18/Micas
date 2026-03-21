/**
 * Generator registry.
 * Maps generator IDs to lazy-loaded module imports.
 * Add new generators here.
 */

const REGISTRY = {
  'box':                  () => import('./box.generator.js'),
  'bracket':              () => import('./bracket.generator.js'),
  'spacer':               () => import('./spacer.generator.js'),
  'organizer':            () => import('./organizer.generator.js'),
  'phone-stand':          () => import('./phone-stand.generator.js'),
  'enclosure':            () => import('./enclosure.generator.js'),
  'adapter':              () => import('./adapter.generator.js'),
  'custom':               () => import('./custom.generator.js'),
  'gear':                 () => import('./gear.generator.js'),
  'threaded-connector':   () => import('./threaded-connector.generator.js'),
  'hinge':                () => import('./hinge.generator.js'),
  'snap-fit':             () => import('./snap-fit.generator.js'),
};

// All generators as metadata (for display in UI) — loaded synchronously from descriptions
export const GENERATOR_LIST = [
  { id: 'box',                label: 'Box',               icon: '📦', description: 'Rectangular container', category: 'v1' },
  { id: 'bracket',            label: 'Bracket',           icon: '🔧', description: 'L-shaped mounting bracket', category: 'v1' },
  { id: 'spacer',             label: 'Spacer',            icon: '⭕', description: 'Cylindrical spacer or washer', category: 'v1' },
  { id: 'organizer',          label: 'Organizer',         icon: '🗂️', description: 'Grid organizer tray', category: 'v1' },
  { id: 'phone-stand',        label: 'Phone Stand',       icon: '📱', description: 'Angled desk stand', category: 'v1' },
  { id: 'enclosure',          label: 'Enclosure',         icon: '🖥️', description: 'Electronics enclosure', category: 'v1' },
  { id: 'adapter',            label: 'Adapter',           icon: '🔌', description: 'Tube-to-tube adapter', category: 'v1' },
  { id: 'custom',             label: 'Custom',            icon: '✏️', description: 'Bounding box placeholder', category: 'v1' },
  { id: 'gear',               label: 'Gear',              icon: '⚙️', description: 'Involute spur gear', category: 'v2' },
  { id: 'threaded-connector', label: 'Threaded Connector',icon: '🔩', description: 'Bolt / nut / coupling', category: 'v2' },
  { id: 'hinge',              label: 'Hinge',             icon: '🔗', description: 'Pin hinge, print-in-place', category: 'v2' },
  { id: 'snap-fit',           label: 'Snap-Fit',          icon: '🔒', description: 'Cantilever snap clip', category: 'v2' },
];

const generatorRegistry = {
  async get(id) {
    const loader = REGISTRY[id];
    if (!loader) throw new Error(`Unknown generator: ${id}`);
    const module = await loader();
    return module.default ?? module;
  },

  list() { return GENERATOR_LIST; },

  has(id) { return id in REGISTRY; },
};

export default generatorRegistry;
