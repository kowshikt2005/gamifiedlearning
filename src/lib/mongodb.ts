import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10, // Optimize for free tier connection limits
  serverSelectionTimeoutMS: 10000, // Increased timeout for network issues
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  maxIdleTimeMS: 30000,
  // Add connection resilience options
  bufferMaxEntries: 0, // Disable mongoose buffering
  useNewUrlParser: true,
  useUnifiedTopology: true
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDatabase(): Promise<Db> {
  try {
    const client = await clientPromise;
    return client.db('studymaster');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // Try to reconnect once
    try {
      console.log('Attempting to reconnect to MongoDB...');
      const newClient = new MongoClient(uri, options);
      const reconnectedClient = await newClient.connect();
      return reconnectedClient.db('studymaster');
    } catch (retryError) {
      console.error('MongoDB reconnection failed:', retryError);
      throw new Error('Database connection failed. Please check your network connection and try again.');
    }
  }
}

// Atlas connection validation
export async function validateAtlasConnection(): Promise<void> {
  try {
    const client = await clientPromise;
    await client.db('admin').command({ ping: 1 });
    // Connected to MongoDB Atlas successfully
  } catch {
    // Atlas connection failed
    throw new Error('Failed to connect to MongoDB Atlas');
  }
}