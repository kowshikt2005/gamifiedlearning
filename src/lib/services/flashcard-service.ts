/**
 * Flashcard Service
 * 
 * This service handles flashcard database operations including
 * saving, retrieving, and managing flashcard data.
 */

import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { 
  SavedFlashcard, 
  CardAction, 
  FlashcardFilters,
  sanitizeFlashcardData,
  sanitizeFlashcardFilters
} from '@/lib/models/flashcard';

export class FlashcardService {
  private static readonly COLLECTION_NAME = 'saved_flashcards';

  /**
   * Save flashcards to the database
   */
  static async saveFlashcards(
    userId: string,
    flashcards: Array<{
      question: string;
      answer: string;
      pageNumber?: number;
      sourceText?: string;
      status: CardAction;
    }>,
    taskId: string,
    pdfTitle: string
  ): Promise<{ success: boolean; savedCount: number; error?: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<SavedFlashcard>(this.COLLECTION_NAME);

      const flashcardsToSave: Omit<SavedFlashcard, '_id'>[] = flashcards.map(card => {
        // Sanitize and validate each flashcard
        const sanitizedCard = sanitizeFlashcardData({
          userId: new ObjectId(userId),
          taskId,
          pdfTitle,
          question: card.question,
          answer: card.answer,
          pageNumber: card.pageNumber,
          sourceText: card.sourceText,
          status: card.status,
          createdAt: new Date(),
          reviewCount: 0,
        });
        
        // Remove _id for insertion
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...cardWithoutId } = sanitizedCard;
        return cardWithoutId as Omit<SavedFlashcard, '_id'>;
      });

      const result = await collection.insertMany(flashcardsToSave);

