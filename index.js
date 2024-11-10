/**
 * Express.js Server for Cricket Data API
 * --------------------------------------
 * This server provides a RESTful API for cricket-related data including news, 
 * rankings, fixtures, series details, match information, and player profiles.
 * 
 * Core Features:
 * - Web scraping automation with scheduled jobs
 * - Rate limiting and API key authentication
 * - Health monitoring and status reporting
 * - CORS support and error tracking
 * 
 * Main API Endpoints:
 * - /api/rankings        - Cricket rankings data
 * - /api/fixtures        - Match fixtures and schedules
 * - /api/series         - Series information
 * - /api/news-blogs     - Cricket news and blogs
 * - /api/match          - Match information
 * - /api/stats-corner   - Cricket statistics
 * - /api/player-profile - Player profiles
 * - /api/nav           - Navigation data
 * 
 * System Endpoints:
 * - /api/scraper-status  - Scraping status
 * - /api/health         - Server health metrics
 * - /api/trigger-scrape - Manual scrape trigger
 * 
 * Requirements:
 * - MongoDB connection
 * - Environment configuration
 * - API key for system endpoints
 * 
 * @author MD Alamin
 * @version 1.0
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config/environment');
const newsRoutes = require('./routes/newsRoutes');
const statsRoutes = require('./routes/statsCornerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const seriesDetailsRoutes = require('./routes/seriesRoutes');
const fixturesRoutes = require('./routes/fixtureRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const playerRoutes = require('./routes/playerRoutes');
const navRoutes = require('./routes/navRoutes');
const { closeBrowser } = require('./utility');
require("./jobs/newsScraper");

const app = express();

const limiter = rateLimit({
    windowMs: config.security.rateLimits.windowMs,
    max: config.security.rateLimits.max
});

app.use(cors(config.cors));
app.use(express.json());
app.use(limiter);

let serverStartTime;
const healthStats = {
    uptimeSeconds: () => Math.floor((Date.now() - serverStartTime) / 1000),
    totalRequests: 0,
    activeConnections: 0,
    lastErrors: []
};

app.use((req, res, next) => {
    healthStats.totalRequests++;
    healthStats.activeConnections++;

    res.on('finish', () => {
        healthStats.activeConnections--;
        if (res.statusCode >= 400) {
            healthStats.lastErrors.push({
                timestamp: new Date(),
                path: req.path,
                method: req.method,
                statusCode: res.statusCode
            });
            healthStats.lastErrors = healthStats.lastErrors.slice(-10);
        }
    });

    next();
});

app.use('/api/rankings', rankingRoutes);
app.use('/api/fixtures', fixturesRoutes);
app.use("/api/series", seriesDetailsRoutes);
app.use('/api/news-blogs', newsRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/stats-corner', statsRoutes);
app.use('/api/player-profile', playerRoutes);
app.use('/api/nav', navRoutes);

const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== config.security.apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

app.get('/api/scraper-status', validateApiKey, (req, res) => {
    res.json(errorTracker.getReport());
});

app.get('/api/health', validateApiKey, (req, res) => {
    res.json({
        status: 'running',
        environment: config.env,
        uptime: healthStats.uptimeSeconds(),
        totalRequests: healthStats.totalRequests,
        activeConnections: healthStats.activeConnections,
        lastErrors: healthStats.lastErrors,
        memory: process.memoryUsage(),
        scraperStatus: errorTracker.getReport()
    });
});

app.post('/api/trigger-scrape', validateApiKey, async (req, res) => {
    try {
        executeAllScrapers();
        res.json({ message: 'Scraping triggered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to trigger scraping' });
    }
});


app.use((err, req, res, next) => {
    console.error('Error:', err);

    healthStats.lastErrors.push({
        timestamp: new Date(),
        path: req.path,
        method: req.method,
        error: config.env === 'development' ? err.message : 'Internal Server Error'
    });

    res.status(500).json({
        error: 'Internal Server Error',
        message: config.env === 'development' ? err.message : undefined
    });
});


async function startServer() {
    try {
        const server = app.listen(config.port, () => {
            serverStartTime = Date.now();
            console.log(`Server running on port ${config.port}`);
            console.log(`Environment: ${config.env}`);
            console.log(`MongoDB: ${config.mongodb.uri.split('@')[1]}`);
        });

        async function handleShutdown(signal) {
            console.log(`\n${signal} received. Initiating graceful shutdown...`);

            const forceShutdownTimeout = setTimeout(() => {
                console.error('Forced shutdown due to timeout');
                process.exit(1);
            }, 10000);

            try {
                await closeBrowser();
                server.close(() => {
                    clearTimeout(forceShutdownTimeout);
                    console.log('Server shut down successfully');
                    process.exit(0);
                });
            } catch (error) {
                console.error('Error during shutdown:', error);
                clearTimeout(forceShutdownTimeout);
                process.exit(1);
            }
        }

        process.on('SIGTERM', () => handleShutdown('SIGTERM'));
        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection:', reason);
        });
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            handleShutdown('UNCAUGHT_EXCEPTION');
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();