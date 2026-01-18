/**
 * Service Claude API
 * Fonctions utilitaires pour appeler l'API Anthropic
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Appelle l'API Claude avec un prompt système et utilisateur
 * @param {string} systemPrompt - Le prompt système
 * @param {string} userPrompt - Le prompt utilisateur
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<string>} - La réponse de Claude
 */
export async function callClaude(systemPrompt, userPrompt, options = {}) {
  const {
    model = 'claude-3-haiku-20240307',
    max_tokens = 1000,
    temperature = 0.7,
  } = options;

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    return message.content[0].text;
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

/**
 * Parse une réponse JSON de Claude
 * Gère les cas où Claude ajoute du texte autour du JSON
 * @param {string} response - La réponse de Claude
 * @returns {Object|null} - L'objet JSON parsé ou null
 */
export function parseClaudeJSON(response) {
  if (!response) return null;

  try {
    // Essayer de parser directement
    return JSON.parse(response);
  } catch {
    // Chercher un bloc JSON dans la réponse
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        console.error('Failed to parse JSON from Claude response');
        return null;
      }
    }

    // Chercher un bloc de code JSON
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        console.error('Failed to parse JSON from code block');
        return null;
      }
    }

    return null;
  }
}

/**
 * Génère un message avec streaming
 * @param {string} systemPrompt - Le prompt système
 * @param {string} userPrompt - Le prompt utilisateur
 * @param {Function} onToken - Callback appelé pour chaque token
 * @returns {Promise<string>} - Le message complet
 */
export async function streamClaude(systemPrompt, userPrompt, onToken, options = {}) {
  const {
    model = 'claude-3-haiku-20240307',
    max_tokens = 1000,
    temperature = 0.7,
  } = options;

  let fullResponse = '';

  try {
    const stream = await anthropic.messages.stream({
      model,
      max_tokens,
      temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const text = event.delta.text;
        fullResponse += text;
        if (onToken) {
          onToken(text);
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error('Claude streaming error:', error);
    throw error;
  }
}

export default {
  callClaude,
  parseClaudeJSON,
  streamClaude,
};
