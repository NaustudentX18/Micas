/**
 * Vision pre-analyzer.
 * Analyzes reference photos before the main CAD analysis to extract
 * shape, dimension, and feature information. Works with Gemini and OpenRouter.
 */

import settingsStore from '../db/settings.store.js';

const GEMINI_VISION_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const VISION_PROMPT = `You are a mechanical engineer analyzing reference images to extract design information for a 3D-printable part.

First, determine what kind of image this is:
- TYPE A: Photo of a physical object (real product, existing part, object to replicate or mount)
- TYPE B: 2D reference image (screenshot, diagram, sketch, blueprint, CAD render, product listing image, drawing)

Then extract all available design information based on the type:

FOR TYPE A (physical object photo):
1. SHAPE & GEOMETRY: Overall form, cross-sections, symmetry
2. DIMENSIONS: Estimate from visible scale cues — hands (~80mm wide), coins, credit cards (85×54mm), common objects, rulers if present. Give mm estimates with confidence ("~40mm wide, medium confidence — estimated from hand in frame")
3. SURFACE FEATURES: Holes, threads, slots, ribs, bosses, flanges, chamfers, fillets, snap tabs
4. MATING INTERFACES: How the part connects — bolt holes, friction fit, snap, thread, adhesive
5. MATERIAL CONTEXT: What the existing part is made of (guides material recommendation)

FOR TYPE B (2D reference / screenshot / diagram):
1. PROFILE & OUTLINE: Describe the 2D shape, profile, and key outlines visible
2. ANNOTATED DIMENSIONS: Extract any numbers, dimensions, labels visible in the image
3. FEATURES SHOWN: Holes, cutouts, slots, curves, straight edges — and their approximate positions
4. SCALE INFERENCE: Use any grid lines, text size, UI elements, or relative sizing to estimate real-world scale
5. DESIGN INTENT: What function does this part serve based on the diagram/screenshot?
6. FORM FACTOR: Is this a flat part, an extrusion, a revolution (axially symmetric), or a complex 3D shape?

FOR ALL IMAGES:
- Be specific and quantitative. "~50mm wide" beats "medium sized"
- State your confidence: "high confidence — ruler visible" or "low confidence — no scale reference"
- Describe what you CANNOT determine as clearly as what you can
- If a screenshot shows a product page, extract model numbers, stated dimensions, and listed specs

Output: 3–6 clear paragraphs. No JSON. Write as if briefing an engineer who cannot see the images.`;

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
