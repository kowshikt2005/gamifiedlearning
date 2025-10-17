#!/usr/bin/env node

/**
 * MongoDB Connection Monitor
 * Helps track connection usage and identify leaks
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function monitorConnections() {
  let client;
  
  try {
    console.log('🔍 Monitoring MongoDB connections...');
    
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
    });
    
    await client.connect();
    const db = client.db('studymaster');
    
    // Get server status
    const serverStatus = await db.admin().serverStatus();
    const connections = serverStatus.connections;
    
    console.log('\n📊 Connection Statistics:');
    console.log(`   Current: ${connections.current}`);
    console.log(`   Available: ${connections.available}`);
    console.log(`   Total Created: ${connections.totalCreated}`);
    
    // Calculate usage percentage
    const total = connections.current + connections.available;
    const usagePercent = ((connections.current / total) * 100).toFixed(1);
    
    console.log(`   Usage: ${usagePercent}%`);
    
    // Warning thresholds
    if (usagePercent > 80) {
      console.log('🚨 HIGH USAGE WARNING: Consider optimizing connection pool');
    } else if (usagePercent > 60) {
      console.log('⚠️  MODERATE USAGE: Monitor connection usage');
    } else {
      console.log('✅ Connection usage is healthy');
    }
    
    // Get database stats
    const stats = await db.stats();
    console.log('\n📈 Database Statistics:');
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Index Size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    
    // List active operations
    const currentOps = await db.admin().currentOp();
    const activeOps = currentOps.inprog.filter(op => op.active);
    
    console.log('\n⚡ Active Operations:');
    if (activeOps.length === 0) {
      console.log('   No active operations');
    } else {
      activeOps.forEach((op, index) => {
        console.log(`   ${index + 1}. ${op.op} on ${op.ns} (${op.secs_running}s)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Monitoring connection closed');
    }
  }
}

// Run monitoring
monitorConnections().catch(console.error);