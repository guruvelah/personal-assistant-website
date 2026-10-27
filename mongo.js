const { MongoClient, ObjectId } = require('mongodb');

let client = null;
let db = null;
let isConnected = false;
let isConnecting = false;

function getUri() {
  return process.env.MONGODB_URI;
}

function getDbName() {
  return process.env.MONGODB_DB || 'support_assistant';
}

async function connectMongo() {
  if (isConnected && db) return db;
  const uri = getUri();
  const dbName = getDbName();

  if (!uri || uri.includes('<username>') || uri.includes('<password>') || uri.includes('<db_password>')) {
    console.warn('[MongoDB] MONGODB_URI is not configured or contains placeholder credentials.');
    return null;
  }
  if (isConnecting) return null;

  try {
    isConnecting = true;
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    await client.connect();
    db = client.db(dbName);
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to database: "${dbName}"`);
    return db;
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    isConnected = false;
    db = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

async function getDatabase() {
  if (db && isConnected) return db;
  return await connectMongo();
}

async function logChat({ sessionId, userMessage, assistantResponse, responseType, ticketId }) {
  try {
    const database = await getDatabase();
    if (!database) {
      return { logId: `local-${Date.now()}` };
    }
    const collection = database.collection('chat_logs');
    const doc = {
      sessionId: sessionId || 'default-session',
      userMessage,
      assistantResponse,
      responseType: responseType || 'text',
      ticketId: ticketId || null,
      timestamp: new Date()
    };
    const result = await collection.insertOne(doc);
    return { logId: result.insertedId.toString() };
  } catch (err) {
    console.error('[MongoDB] Failed to log chat:', err.message);
    return { logId: `err-${Date.now()}` };
  }
}

async function saveFeedback({ logId, rating, comment }) {
  try {
    const database = await getDatabase();
    if (!database) {
      console.warn('[MongoDB] Cannot save feedback: Mongo not connected.');
      return { success: false, error: 'MongoDB not connected' };
    }
    const collection = database.collection('feedback');
    const doc = {
      logId: logId ? String(logId) : null,
      rating: rating === 'up' ? 'up' : 'down',
      comment: comment ? String(comment).slice(0, 500) : null,
      timestamp: new Date()
    };
    const result = await collection.insertOne(doc);
    return { success: true, id: result.insertedId.toString() };
  } catch (err) {
    console.error('[MongoDB] Failed to save feedback:', err.message);
    return { success: false, error: err.message };
  }
}

async function getRecentLogs(limit = 20) {
  try {
    const database = await getDatabase();
    if (!database) return [];
    return await database.collection('chat_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } catch (err) {
    console.error('[MongoDB] Failed to retrieve logs:', err.message);
    return [];
  }
}

async function checkMongoHealth() {
  const uri = getUri();
  if (!uri || uri.includes('<username>') || uri.includes('<password>') || uri.includes('<db_password>')) {
    return 'not_configured';
  }
  try {
    const database = await getDatabase();
    if (!database) return 'not_configured';
    await database.command({ ping: 1 });
    return 'ok';
  } catch (err) {
    console.error('[MongoDB] Ping failed:', err.message);
    return 'error';
  }
}

module.exports = {
  connectMongo,
  logChat,
  saveFeedback,
  getRecentLogs,
  checkMongoHealth,
  isMongoConnected: () => isConnected
};
