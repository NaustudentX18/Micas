import settingsStore from '../db/settings.store.js';
import { buildAnalysisPrompt } from './prompt.builder.js';

/**
 * OpenRouter AI provider.
 * Supports multimodal (vision) for photo analysis when model supports it.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function buildMessages(intake, answers, model, imageAnalysis) {
  const textPrompt = buildAnalysisPrompt(intake, answers, imageAnalysis);
  const photos = (intake.photos || []).slice(0, 3); // limit to 3 photos

  // Vision-capable models
  const visionModels = ['claude', 'gpt-4', 'gemini', 'llava', 'vision'];
  const isVision = visionModels.some(v => model.toLowerCase().includes(v));

  if (isVision && photos.length > 0) {
    const content = [
      { type: 'text', text: textPrompt },
      ...photos.map(p => ({
        type: 'image_url',
        image_url: { url: p.dataUrl, detail: 'low' }
      }))
    ];
    return [{ role: 'user', content }];
  }

  return [{ role: 'user', content: textPrompt }];
}

function parseResponse(text) {
  // Extract JSON from potential markdown code blocks
  let json = text.trim();
  const codeBlock = json.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (codeBlock) json = codeBlock[1].trim();

  // Find JSON object boundaries
  const start = json.indexOf('{');
  const end = json.lastIndexOf('}');
  if (start !== -1 && end !== -1) json = json.slice(start, end + 1);

  const parsed = JSON.parse(json);

  // Validate required fields
  const required = ['object_type', 'recommended_generator', 'dimensions', 'confidence', 'assumptions', 'missing_info'];
  for (const field of required) {
    if (!(field in parsed)) throw new Error(`Missing field: ${field}`);
  }

  return parsed;
}

const openrouterProvider = {
  id: 'openrouter',
  label: 'AI Analysis (OpenRouter)',
  requiresNetwork: true,

  isAvailable() {
    if (!navigator.onLine) return false;
    // Key check is async; this sync check uses cached key
    return !!sessionStorage.getItem('or_key_cached');
  },

  async analyze(intake, answers, imageAnalysis = null) {
    const [apiKey, model] = await Promise.all([
      settingsStore.get('openrouterApiKey'),
      settingsStore.get('openrouterModel')
    ]);

    if (!apiKey) throw new Error('No OpenRouter API key configured');
    if (!navigator.onLine) throw new Error('Network unavailable');

    // Cache key availability for sync check
    sessionStorage.setItem('or_key_cached', '1');

    const messages = buildMessages(intake, answers, model || 'anthropic/claude-3-haiku', imageAnalysis);

    const resp = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Micas'
      },
      body: JSON.stringify({
        model: model || 'anthropic/claude-3-haiku',
        messages,
        max_tokens: 1500,
        temperature: 0.3,
      })
    });

    if (!resp.ok) {
      const err = await resp.text().catch(() => resp.statusText);
      throw new Error(`OpenRouter ${resp.status}: ${err}`);
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response from AI');

    const cadBrief = parseResponse(text);

    return {
      cadBrief,
      confidence: cadBrief.confidence ?? 70,
      assumptions: cadBrief.assumptions ?? [],
      missingInfo: cadBrief.missing_info ?? [],
      reasoning: cadBrief.reasoning ?? '',
      provider: 'openrouter'
    };
  }
};

export default openrouterProvider;
