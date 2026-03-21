/**
 * Groq Provider — Free AI via Groq's fast inference API
 * Model: llama-3.1-70b-versatile (free tier: 30 req/min, 6000 tokens/min)
 * Users can add their own Groq API key in Settings to remove rate limits.
 * Falls back to the app's own proxy endpoint when no personal key is set.
 */
import { buildAnalysisPrompt } from './prompt.builder.js';
import settingsStore from '../db/settings.store.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-70b-versatile';
// Proxy endpoint — a Cloudflare Worker that holds the app's own Groq key
// Set to empty string to disable proxy and require a personal key
const PROXY_ENDPOINT = '/api/ai-proxy';

const groqProvider = {
  id: 'groq',
  label: 'Groq (Free — Llama 3.1 70B)',
  requiresNetwork: true,

  async _getKey() {
    return await settingsStore.get('groqApiKey') || null;
  },

  isAvailable() {
    return navigator.onLine;
  },

  async analyze(intake, answers) {
    const key = await this._getKey();
    const prompt = buildAnalysisPrompt(intake, answers);

    const messages = [
      {
        role: 'system',
        content: 'You are a professional mechanical engineer and FDM 3D printing expert. Analyze design requirements and return a structured JSON CAD brief. Always respond with valid JSON only — no markdown, no explanation text outside the JSON block.'
      },
      {
        role: 'user',
        content: prompt.text
      }
    ];

    let endpoint = GROQ_ENDPOINT;
    let headers = { 'Content-Type': 'application/json' };

    if (key) {
      // Personal key — call Groq directly
      headers['Authorization'] = `Bearer ${key}`;
    } else if (PROXY_ENDPOINT) {
      // No personal key — use the app's proxy
      endpoint = PROXY_ENDPOINT;
      headers['X-Provider'] = 'groq';
    } else {
      throw new Error('No Groq API key configured and no proxy available');
    }

    const body = {
      model: GROQ_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 1800,
      response_format: { type: 'json_object' }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(key ? body : { ...body, provider: 'groq' })
    });

    if (res.status === 429) {
      throw new Error('Groq rate limit reached — try again in a minute, or add your own Groq API key in Settings');
    }
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`Groq API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from Groq');

    return this._parseResult(content);
  },

  _parseResult(raw) {
    let obj;
    try {
      // Groq with json_object mode returns clean JSON
      obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      // Fallback: extract from code block if wrapped
      const match = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
      if (match) obj = JSON.parse(match[1].trim());
      else obj = JSON.parse(raw.slice(raw.indexOf('{')));
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
      confidence:   Math.min(Math.max(brief.confidence ?? obj.confidence ?? 82, 0), 100),
      assumptions:  brief.assumptions || obj.assumptions || [],
      missingInfo:  brief.missing_info || brief.missingInfo || obj.missing_info || [],
      reasoning:    brief.reasoning || obj.reasoning || ''
    };
  }
};

export default groqProvider;
