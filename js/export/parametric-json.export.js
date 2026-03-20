/**
 * Parametric JSON export.
 * Machine-readable design spec that can be re-imported to regenerate the part.
 */

export function generateParametricJSON(brief, generatorId, params, metadata) {
  const spec = {
    _schema: 'my-personal-cad-v2',
    _version: '2.0.0',
    _generated: new Date().toISOString(),
    generator: {
      id: generatorId,
      params: params
    },
    brief: brief,
    metadata: {
      ...metadata,
      // Don't export the large mesh object
      bounds: metadata?.bounds,
      dimensions: metadata?.dimensions,
      volume: metadata?.volume,
      estimatedMass: metadata?.estimatedMass,
      triangleCount: metadata?.triangleCount,
    }
  };

  return JSON.stringify(spec, null, 2);
}

/**
 * Parse a parametric JSON file back into generator params.
 * @returns {{ generatorId, params, brief }}
 */
export function parseParametricJSON(jsonString) {
  const spec = JSON.parse(jsonString);
  if (spec._schema !== 'my-personal-cad-v2') {
    throw new Error('Not a My Personal CAD v2 parametric JSON file');
  }
  return {
    generatorId: spec.generator.id,
    params: spec.generator.params,
    brief: spec.brief
  };
}
