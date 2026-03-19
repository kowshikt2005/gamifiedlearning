import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { GamificationService } from '@/lib/services/gamification-service';
import { getUserIdFromRequest } from '@/lib/jwt-utils';
import { QuizAnswer } from '@/lib/database-utils';

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const quizData = await request.json();

    const db = await getDatabase();
    const quizzes = db.collection('quiz');

    const newQuiz = {
      sessionId: quizData.sessionId,
      userId,
      questions: quizData.questions,
      totalQuestions: quizData.questions.length,
      completed: false,
      createdAt: new Date()
    };

    const result = await quizzes.insertOne(newQuiz);

    return NextResponse.json({
      success: true,
      quizId: result.insertedId,
      quiz: newQuiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { sessionId, answers, timeSpent } = await request.json();

    const db = await getDatabase();
    const quizzes = db.collection('quiz');

    // Get the quiz
    const quiz = await quizzes.findOne({ sessionId, userId });
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Calculate score
    let correctAnswers = 0;
    const processedAnswers = answers.map((answer: QuizAnswer, index: number) => {
      const isCorrect = answer.selectedAnswer === quiz.questions[index].correctAnswer;
      if (isCorrect) correctAnswers++;
      
      return {
        questionIndex: index,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        timeSpent: answer.timeSpent || 0
      };
    });

    const score = (correctAnswers / quiz.totalQuestions) * 100;
    
    // Calculate points based on score
    let pointsEarned = 0;
    if (score >= 90) pointsEarned = 100;
    else if (score >= 80) pointsEarned = 80;
    else if (score >= 70) pointsEarned = 60;
    else if (score >= 60) pointsEarned = 40;
    else pointsEarned = 20;

    // Update quiz with results
    await quizzes.updateOne(
      { sessionId, userId },
      {
        $set: {
          answers: processedAnswers,
          score,
          correctAnswers,
          timeSpent: timeSpent || 0,
          pointsEarned,
          completed: true,
          completedAt: new Date()
        }
      }
    );

    // Update user progress
    await GamificationService.updateUserProgress(
      userId, 
      pointsEarned, 
      0, // No additional study time for quiz completion
      score
    );

    return NextResponse.json({
      success: true,
      score,
      correctAnswers,
      totalQuestions: quiz.totalQuestions,
      pointsEarned
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    const db = await getDatabase();
    const quizzes = db.collection('quiz');

    if (sessionId) {
      // Get specific quiz by session ID
      const quiz = await quizzes.findOne({ sessionId, userId });
      return NextResponse.json({ quiz });
    } else {
      // Get all quizzes for user
      const userQuizzes = await quizzes
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json({ quizzes: userQuizzes });
    }
  } catch (error) {
    console.error('Get quiz error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}