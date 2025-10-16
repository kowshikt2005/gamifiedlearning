#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests MongoDB Atlas connectivity and diagnoses issues
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function testConnection() {
  console.log('🔗 Testing MongoDB Atlas connection...');
  console.log('📍 URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true,
    maxIdleTimeMS: 30000,
  };

  let client;
  
  try {
    console.log('⏳ Attempting connection...');
    const startTime = Date.now();
    
    client = new MongoClient(MONGODB_URI, options);
    await client.connect();
    
    const connectionTime = Date.now() - startTime;
    console.log(`✅ Connected successfully in ${connectionTime}ms`);

    // Test database operations
    console.log('\n🧪 Testing database operations...');
    
    const db = client.db('studymaster');
    
    // Test ping
    const pingStart = Date.now();
    await db.admin().ping();
    const pingTime = Date.now() - pingStart;
    console.log(`✅ Ping successful: ${pingTime}ms`);

    // Test collections access
    const collections = await db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections:`, collections.map(c => c.name).join(', '));

    // Test a simple query
    const users = db.collection('users');
    const userCount = await users.countDocuments();
    console.log(`✅ Users collection: ${userCount} documents`);

    const tasks = db.collection('tasks');
    const taskCount = await tasks.countDocuments();
    console.log(`✅ Tasks collection: ${taskCount} documents`);

    // Test write operation (safe test)
    const testCollection = db.collection('connection_test');
    const testDoc = { 
      timestamp: new Date(), 
      test: 'connection_test',
      nodeVersion: process.version 
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log(`✅ Write test successful: ${insertResult.insertedId}`);

    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Cleanup successful');

    console.log('\n🎉 All database tests passed!');
    console.log('📊 Connection Statistics:');
    console.log(`   - Connection Time: ${connectionTime}ms`);
    console.log(`   - Ping Latency: ${pingTime}ms`);
    console.log(`   - Collections: ${collections.length}`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Tasks: ${taskCount}`);

  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    if (error.cause) {
      console.error('Root Cause:', error.cause.message);
    }

    // Provide troubleshooting suggestions
    console.log('\n🔧 Troubleshooting suggestions:');
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('   - Check your internet connection');
      console.log('   - Verify the MongoDB Atlas cluster is running');
      console.log('   - Check if your IP address is whitelisted in Atlas');
    }
    
    if (error.message.includes('ECONNRESET')) {
      console.log('   - Network connection was reset');
      console.log('   - Try again in a few moments');
      console.log('   - Check firewall settings');
    }
    
    if (error.message.includes('authentication')) {
      console.log('   - Verify username and password in connection string');
      console.log('   - Check database user permissions');
    }
    
    console.log('   - Verify MONGODB_URI in .env.local file');
    console.log('   - Check MongoDB Atlas cluster status');
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connection closed');
    }
  }
}

// Run the test
testConnection().catch(console.error);