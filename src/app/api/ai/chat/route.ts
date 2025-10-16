import { NextRequest, NextResponse } from 'next/server';
import { aiChatbotAssistance } from '@/ai/flows/ai-chatbot-assistance';
import { AuthService } from '@/lib/services/auth-service';

// Configure for AI processing
export const runtime = 'nodejs';
export const maxDuration = 240; // 4 minutes for complex chat responses with large documents

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
      console.warn('Auth token invalid for chat:', authError);
      // Continue without user ID - will use generic cache
    }

    const { pdfDataUri, question } = await request.json();

    if (!pdfDataUri || !question) {
      return NextResponse.json(
        { error: 'PDF data URI and question are required' },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return NextResponse.json(
        { error: 'Invalid PDF data URI format' },
        { status: 400 }
      );
    }

    if (question.length > 1000) {
      return NextResponse.json(
        { error: 'Question too long. Please keep it under 1000 characters.' },
        { status: 400 }
      );
    }

    // Processing chat question for user

    // Generate AI response with user-specific caching
    const result = await aiChatbotAssistance({ pdfDataUri, question }, userId);

    return NextResponse.json({
      success: true,
      answer: result.answer
    });

  } catch (error) {
    console.error('AI chat error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Response timed out. Please try a simpler question or check your connection.',
            answer: "I'm sorry, I'm taking too long to respond. Please try rephrasing your question or asking about a specific topic from the document."
          },
          { status: 200 } // Return 200 with fallback answer
        );
      }
      
      if (error.message.includes('Invalid PDF') || error.message.includes('parsing')) {
        return NextResponse.json(
          { 
            error: 'Could not analyze PDF content for your question.',
            answer: "I'm having trouble reading the document content. Please make sure the PDF loaded properly and try asking about general topics or concepts."
          },
          { status: 200 }
        );
      }
    }

    // Return fallback response for any other errors
    return NextResponse.json(
      { 
        error: 'AI chat temporarily unavailable.',
        answer: "I'm experiencing technical difficulties right now. Please try again in a moment, or ask a different question about the document."
      },
      { status: 200 } // Return 200 with fallback answer
    );
  }
}