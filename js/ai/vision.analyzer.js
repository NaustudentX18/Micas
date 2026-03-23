/**
 * Vision pre-analyzer.
 * Analyzes reference photos before the main CAD analysis to extract
 * shape, dimension, and feature information. Works with Gemini and OpenRouter.
 */

import settingsStore from '../db/settings.store.js';

const GEMINI_VISION_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const VISION_PROMPT = `You are analyzing reference photos to help design a 3D-printable part.

Examine these photos carefully and extract:
1. SHAPE & GEOMETRY: Describe the overall shape, cross-sections, and geometry
2. VISIBLE DIMENSIONS: Estimate dimensions from any visible references (hands, rulers, common objects)
3. SURFACE FEATURES: Holes, slots, threads, ribs, flanges, cutouts, tabs
4. CONNECTIONS: How the part connects/mates with other components
5. MATERIAL CLUES: Existing material (metal, plastic, rubber) to inform print material choice
6. SCALE CONTEXT: Any objects in the photo that give scale reference

Be specific and quantitative where possible. Say "approximately 50mm wide" not "medium sized".
Describe the part as if explaining it to an engineer who cannot see the photos.

Return a concise structured analysis. Do NOT include JSON — just clear paragraphs.`;

/**
 * Analyze photos using Gemini vision API.
 * Returns a text description of what's visible, or null on failure.
 */
export async function analyzePhotosWithGemini(photos) {
  const key = await settingsStore.get('geminiApiKey');
  if (!key || !photos?.length || !navigator.onLine) return null;

  try {
    const parts = [{ text: VISION_PROMPT }];
    for (const img of photos.slice(0, 4)) {
      const [meta, b64] = img.dataUrl.split(',');
      const mimeType = meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      parts.push({ inlineData: { mimeType, data: b64 } });
    }

    const res = await fetch(`${GEMINI_VISION_ENDPOINT}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 800 }
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Analyze photos using OpenRouter vision model.
 * Returns a text description, or null on failure.
 */
export async function analyzePhotosWithOpenRouter(photos) {
  const [key, model] = await Promise.all([
    settingsStore.get('openrouterApiKey'),
    settingsStore.get('openrouterModel')
  ]);

  const visionModels = ['claude', 'gpt-4', 'gemini', 'llava', 'vision'];
  const modelStr = model || '';
  const isVision = visionModels.some(v => modelStr.toLowerCase().includes(v));

  if (!key || !isVision || !photos?.length || !navigator.onLine) return null;

  try {
    const content = [
      { type: 'text', text: VISION_PROMPT },
      ...photos.slice(0, 3).map(p => ({
        type: 'image_url',
        image_url: { url: p.dataUrl, detail: 'high' }
      }))
    ];

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Micas'
      },
      body: JSON.stringify({
        model: modelStr,
        messages: [{ role: 'user', content }],
        max_tokens: 800,
        temperature: 0.1
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Run vision pre-analysis using the best available provider.
 * Returns { analysis: string | null, provider: string | null }
 */
export async function runVisionPreAnalysis(photos) {
  if (!photos?.length) return { analysis: null, provider: null };

  // Try Gemini first (always free)
  const geminiResult = await analyzePhotosWithGemini(photos);
  if (geminiResult) return { analysis: geminiResult, provider: 'gemini-vision' };

  // Try OpenRouter vision
  const orResult = await analyzePhotosWithOpenRouter(photos);
  if (orResult) return { analysis: orResult, provider: 'openrouter-vision' };

  return { analysis: null, provider: null };
}
