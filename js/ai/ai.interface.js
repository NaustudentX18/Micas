/**
 * AI Provider Interface — JSDoc contract.
 * Every provider must implement this shape.
 *
 * @typedef {Object} IntakeData
 * @property {Array<{dataUrl:string, name:string}>} photos
 * @property {string} description
 * @property {Object} measurements - { width?, depth?, height?, ... }
 *
 * @typedef {Object} QuestionAnswer
 * @property {string} questionId
 * @property {*}      value
 *
 * @typedef {Object} CADDimensions
 * @property {number} [width]
 * @property {number} [depth]
 * @property {number} [height]
 * @property {number} [wallThickness]
 * @property {number} [tolerance]
 *
 * @typedef {Object} CADBrief
 * @property {string}       object_type
 * @property {string}       recommended_generator
 * @property {CADDimensions} dimensions
 * @property {string[]}     features
 * @property {string[]}     constraints
 * @property {Object}       tolerances
 * @property {string}       material_recommendation
 * @property {Object}       print_strategy
 * @property {number}       confidence           - 0-100
 * @property {string[]}     assumptions
 * @property {string[]}     missing_info
 *
 * @typedef {Object} AnalysisResult
 * @property {CADBrief}  cadBrief
 * @property {number}    confidence           - 0-100
 * @property {string[]}  assumptions
 * @property {string[]}  missingInfo
 * @property {string}    reasoning            - "Why this design?" paragraph
 * @property {string}    provider             - provider id that answered
 *
 * @typedef {Object} AIProvider
 * @property {string}   id
 * @property {string}   label
 * @property {boolean}  requiresNetwork
 * @property {function(): boolean}                                       isAvailable
 * @property {function(IntakeData, QuestionAnswer[]): Promise<AnalysisResult>} analyze
 */

export {};
