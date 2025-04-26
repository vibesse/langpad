import OpenAI from 'openai';
import { Models } from 'openai/resources/models.mjs';

let openaiClient: OpenAI | null = null;

/**
 * Validates an OpenAI API key by attempting to list models.
 * Throws an error if the key is invalid or the request fails.
 * @param apiKey The OpenAI API key to validate.
 * @returns {Promise<Models.Model[]>} A promise that resolves with the list of available models if the key is valid.
 */
export const validateOpenAiKey = async (apiKey: string): Promise<Models.Model[]> => {
  if (!apiKey) {
    throw new Error('API key is required.');
  }
  try {
    const tempClient = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true });
    const modelsResponse = await tempClient.models.list();
    openaiClient = tempClient;
    return modelsResponse.data;
  } catch (error) {
    openaiClient = null;
    throw error;
  }
};

/**
 * Returns the initialized OpenAI client instance.
 * Throws an error if the client hasn't been initialized yet (i.e., key not validated).
 * @returns {OpenAI} The OpenAI client instance.
 */
export const getOpenAiClient = (): OpenAI => {
  if (!openaiClient) {
    throw new Error('OpenAI client is not initialized. Please validate the API key first.');
  }
  return openaiClient;
};

/**
 * Creates chat completion with OpenAI models, with support for streaming responses.
 * @param params The parameters for generating chat completion
 * @param onChunk Optional callback for streaming responses, called with each chunk of text
 * @returns The generated response
 */
export const createChatCompletion = async (
  params: {
    model: string;
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: any[];
    }>;
    temperature?: number;
    stream?: boolean;
    // Add other parameters as needed
  },
  onChunk?: (chunk: string) => void,
) => {
  const client = getOpenAiClient();

  try {
    // If streaming is enabled and a callback is provided
    if (params.stream && onChunk) {
      const stream = await client.chat.completions.create({
        ...params,
        stream: true,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          onChunk(content);
        }
      }

      return { content: fullResponse };
    } else {
      // Regular non-streaming request
      const response = await client.chat.completions.create({
        ...params,
        stream: false,
      });

      return { content: response.choices[0]?.message?.content || '' };
    }
  } catch (error) {
    console.error('Error creating chat completion:', error);
    throw error;
  }
};
