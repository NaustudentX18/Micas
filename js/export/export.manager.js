import { writeBinarySTL } from '../stl/stl-writer.js';
import { downloadBlob, downloadText, downloadArrayBuffer, sanitizeFilename } from '../utils/file.utils.js';
import { generateBambuSheet } from './bambu-sheet.export.js';
import { generateMakerWorldListing } from './makerworld.export.js';
import { generateJobSummary } from './job-summary.export.js';
import { generateParametricJSON } from './parametric-json.export.js';
import { generateConfidenceSummary } from './confidence-summary.export.js';

/**
 * Export manager — orchestrates all export formats.
 */

const exportManager = {
  exportSTL(mesh, partName = 'part') {
    const buffer = writeBinarySTL(mesh);
    const filename = sanitizeFilename(partName) + '.stl';
    downloadArrayBuffer(buffer, filename, 'model/stl');
    return filename;
  },

  exportOpenSCAD(openscadSource, partName = 'part') {
    const filename = sanitizeFilename(partName) + '.scad';
    downloadText(openscadSource, filename, 'text/plain');
    return filename;
  },

  exportBambuSheet(brief, metadata, validationReport, partName = 'part') {
    const json = generateBambuSheet(brief, metadata, validationReport);
    const filename = sanitizeFilename(partName) + '_bambu.json';
    downloadText(json, filename, 'application/json');
    return filename;
  },

  exportMakerWorld(brief, metadata, partName = 'part') {
    const md = generateMakerWorldListing(brief, metadata);
    const filename = sanitizeFilename(partName) + '_makerworld.md';
    downloadText(md, filename, 'text/markdown');
    return filename;
  },

  exportJobSummary(project, part, brief, metadata, validationReport, partName = 'part') {
    const text = generateJobSummary(project, part, brief, metadata, validationReport);
    const filename = sanitizeFilename(partName) + '_job_summary.txt';
    downloadText(text, filename, 'text/plain');
    return filename;
  },

  exportParametricJSON(brief, generatorId, params, metadata, partName = 'part') {
    const json = generateParametricJSON(brief, generatorId, params, metadata);
    const filename = sanitizeFilename(partName) + '_params.json';
    downloadText(json, filename, 'application/json');
    return filename;
  },

  exportConfidenceSummary(analysisResult, answers, partName = 'part') {
    const text = generateConfidenceSummary(analysisResult, answers);
    const filename = sanitizeFilename(partName) + '_confidence.txt';
    downloadText(text, filename, 'text/plain');
    return filename;
  }
};

export default exportManager;
