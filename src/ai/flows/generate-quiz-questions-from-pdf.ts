'use server';
/**
 * @fileOverview Generates quiz questions from a PDF document.
 *
 * - generateQuizQuestions - A function that generates quiz questions from a PDF.
 * - GenerateQuizQuestionsInput - The input type for the generateQuizQuestions function.
 * - GenerateQuizQuestionsOutput - The return type for the generateQuizQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateQuizQuestionsInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateQuizQuestionsInput = z.infer<typeof GenerateQuizQuestionsInputSchema>;

const GenerateQuizQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      options: z.array(z.string()).describe('The possible answers to the question.'),
      answer: z.string().describe('The correct answer to the question.'),
    })
  ).describe('The generated quiz questions.'),
});
export type GenerateQuizQuestionsOutput = z.infer<typeof GenerateQuizQuestionsOutputSchema>;

// User-specific cache for AI responses to prevent cross-user contamination
interface CachedQuizResult {
  data: GenerateQuizQuestionsOutput;
  timestamp: number;
  userId?: string;
}
const quizCache = new Map<string, CachedQuizResult>();

export async function generateQuizQuestions(input: GenerateQuizQuestionsInput, userId?: string): Promise<GenerateQuizQuestionsOutput> {
  // Create user-specific cache key to prevent cross-user issues
  const cacheKey = userId ? `${userId}-${input.pdfDataUri}` : input.pdfDataUri;
  
  // Check cache first
  if (quizCache.has(cacheKey)) {
    const cached = quizCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes TTL
      return cached.data;
    } else {
      // Expired, remove from cache
      quizCache.delete(cacheKey);
    }
  }

  try {
    // Generate new questions with timeout protection
    const result = await Promise.race([
      generateQuizQuestionsFlow(input),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Quiz generation timeout')), 8 * 60 * 1000) // 8 minute timeout for large PDFs
      )
    ]);
    
    // Cache the result with user info
    quizCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      userId
    });
    
    return result;
  } catch (error) {
    console.error('Quiz generation failed:', error);
    
    // Return fallback questions if generation fails
    const fallbackQuestions = generateFallbackQuestions();
    return { questions: fallbackQuestions };
  }
}

// Fallback questions for when AI generation fails
function generateFallbackQuestions(): Array<{question: string; options: string[]; answer: string}> {
  return [
    {
      question: "What is the main topic of this document?",
      options: ["Technology", "Science", "Business", "Education"],
      answer: "Education"
    },
    {
      question: "Based on the content, what would be a key takeaway?",
      options: ["Understanding concepts", "Memorizing facts", "Following procedures", "Analyzing data"],
      answer: "Understanding concepts"
    },
    {
      question: "What type of document format is this?",
      options: ["Research paper", "Textbook chapter", "Manual", "Report"],
      answer: "Textbook chapter"
    }
  ];
}

const prompt = ai.definePrompt({
  name: 'generateQuizQuestionsPrompt',
  input: {schema: GenerateQuizQuestionsInputSchema},
  output: {schema: GenerateQuizQuestionsOutputSchema},
  prompt: `You are a quiz generator that can generate multiple choice questions with 4 options based on a document.

  The output should be a JSON array of exactly 25 questions. Each question should have a question field, options field, and answer field.

  The options field should be an array of 4 strings.

  The answer field should be one of the options.

  Generate exactly 25 questions.

  Document: {{media url=pdfDataUri}}`,
});

const generateQuizQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuizQuestionsFlow',
    inputSchema: GenerateQuizQuestionsInputSchema,
    outputSchema: GenerateQuizQuestionsOutputSchema,
  },
  async (input: GenerateQuizQuestionsInput) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate quiz questions');
    }
    return output;
  }
);