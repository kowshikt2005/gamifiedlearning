'use server';

/**
 * @fileOverview An AI chatbot that can answer questions about the uploaded PDF.
 *
 * - aiChatbotAssistance - A function that handles the AI chatbot assistance process.
 * - aiChatbotAssistanceStream - A function that streams AI chatbot assistance process.
 * - AiChatbotAssistanceInput - The input type for the aiChatbotAssistance function.
 * - AiChatbotAssistanceOutput - The return type for the aiChatbotAssistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const AiChatbotAssistanceInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  question: z.string().describe('The student question about the PDF content.'),
});
export type AiChatbotAssistanceInput = z.infer<typeof AiChatbotAssistanceInputSchema>;

const AiChatbotAssistanceOutputSchema = z.object({
  answer: z.string().describe('The AI chatbot answer to the student question.'),
});
export type AiChatbotAssistanceOutput = z.infer<typeof AiChatbotAssistanceOutputSchema>;

// User-specific cache for AI responses to prevent cross-user contamination
const chatCache = new Map<string, {data: AiChatbotAssistanceOutput, timestamp: number, userId?: string}>();

export async function aiChatbotAssistance(input: AiChatbotAssistanceInput, userId?: string): Promise<AiChatbotAssistanceOutput> {
  // Create user-specific cache key to prevent cross-user issues
  const cacheKey = userId ? `${userId}-${input.pdfDataUri}-${input.question}` : `${input.pdfDataUri}-${input.question}`;
  
  // Check cache first
  if (chatCache.has(cacheKey)) {
    const cached = chatCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes TTL
      return cached.data;
    } else {
      // Expired, remove from cache
      chatCache.delete(cacheKey);
    }
  }

  try {
    // Generate new response with timeout protection
    const result = await Promise.race([
      aiChatbotAssistanceFlow(input),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Chat response timeout')), 4 * 60 * 1000) // 4 minute timeout for complex queries
      )
    ]);
    
    // Cache the result with user info
    chatCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      userId
    });
    
    return result;
  } catch (error) {
    console.error('Chat assistance failed:', error);
    
    // Return fallback response if AI fails
    return {
      answer: "I'm sorry, I'm having trouble processing your question right now. Please try rephrasing your question or check if the document loaded properly. You can also try asking about specific topics or concepts from the document."
    };
  }
}

// Streaming version of the AI chatbot assistance
export async function aiChatbotAssistanceStream(input: AiChatbotAssistanceInput, userId?: string) {
  try {
    // Use the main function which now has proper error handling
    const result = await aiChatbotAssistance(input, userId);
    
    // Return the response in chunks for streaming effect
    const answer = result.answer;
    const chunks = [];
    for (let i = 0; i < answer.length; i += 5) {
      chunks.push(answer.slice(i, i + 5));
    }
    return chunks;
  } catch (error) {
    console.error('Chat streaming failed:', error);
    
    // Return fallback chunks
    const fallbackMessage = "I'm experiencing technical difficulties. Please try again in a moment.";
    const chunks = [];
    for (let i = 0; i < fallbackMessage.length; i += 5) {
      chunks.push(fallbackMessage.slice(i, i + 5));
    }
    return chunks;
  }
}

const prompt = ai.definePrompt({
  name: 'aiChatbotAssistancePrompt',
  input: {schema: AiChatbotAssistanceInputSchema},
  output: {schema: AiChatbotAssistanceOutputSchema},
  prompt: `You are a helpful AI chatbot assisting students with their studies.
You have access to the text content of a PDF document and will answer student questions based on this content.

PDF Content: {{media url=pdfDataUri}}

Student Question: {{{question}}}

Answer:`,
});

const aiChatbotAssistanceFlow = ai.defineFlow(
  {
    name: 'aiChatbotAssistanceFlow',
    inputSchema: AiChatbotAssistanceInputSchema,
    outputSchema: AiChatbotAssistanceOutputSchema,
  },
  async (input: AiChatbotAssistanceInput) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate AI chatbot response');
    }
    return output;
  }
);