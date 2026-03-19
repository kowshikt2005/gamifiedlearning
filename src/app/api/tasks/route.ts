import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { GamificationService } from '@/lib/services/gamification-service';
import { getUserIdFromRequest } from '@/lib/jwt-utils';

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const taskData = await request.json();

    const db = await getDatabase();
    const tasks = db.collection('tasks');

    const newTask = {
      userId,
      sessionId: taskData.sessionId || `session_${Date.now()}`,
      title: taskData.title,
      pdfUrl: taskData.pdfUrl,
      pdfContent: taskData.pdfContent,
      pdfData: taskData.pdfData,
      status: 'pending',
      studyTime: 0,
      pointsEarned: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await tasks.insertOne(newTask);

    return NextResponse.json({
      success: true,
      taskId: result.insertedId,
      sessionId: newTask.sessionId
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { sessionId, status, studyTime, pointsEarned } = await request.json();

    const db = await getDatabase();
    const tasks = db.collection('tasks');

    const updateData: {
      updatedAt: Date;
      status?: string;
      studyTime?: number;
      pointsEarned?: number;
      completedAt?: Date;
    } = {
      updatedAt: new Date()
    };

    if (status) updateData.status = status;
    if (studyTime !== undefined) updateData.studyTime = studyTime;
    if (pointsEarned !== undefined) updateData.pointsEarned = pointsEarned;
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    await tasks.updateOne(
      { userId, sessionId },
      { $set: updateData }
    );

    // Update user progress if task is completed
    if (status === 'completed' && pointsEarned > 0) {
      await GamificationService.updateUserProgress(
        userId, 
        pointsEarned, 
        studyTime || 0
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update task error:', error);
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
    const tasks = db.collection('tasks');

    if (sessionId) {
      // Get specific task by session ID
      const task = await tasks.findOne({ userId, sessionId });
      return NextResponse.json({ task });
    } else {
      // Get all tasks for user
      const userTasks = await tasks
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json({ tasks: userTasks });
    }
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}