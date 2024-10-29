// const express = require('express');
// const cors = require('cors');
// const app = express();
// const PORT = process.env.PORT || 5000;
// const { config } = require('dotenv');
// const newsRoutes = require('./routes/newsRoutes');
// const statsRoutes = require('./routes/statsCornerRoutes');
// const matchRoutes = require('./routes/matchRoutes');
// const seriesDetailsRoutes = require('./routes/seriesRoutes');
// const fixturesRoutes = require('./routes/fixtureRoutes');
// const rankingRoutes = require('./routes/rankingRoutes');
// const playerRoutes = require('./routes/playerRoutes');
// const navRoutes = require('./routes/navRoutes');
// const { closeBrowser } = require('./utility');
// const cron = require('node-cron');
// const fetchAndStoreMatches = require('./jobs/matchesListScrapper');
// const { initializeScrapers } = require('./jobs/scheduledScrapers');

// config();
// app.use(cors())
// app.use(express.json())


// app.use('/api/rankings', rankingRoutes);
// app.use('/api/fixtures', fixturesRoutes);
// app.use("/api/series", seriesDetailsRoutes)
// app.use('/api/news-blogs', newsRoutes);
// app.use('/api/match', matchRoutes);
// app.use('/api/stats-corner', statsRoutes);
// app.use('/api/player-profile', playerRoutes);
// app.use('/api/nav', navRoutes);

// (async function runFetchAndStoreMatches() {
//     try {
//         const { uniqueMatchLinks, uniqueSeriesLinks } = await fetchAndStoreMatches();
//         return {
//             data:
//             {
//                 uniqueMatchLinks,
//                 uniqueSeriesLinks
//             }
//         }
//     } catch (error) {
//         console.error('Failed to fetch and store matches:', error);
//     }
// })()
// cron.schedule('0 0 * * *', async () => {
//     try {
//         const matchLinks = await runFetchAndStoreMatches();
//         console.log(`Cron job completed. Fetched and stored ${matchLinks.length} match links.`);
//     } catch (error) {
//         console.error('Cron job failed:', error);
//     }
// });

// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Something broke!');
// });

// const server = app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// process.on('SIGINT', async () => {
//     console.log('Shutting down server...');
//     await closeBrowser();
//     server.close(() => {
//         console.log('Server shut down');
//         process.exit(0);
//     });
// });

// server.js
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
// const handleMatchListScraping = require('./jobs/matchListScrapper_');
// const { initializeScrapers, errorTracker, executeAllScrapers } = require("./jobs");

const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: config.security.rateLimits.windowMs,
    max: config.security.rateLimits.max
});

// Middleware setup
app.use(cors(config.cors));
app.use(express.json());
app.use(limiter);

// Request tracking middleware
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

// Routes
app.use('/api/rankings', rankingRoutes);
app.use('/api/fixtures', fixturesRoutes);
app.use("/api/series", seriesDetailsRoutes);
app.use('/api/news-blogs', newsRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/stats-corner', statsRoutes);
app.use('/api/player-profile', playerRoutes);
app.use('/api/nav', navRoutes);

// Admin routes with API key protection
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

// Error handling middleware
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

// Server initialization
async function startServer() {
    try {
        const server = app.listen(config.port, () => {
            serverStartTime = Date.now();
            console.log(`Server running on port ${config.port}`);
            console.log(`Environment: ${config.env}`);
            console.log(`MongoDB: ${config.mongodb.uri.split('@')[1]}`);
        });

        // Graceful shutdown handler
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

        // Process handlers
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