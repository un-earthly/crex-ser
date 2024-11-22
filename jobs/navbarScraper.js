const cron = require('node-cron');
const { scrapeNavBarData } = require('../service/navService');
const logMessage = require('../logger');

// Track job status
let isJobRunning = false;
let lastRunTime = null;
let consecutiveFailures = 0;
const MAX_FAILURES = 3;

// Cleanup function
async function cleanup() {
    if (isJobRunning) {
        logMessage('Waiting for current job to complete before shutting down...');
        // Wait for a reasonable timeout
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
    logMessage('Navigation scraper shutting down gracefully');
}

async function runNavScraper() {
    if (isJobRunning) {
        logMessage('Previous navigation scraping job still running, skipping this run');
        return;
    }

    isJobRunning = true;
    const startTime = Date.now();

    try {
        logMessage('Initiating scheduled navigation scraping...');

        await scrapeNavBarData();

        consecutiveFailures = 0;
        lastRunTime = new Date();

        const duration = Date.now() - startTime;
        logMessage(`Scheduled navigation scraping completed successfully in ${duration}ms`);

    } catch (error) {
        consecutiveFailures++;
        logMessage(`Scheduled scraping failed (attempt ${consecutiveFailures}): ${error.message}`, true);
        logMessage(`Stack trace: ${error.stack}`, true);

        if (consecutiveFailures >= MAX_FAILURES) {
            logMessage(`Maximum consecutive failures (${MAX_FAILURES}) reached. Alerting required.`, true);
        }

        
        const backoffTime = Math.min(1000 * Math.pow(2, consecutiveFailures - 1), 30000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));

    } finally {
        isJobRunning = false;
    }
}

function getJobStatus() {
    return {
        isRunning: isJobRunning,
        lastRunTime,
        consecutiveFailures,
        healthy: consecutiveFailures < MAX_FAILURES
    };
}

try {
    cron.schedule('0 */6 * * *', async () => {
        logMessage('Starting scheduled navigation update');
        await runNavScraper();
    }, {
        scheduled: true,
        timezone: "UTC"
    });


    logMessage('Navigation scraper cron job initialized successfully');
} catch (error) {
    logMessage(`Failed to initialize cron job: ${error.message}`, true);
    process.exit(1);
}


async function handleShutdown(signal) {
    logMessage(`${signal} received. Starting graceful shutdown...`);

    
    const forceShutdownTimeout = setTimeout(() => {
        logMessage('Forced shutdown due to timeout', true);
        process.exit(1);
    }, 60000);

    try {
        await cleanup();
        clearTimeout(forceShutdownTimeout);
        process.exit(0);
    } catch (error) {
        logMessage(`Error during shutdown: ${error.message}`, true);
        process.exit(1);
    }
}


process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
    logMessage(`Uncaught Exception: ${error.message}`, true);
    logMessage(`Stack trace: ${error.stack}`, true);
    handleShutdown('UNCAUGHT_EXCEPTION').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
    logMessage(`Unhandled Rejection at: ${promise}, reason: ${reason}`, true);
    handleShutdown('UNHANDLED_REJECTION').catch(() => process.exit(1));
});


module.exports = {
    getJobStatus,
    runNavScraper
};