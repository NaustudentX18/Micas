import { fmtConfidence } from '../utils/format.utils.js';

export function generateConfidenceSummary(analysisResult, questionAnswers = []) {
  const { cadBrief, confidence, assumptions = [], missingInfo = [], reasoning = '', provider = 'unknown' } = analysisResult;

  const level = fmtConfidence(confidence);
  const stars = '★'.repeat(Math.round(confidence / 20)) + '☆'.repeat(5 - Math.round(confidence / 20));

  return `MY PERSONAL CAD v2 — CONFIDENCE REPORT
${'═'.repeat(50)}

Analysis Provider: ${provider === 'openrouter' ? 'AI (OpenRouter)' : 'Offline Rule-Based Engine'}
Confidence Score: ${confidence}% ${stars} (${level})
Generated: ${new Date().toLocaleString()}

${confidence < 80 ? `⚠ LOW CONFIDENCE WARNING
This design has lower-than-ideal confidence. The model
was generated but may not match your exact requirements.
Review assumptions carefully and verify dimensions.
` : `✓ HIGH CONFIDENCE
This design meets the confidence threshold. Assumptions
are minimal and dimensions are well-specified.
`}

REASONING
${'─'.repeat(50)}
${reasoning || 'No reasoning provided.'}

ASSUMPTIONS MADE (${assumptions.length})
${'─'.repeat(50)}
${assumptions.map((a, i) => `${(i+1).toString().padStart(2)}. ${a}`).join('\n') || '  None — all values explicitly provided.'}

INFORMATION THAT WOULD IMPROVE CONFIDENCE (${missingInfo.length})
${'─'.repeat(50)}
${missingInfo.map(m => `  → ${m}`).join('\n') || '  None — all critical information was provided.'}

QUESTION RESPONSES (${questionAnswers.length})
${'─'.repeat(50)}
${questionAnswers.map(a => `  ${a.questionId}: ${JSON.stringify(a.value)}`).join('\n') || '  No questions answered.'}

${'═'.repeat(50)}
Verify this design brief before printing.
`;
}
