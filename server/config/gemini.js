/**
 * Mock Gemini client
 * Will be replaced with Google Generative AI SDK in Phase 5
 */

/**
 * Generate text using Gemini
 * @param {string} prompt - The prompt to generate text for
 * @returns {Promise<string>} Generated text
 */
export const generateText = async (prompt) => {
  console.log(`[Gemini Mock] generateText called with prompt length: ${prompt.length}`);
  return "This is a mock Gemini response. Real integration will happen in Phase 5.";
};

/**
 * Generate embeddings using Gemini
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<number[]>} Array of embedding numbers
 */
export const generateEmbedding = async (text) => {
  console.log(`[Gemini Mock] generateEmbedding called with text length: ${text.length}`);
  // Return a mock embedding array of length 768
  return Array(768).fill(0).map(() => Math.random());
};

export default {
  generateText,
  generateEmbedding,
};
