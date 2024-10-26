const cron = require('node-cron');
const { fetchAndStoreAll } = require('./matchesListScrapper');

// Utility to add random delay
const addRandomDelay = () => {
    const delay = Math.floor(Math.random() * 300000); // Random delay up to 5 minutes
    return new Promise(resolve => setTimeout(resolve, delay));
};

// Function to execute all scrapers with random delays
async function executeAllScrapers() {
    try {
        console.log('Starting scheduled scraping...');

        // Main match and series scraper
        await addRandomDelay();
        await fetchAndStoreAll();

        // Rankings scraper
        await addRandomDelay();
        await fetchAndStoreRankings();

        // News scraper
        await addRandomDelay();
        await fetchAndStoreNews();

        // Fixtures scraper
        await addRandomDelay();
        await fetchAndStoreFixtures();

        // Stats scraper
        await addRandomDelay();
        await fetchAndStoreStats();

        // Navbar scraper
        await addRandomDelay();
        await fetchAndStoreNavbar();

        console.log('Completed all scheduled scraping tasks');
    } catch (error) {
        console.error('Error in scheduled scraping:', error);
    }
}

// Error tracking system
class ScraperErrorTracker {
    constructor() {
        this.errors = new Map();
    }

    logError(scraperName, error) {
        const currentErrors = this.errors.get(scraperName) || [];
        currentErrors.push({
            timestamp: new Date(),
            error: error.message
        });
        this.errors.set(scraperName, currentErrors.slice(-5)); // Keep last 5 errors
    }

    getErrorReport() {
        const report = {};
        this.errors.forEach((errors, scraper) => {
            report[scraper] = errors;
        });
        return report;
    }
}

const errorTracker = new ScraperErrorTracker();

// Individual scraper schedulers with retry logic
function scheduleScraperWithRetry(name, scraperFn, schedule) {
    cron.schedule(schedule, async () => {
        let retries = 3;
        while (retries > 0) {
            try {
                await scraperFn();
                break;
            } catch (error) {
                retries--;
                errorTracker.logError(name, error);
                if (retries > 0) {
                    console.log(`Retrying ${name}, attempts remaining: ${retries}`);
                    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s before retry
                } else {
                    console.error(`All retries failed for ${name}`);
                }
            }
        }
    });
}

// Initialize all scrapers
function initializeScrapers() {
    // Main schedule - every 24 hours
    cron.schedule('0 0 * * *', executeAllScrapers);

    // Individual schedules with slight offsets to distribute load
    scheduleScraperWithRetry('rankings', fetchAndStoreRankings, '0 1 * * *');
    scheduleScraperWithRetry('news', fetchAndStoreNews, '0 2 * * *');
    scheduleScraperWithRetry('fixtures', fetchAndStoreFixtures, '0 3 * * *');
    scheduleScraperWithRetry('stats', fetchAndStoreStats, '0 4 * * *');
    scheduleScraperWithRetry('navbar', fetchAndStoreNavbar, '0 5 * * *');

    // Additional schedule for time-sensitive data
    cron.schedule('*/30 * * * *', async () => { // Every 30 minutes
        try {
            await fetchAndStoreFixtures(); // More frequent updates for fixtures
        } catch (error) {
            errorTracker.logError('fixtures-frequent', error);
        }
    });
}

module.exports = {
    initializeScrapers,
    errorTracker,
    executeAllScrapers,
    fetchAndStoreRankings,
    fetchAndStoreNews,
    fetchAndStoreFixtures,
    fetchAndStoreStats,
    fetchAndStoreNavbar
};