      return {
        success: true,
        savedCount: result.insertedCount,
      };
    } catch (error) {
      console.error('Error saving flashcards:', error);
      return {
        success: false,
        savedCount: 0,
        error: 'Failed to save flashcards. Please try again.',
      };
    }
  }

  /**
   * Retrieve saved flashcards for a user
   */
  static async getFlashcards(
    userId: string,
    filters: FlashcardFilters = {}
  ): Promise<{ success: boolean; flashcards: SavedFlashcard[]; totalCount: number; error?: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<SavedFlashcard>(this.COLLECTION_NAME);

      // Sanitize and validate filters
      const sanitizedFilters = sanitizeFlashcardFilters(filters);

      // Build query
      const query: any = { userId: new ObjectId(userId) };

      if (sanitizedFilters.taskId) {
        query.taskId = sanitizedFilters.taskId;
      }

      if (sanitizedFilters.status) {
        query.status = sanitizedFilters.status;
      }

      // Build aggregation pipeline for search
      const pipeline: any[] = [{ $match: query }];

      if (sanitizedFilters.search) {
        pipeline.push({
          $match: {
            $or: [
              { question: { $regex: sanitizedFilters.search, $options: 'i' } },
              { answer: { $regex: sanitizedFilters.search, $options: 'i' } },
              { sourceText: { $regex: sanitizedFilters.search, $options: 'i' } },
            ],
          },
        });
      }

      // Sort by creation date (newest first)
      pipeline.push({ $sort: { createdAt: -1 } });

      // Get total count
      const totalCountPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await collection.aggregate(totalCountPipeline).toArray();
      const totalCount = countResult.length > 0 ? countResult[0].total : 0;

      // Apply pagination
      if (sanitizedFilters.offset) {
        pipeline.push({ $skip: sanitizedFilters.offset });
      }

      if (sanitizedFilters.limit) {
        pipeline.push({ $limit: sanitizedFilters.limit });
      }

      const flashcards = await collection.aggregate(pipeline).toArray() as SavedFlashcard[];

      return {
        success: true,
        flashcards,
        totalCount,
      };
    } catch (error) {
      console.error('Error retrieving flashcards:', error);
      return {
        success: false,
        flashcards: [],
        totalCount: 0,
        error: 'Failed to retrieve flashcards. Please try again.',
      };
    }
  }

  /**
   * Update flashcard status
   */
  static async updateFlashcardStatus(
    userId: string,
    flashcardId: string,
    status: CardAction
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<SavedFlashcard>(this.COLLECTION_NAME);

      const result = await collection.updateOne(
        { 
          _id: new ObjectId(flashcardId),
          userId: new ObjectId(userId)
        },
        { 
          $set: { 
            status,
            lastReviewed: new Date()
          },
          $inc: { reviewCount: 1 }
        }
      );

      if (result.matchedCount === 0) {
        return {
          success: false,
          error: 'Flashcard not found or access denied.',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating flashcard status:', error);
      return {
        success: false,
        error: 'Failed to update flashcard status. Please try again.',
      };
    }
  }

  /**
   * Delete flashcards
   */
  static async deleteFlashcards(
    userId: string,
    flashcardIds: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<SavedFlashcard>(this.COLLECTION_NAME);

      const objectIds = flashcardIds.map(id => new ObjectId(id));

      const result = await collection.deleteMany({
        _id: { $in: objectIds },
        userId: new ObjectId(userId)
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error('Error deleting flashcards:', error);
      return {
        success: false,
        deletedCount: 0,
        error: 'Failed to delete flashcards. Please try again.',
      };
    }
  }

  /**
   * Get flashcard statistics for a user
   */
  static async getFlashcardStats(
    userId: string,
    taskId?: string
  ): Promise<{ 
    success: boolean; 
    stats: {
      total: number;
      saved: number;
      known: number;
      review: number;
      totalReviews: number;
      averageReviews: number;
    };
    error?: string;
  }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<SavedFlashcard>(this.COLLECTION_NAME);

      const query: any = { userId: new ObjectId(userId) };
      if (taskId) {
        query.taskId = taskId;
      }

      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            saved: {
              $sum: { $cond: [{ $eq: ['$status', 'saved'] }, 1, 0] }
            },
            known: {
              $sum: { $cond: [{ $eq: ['$status', 'known'] }, 1, 0] }
            },
            review: {
              $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] }
            },
            totalReviews: { $sum: '$reviewCount' },
          }
        },
        {
          $project: {
            _id: 0,
            total: 1,
            saved: 1,
            known: 1,
            review: 1,
            totalReviews: 1,
            averageReviews: {
              $cond: [
                { $gt: ['$total', 0] },
                { $round: [{ $divide: ['$totalReviews', '$total'] }, 1] },
                0
              ]
            }
          }
        }
      ];

      const result = await collection.aggregate(pipeline).toArray();
      const stats = result.length > 0 ? result[0] as any : {
        total: 0,
        saved: 0,
        known: 0,
        review: 0,
        totalReviews: 0,
        averageReviews: 0,
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Error getting flashcard stats:', error);
      return {
        success: false,
        stats: {
          total: 0,
          saved: 0,
          known: 0,
          review: 0,
          totalReviews: 0,
          averageReviews: 0,
        },
        error: 'Failed to retrieve flashcard statistics.',
      };
    }
  }

  /**
   * Get flashcards due for review (based on spaced repetition logic)
   */
  static async getFlashcardsForReview(
    userId: string,
    limit: number = 20
  ): Promise<{ success: boolean; flashcards: SavedFlashcard[]; error?: string }> {
    try {
      const db = await getDatabase();
      const collection = db.collection<SavedFlashcard>(this.COLLECTION_NAME);

      // Simple spaced repetition: cards marked for review or not reviewed in 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const flashcards = await collection
        .find({
          userId: new ObjectId(userId),
          $or: [
            { status: 'review' },
            { 
              status: 'saved',
              $or: [
                { lastReviewed: { $exists: false } },
                { lastReviewed: { $lt: oneDayAgo } }
              ]
            }
          ]
        })
        .sort({ lastReviewed: 1, createdAt: 1 }) // Oldest reviewed first
        .limit(limit)
        .toArray();

      return {
        success: true,
        flashcards,
      };
    } catch (error) {
      console.error('Error getting flashcards for review:', error);
      return {
        success: false,
        flashcards: [],
        error: 'Failed to retrieve flashcards for review.',
      };
    }
  }
}