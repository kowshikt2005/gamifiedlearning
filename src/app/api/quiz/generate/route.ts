import { NextRequest, NextResponse } from 'next/server';
import { generateQuizQuestions } from '@/ai/flows/generate-quiz-questions-from-pdf';
import { AuthService } from '@/lib/services/auth-service';

// Configure for AI processing
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for AI processing

export async function POST(request: NextRequest) {
  try {
    // Get user ID from auth token
    let userId: string | undefined;
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = AuthService.verifyToken(token);
        userId = payload?.userId;
      }
    } catch (authError) {
      console.warn('Auth token invalid for quiz generation:', authError);
      // Continue without user ID - will use generic cache
    }

    const { pdfDataUri } = await request.json();

    if (!pdfDataUri) {
      return NextResponse.json(
        { error: 'PDF data URI is required' },
        { status: 400 }
      );
    }

    // Validate PDF data URI format
    if (!pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return NextResponse.json(
        { error: 'Invalid PDF data URI format' },
        { status: 400 }
      );
    }

    // Generating quiz questions for user

    // Generate quiz questions with user-specific caching
    const result = await generateQuizQuestions({ pdfDataUri }, userId);

    return NextResponse.json({
      success: true,
      questions: result.questions,
      cached: false // Could be enhanced to return cache status
    });

  } catch (error) {
    console.error('Quiz generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Quiz generation timed out. The PDF might be too complex or large.',
            fallback: true
          },
          { status: 408 }
        );
      }
      
      if (error.message.includes('Invalid PDF') || error.message.includes('parsing')) {
        return NextResponse.json(
          { 
            error: 'Could not parse PDF content. Please ensure the PDF contains readable text.',
            fallback: true
          },
          { status: 400 }
        );
      }
    }

    // Return fallback response for any other errors
    return NextResponse.json(
      { 
        error: 'Quiz generation failed. Using fallback questions.',
        fallback: true,
        questions: [
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
        ]
      },
      { status: 200 } // Return 200 with fallback questions
    );
  }
}