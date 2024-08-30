// db.config.js (assuming the file name)
const { MongoClient } = require('mongodb');
const { config } = require('dotenv');

// Load environment variables
config();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();
        const db = client.db('crex');
        console.log('Connected successfully to MongoDB');
        return db;
    } catch (e) {
        console.error('Failed to connect to MongoDB:', e);
        throw e; // Propagate the error so that it can be handled
    }
}

module.exports = connectDB;
