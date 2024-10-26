// config/environment.js
const { config:envConf } = require('dotenv');

// Load environment variables
envConf();

const environmentConfig = {
    development: {
        mongoOptions: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            retryWrites: true,
            w: 'majority',
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            serverSelectionTimeoutMS: 5000,
        },
        cors: {
            origin: ['http://localhost:3000'],
            credentials: true
        },
        scraping: {
            concurrency: 2,
            retryAttempts: 3,
            retryDelay: 5000
        }
    },
    production: {
        mongoOptions: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            retryWrites: true,
            w: 'majority',
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            serverSelectionTimeoutMS: 5000,
        },
        cors: {
            origin: ['*'],
            credentials: true
        },
        scraping: {
            concurrency: 5,
            retryAttempts: 5,
            retryDelay: 10000
        }
    }
};

const environment = process.env.NODE_ENV || 'development';

// Validate required environment variables
const requiredVars = [
    'MONGODB_URI',
    'BASE',
    'BASE_SERVER',
    'ADMIN_API_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Security check for weak API key
if (process.env.ADMIN_API_KEY && process.env.ADMIN_API_KEY.length < 32) {
    console.warn('Warning: ADMIN_API_KEY is too short. Recommend using a longer, more secure key.');
}

const config = {
    env: environment,
    port: parseInt(process.env.PORT || '5000', 10),
    mongodb: {
        uri: process.env.MONGODB_URI,
        ...environmentConfig[environment].mongoOptions
    },
    base: {
        url: process.env.BASE,
        server: process.env.BASE_SERVER
    },
    security: {
        apiKey: process.env.ADMIN_API_KEY,
        rateLimits: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        }
    },
    ...environmentConfig[environment]
};

module.exports = config;