import { fmtDate, fmtVolume, fmtMass, fmtConfidence } from '../utils/format.utils.js';

export function generateJobSummary(project, part, brief, metadata, validationReport) {
  const d = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const confidence = brief?.confidence || 0;
  const dims = metadata?.dimensions || {};
  const volume = metadata?.volume || 0;
  const mass = metadata?.estimatedMass || 0;

  return `═══════════════════════════════════════
MY PERSONAL CAD v2 — JOB SUMMARY
═══════════════════════════════════════
Generated: ${d}
Project: ${project?.name || 'Unknown'}
Part Type: ${metadata?.partType || 'Unknown'}
Generator: ${metadata?.generatorId || 'Unknown'}

───────────────────────────────────────
DESIGN BRIEF
───────────────────────────────────────
Object: ${brief?.object_type || 'N/A'}
AI Confidence: ${confidence}% (${fmtConfidence(confidence)})
AI Provider: ${brief?.provider || 'rule-based'}
Material: ${brief?.material_recommendation || 'PLA'}

───────────────────────────────────────
DIMENSIONS
───────────────────────────────────────
${Object.entries(dims).filter(([,v]) => v != null && typeof v === 'number').map(([k,v]) => `${k.padEnd(20)} ${v.toFixed(2)} mm`).join('\n') || 'See STL file'}

Volume: ${(volume/1000).toFixed(2)} cm³
Est. Mass: ${mass.toFixed(1)} g

───────────────────────────────────────
PRINT SETTINGS
───────────────────────────────────────
Infill: ${brief?.print_strategy?.infill || 20}%
Supports: ${brief?.print_strategy?.supports ? 'Yes' : 'No'}
Orientation: ${brief?.print_strategy?.orientation || 'flat side down'}

───────────────────────────────────────
VALIDATION
───────────────────────────────────────
Score: ${validationReport?.score ?? 'N/A'}/100
Printable: ${validationReport?.printable ? 'YES' : 'NEEDS REVIEW'}
Issues: ${validationReport?.issues?.length ?? 0}
Warnings: ${validationReport?.warnings?.length ?? 0}
${validationReport?.issues?.map(i => `  ⚠ ${i.title}`).join('\n') || '  ✓ None'}

───────────────────────────────────────
ASSUMPTIONS
───────────────────────────────────────
${(brief?.assumptions || []).map((a, i) => `${(i+1).toString().padStart(2)}. ${a}`).join('\n') || '  None recorded'}

───────────────────────────────────────
MISSING INFORMATION
───────────────────────────────────────
${(brief?.missing_info || []).map(m => `  ? ${m}`).join('\n') || '  None — confidence threshold met'}

═══════════════════════════════════════
`;
}
