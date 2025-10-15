/**
 * Custom Authentication Service
 * 
 * This service handles user authentication without NextAuth,
 * using JWT tokens and MongoDB for user storage.
 */

import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// User interface
export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// JWT payload interface
interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export class AuthService {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET or NEXTAUTH_SECRET must be set in environment variables');
    }
    return secret;
  }

  private static getJwtExpiration(): string {
    return process.env.JWT_EXPIRATION || '7d';
  }

  /**
   * Hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token for a user
   */
  static generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user._id!.toString(),
      email: user.email,
      username: user.username
    };

    return jwt.sign(payload, this.getJwtSecret(), {
      expiresIn: this.getJwtExpiration(),
      issuer: 'gamified-learning-platform',
      audience: 'gamified-learning-users'
    } as jwt.SignOptions);
  }

  /**
   * Verify a JWT token
   */
  static verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.getJwtSecret(), {
        issuer: 'gamified-learning-platform',
        audience: 'gamified-learning-users'
      } as jwt.VerifyOptions) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Register a new user
   */
  static async register(username: string, email: string, password: string): Promise<{ user: User; token: string } | null> {
    const db = await getDatabase();
    const users = db.collection<User>('users');

    // Check if user already exists
    const existingUser = await users.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create new user
    const newUser: User = {
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users.insertOne(newUser);
    const userId = result.insertedId;
    
    // Add the ID to the user object
    const userWithId = { ...newUser, _id: userId };
    
    // Generate token
    const token = this.generateToken(userWithId);

    return { user: userWithId, token };
  }

  /**
   * Login a user
   */
  static async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
    const db = await getDatabase();
    const users = db.collection<User>('users');

    // Find user by email
    const user = await users.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user);

    return { user, token };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const db = await getDatabase();
    const users = db.collection<User>('users');

    try {
      const user = await users.findOne({ _id: new ObjectId(userId) });
      return user || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    const users = db.collection<User>('users');

    try {
      const user = await users.findOne({ email });
      return user || null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  /**
   * Update user information
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const db = await getDatabase();
    const users = db.collection<User>('users');

    try {
      const result = await users.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            ...updates,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return null;
      }

      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }
}