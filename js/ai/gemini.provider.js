/**
 * Google Gemini Flash Provider — Free AI with vision support
 * Model: gemini-1.5-flash (free: 60 req/min, 1M token context, multimodal)
 * Users get a free API key from: https://aistudio.google.com/app/apikey
 * No credit card required. Key is stored locally only.
 */
import { buildAnalysisPrompt } from './prompt.builder.js';
import settingsStore from '../db/settings.store.js';

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const geminiProvider = {
  id: 'gemini',
  label: 'Google Gemini Flash (Free)',
  requiresNetwork: true,

  async _getKey() {
    return await settingsStore.get('geminiApiKey') || null;
  },

  isAvailable() {
    return navigator.onLine;
  },

  async analyze(intake, answers) {
    const key = await this._getKey();
    if (!key) {
      throw new Error('Google Gemini API key not set — get a free key at aistudio.google.com');
    }

    const prompt = buildAnalysisPrompt(intake, answers);

    // Build multimodal content parts
    const parts = [
      {
        text: `You are a professional mechanical engineer and FDM 3D printing expert.\n\nAnalyze these design requirements and respond with ONLY a valid JSON object.\n\n${prompt.text}\n\nRespond ONLY with JSON. No markdown. No explanation. The JSON must include: object_type, recommended_generator, material, fit_tolerance, dimensions (with width/depth/height in mm), confidence (0-100 integer), assumptions (string array), missing_info (string array), reasoning (string).`
      }
    ];

    // Add photos as inline image parts (Gemini supports up to 16 images)
    if (prompt.images?.length) {
      for (const img of prompt.images.slice(0, 4)) {
        // dataUrl format: "data:image/jpeg;base64,..."
        const [meta, b64] = img.split(',');
        const mimeType = meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
        parts.push({ inlineData: { mimeType, data: b64 } });
      }
    }

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json'
        }
      })
    });

    if (res.status === 429) {
      throw new Error('Gemini rate limit reached — wait 60 seconds and try again');
    }
    if (res.status === 400) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gemini request error: ${err.error?.message || 'invalid request'}`);
    }
    if (!res.ok) {
      throw new Error(`Gemini API error ${res.status}`);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty response from Gemini');

    return this._parseResult(content);
  },

  _parseResult(raw) {
    let obj;
    try {
      // Gemini with responseMimeType json usually returns clean JSON
      obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      // Strip markdown if present
      const match = raw.match(/```(?:json)?\s*([\s\S]+?)```/) || raw.match(/(\{[\s\S]+\})/);
      if (match) obj = JSON.parse(match[1].trim());
      else throw new Error('Could not parse Gemini response as JSON');
    }

    const brief = obj.cad_brief || obj.cadBrief || obj;

    return {
      cadBrief: {
        object_type:           brief.object_type || brief.objectType || 'custom part',
        recommended_generator: brief.recommended_generator || brief.recommendedGenerator || 'box',
        material:              brief.material || 'PLA',
        fit_tolerance:         brief.fit_tolerance || brief.fitTolerance || 'standard',
        dimensions:            brief.dimensions || {},
        special_features:      brief.special_features || brief.specialFeatures || [],
        print_settings:        brief.print_settings || brief.printSettings || {},
        reasoning:             brief.reasoning || ''
      },
      confidence:   Math.min(Math.max(brief.confidence ?? obj.confidence ?? 83, 0), 100),
      assumptions:  brief.assumptions || obj.assumptions || [],
      missingInfo:  brief.missing_info || brief.missingInfo || obj.missing_info || [],
      reasoning:    brief.reasoning || obj.reasoning || ''
    };
  }
};

export default geminiProvider;
