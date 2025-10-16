#!/usr/bin/env node

/**
 * Database Optimization Script
 * Adds indexes and optimizes collections for better performance
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function optimizeDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db();
    console.log('✅ Connected to database:', db.databaseName);

    // Optimize tasks collection
    console.log('\n📊 Optimizing tasks collection...');
    const tasksCollection = db.collection('tasks');
    
    // Add compound index for user queries
    await tasksCollection.createIndex(
      { userId: 1, status: 1, createdAt: -1 },
      { name: 'user_status_date_idx', background: true }
    );
    console.log('✅ Added compound index: userId + status + createdAt');

    // Add sessionId index for lookups
    try {
      await tasksCollection.createIndex(
        { sessionId: 1 },
        { name: 'session_id_idx', background: true }
      );
      console.log('✅ Added sessionId index');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ SessionId index already exists');
      } else {
        throw error;
      }
    }

    // Optimize quiz collection
    console.log('\n🧠 Optimizing quiz collection...');
    const quizCollection = db.collection('quiz');
    
    // Add sessionId index for joins
    try {
      await quizCollection.createIndex(
        { sessionId: 1 },
        { name: 'quiz_session_id_idx', background: true }
      );
      console.log('✅ Added quiz sessionId index');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Quiz sessionId index already exists');
      } else {
        throw error;
      }
    }

    // Optimize users collection
    console.log('\n👤 Optimizing users collection...');
    const usersCollection = db.collection('users');
    
    // Add email index (if not exists)
    try {
      await usersCollection.createIndex(
        { email: 1 },
        { name: 'email_idx', unique: true, background: true }
      );
      console.log('✅ Added unique email index');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Email index already exists');
      } else {
        throw error;
      }
    }

    // Add username index (if not exists)
    try {
      await usersCollection.createIndex(
        { username: 1 },
        { name: 'username_idx', unique: true, sparse: true, background: true }
      );
      console.log('✅ Added unique username index');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️ Username index already exists');
      } else {
        throw error;
      }
    }

    // Show collection stats
    console.log('\n📈 Collection Statistics:');
    
    const collections = ['tasks', 'quiz', 'users'];
    for (const collName of collections) {
      const coll = db.collection(collName);
      
      try {
        const count = await coll.countDocuments();
        const indexes = await coll.indexes();
        
        console.log(`\n${collName}:`);
        console.log(`  Documents: ${count.toLocaleString()}`);
        console.log(`  Indexes: ${indexes.length}`);
        
        indexes.forEach(index => {
          const keys = Object.keys(index.key).join(', ');
          console.log(`    - ${index.name}: {${keys}}`);
        });
      } catch (error) {
        console.log(`\n${collName}: Error getting stats - ${error.message}`);
      }
    }

    console.log('\n🎉 Database optimization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run optimization
optimizeDatabase().catch(console.error);