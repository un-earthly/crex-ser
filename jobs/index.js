const { createPage } = require("../utility");
const connectDB = require("../db.config");
const { default: axios } = require("axios");
const cron = require('node-cron');

// Error Tracking System
class ScraperErrorTracker {
    constructor() {
        this.errors = new Map();
        this.lastRun = new Map();
        this.stats = new Map();
    }

    logError(scraperName, error) {
        const currentErrors = this.errors.get(scraperName) || [];
        currentErrors.push({
            timestamp: new Date(),
            error: error.message,
            stack: error.stack
        });
        this.errors.set(scraperName, currentErrors.slice(-5)); // Keep last 5 errors
    }

    updateStats(scraperName, success) {
        const stats = this.stats.get(scraperName) || { success: 0, failed: 0 };
        if (success) {
            stats.success++;
        } else {
            stats.failed++;
        }
        this.stats.set(scraperName, stats);
        this.lastRun.set(scraperName, new Date());
    }

    getReport() {
        const report = {
            lastRun: {},
            errors: {},
            stats: {}
        };

        this.lastRun.forEach((value, key) => {
            report.lastRun[key] = value;
        });
        this.errors.forEach((value, key) => {
            report.errors[key] = value;
        });
        this.stats.forEach((value, key) => {
            report.stats[key] = value;
        });

        return report;
    }
}

const errorTracker = new ScraperErrorTracker();

// Utility Functions
const addRandomDelay = (min = 1000, max = 5000) => {
    const delay = Math.floor(Math.random() * (max - min) + min);
    return new Promise(resolve => setTimeout(resolve, delay));
};

// Individual Scraper Functions
// async function fetchAndStoreMatches(page = null) {
//     const shouldClosePage = !page;
//     try {
//         page = page || await createPage();
//         const db = await connectDB();

//         if (!db) {
//             throw new Error('Database connection failed');
//         }

//         await page.goto('https://crex.live/', { waitUntil: 'networkidle0' });

//         const links = await page.evaluate(() => {
//             return Array.from(document.querySelectorAll('a'))
//                 .map(a => a.href.replace("https://crex.live", ""))
//                 .filter(href => href.includes('/scoreboard') || href.includes('/series'));
//         });

//         const scoreboardLinks = links.filter(href => href.includes('/scoreboard'));
//         const seriesLinks = links.filter(href => href.includes('/series'));

//         const uniqueMatchLinks = [...new Set(scoreboardLinks)];
//         const uniqueSeriesLinks = [...new Set(seriesLinks)];

//         // Store matches
//         const matchCollection = db.collection("matchLinks");
//         const matchBulkOps = uniqueMatchLinks.map(href => ({
//             updateOne: {
//                 filter: { href },
//                 update: { $set: { href, createdAt: new Date() } },
//                 upsert: true
//             }
//         }));

//         if (matchBulkOps.length > 0) {
//             await matchCollection.bulkWrite(matchBulkOps);
//             console.log(`Stored ${uniqueMatchLinks.length} unique match links.`);
//         }

//         // Store series
//         const seriesCollection = db.collection("seriesLinks");
//         const seriesBulkOps = uniqueSeriesLinks.map(href => ({
//             updateOne: {
//                 filter: { href },
//                 update: { $set: { href, createdAt: new Date() } },
//                 upsert: true
//             }
//         }));

//         if (seriesBulkOps.length > 0) {
//             await seriesCollection.bulkWrite(seriesBulkOps);
//             console.log(`Stored ${uniqueSeriesLinks.length} unique series links.`);
//         }

//         await Promise.all([
//             ...uniqueMatchLinks.map(processMatchLink),
//             ...uniqueSeriesLinks.map(processSeriesLink)
//         ]);

//         errorTracker.updateStats('matches', true);
//         return { uniqueMatchLinks, uniqueSeriesLinks };
//     } catch (error) {
//         errorTracker.logError('matches', error);
//         errorTracker.updateStats('matches', false);
//         throw error;
//     } finally {
//         if (shouldClosePage && page) {
//             await page.close();
//         }
//     }
// }
async function processMatchLink(matchLink) {
    try {
        const url = `${process.env.BASE_SERVER}/api/match${matchLink}`;
        const response = await axios.get(url);

        if (!response.data) {
            const cases = ["live", "info", "scorecard"];
            let activeCase = matchLink.split("/")[8];

            for (const c of cases) {
                if (c !== activeCase) {
                    const newMatchLink = matchLink.replace(`/api/match/scrapper/${activeCase}`, `/api/match/scrapper/${c}`);
                    const scrapperUrl = `${process.env.BASE_SERVER}/api/match/scrapper${newMatchLink}`;

                    try {
                        await axios.post(scrapperUrl);
                        console.log(`Fetched ${c} data for match link: ${newMatchLink}`);

                        const matchId = `${process.env.BASE}${url}`;
                        const existing = await checkExistingMatchData(matchId);

                        if (!existing) {
                            await axios.post(`${process.env.BASE_SERVER}/api/match/scrapper/layout${newMatchLink}`);

                            switch (c) {
                                case "live":
                                    await axios.post(`${process.env.BASE_SERVER}/api/match/scrapper/com${newMatchLink}`);
                                    await axios.post(`${process.env.BASE_SERVER}/api/match/scrapper/scoreboard${newMatchLink}`);
                                    break;
                                case "info":
                                case "scorecard":
                                    await axios.post(`${process.env.BASE_SERVER}/api/match/scrapper/scoreboard${newMatchLink}`);
                                    break;
                                default:
                                    console.warn(`Unknown case type: ${c}`);
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching ${c} data for match link ${newMatchLink}:`, error.message);
                    }
                } else {
                    console.log(`Active case (${c}) already exists, skipping...`);
                }
            }
        } else {
            console.log(`Match data already present for ${url}, skipping API request.`);
        }
    } catch (error) {
        console.error(`Error processing match link ${matchLink}:`, error.message);
    }
}

async function processSeriesLink(seriesLink) {
    try {
        const url = `${process.env.BASE_SERVER}/api/series/scrapper${seriesLink.replace("/series", "")}`;
        const seriesId = `${process.env.BASE}${seriesLink}`;
        const cases = ["", "info", "news", "series-stats", "points-table", "team-squad", "matches"];

        for (const caseType of cases) {
            const baseUrl = `${seriesId}/${caseType}`;
            console.log(seriesLink, seriesId, url, baseUrl);

            const existing = await checkExistingSeriesData(baseUrl, seriesId);
            if (!existing) {
                await fetchDataForCase(url);
            }
        }

        const response = await axios.get(url);
        if (!response.data) {
            const scrapperUrl = `${process.env.BASE_SERVER}/api/scrapper${seriesLink}`;
            await fetchDataForCase(scrapperUrl);
        }
    } catch (error) {
        console.error(`Error processing series link ${seriesLink}:`, error.message);
    }
}

async function checkExistingMatchData(matchId) {
    const db = await connectDB();
    return await Promise.all([
        db.collection("matchLayouts").findOne({ matchId }),
        db.collection("scorecardInfo").findOne({ matchId }),
        db.collection("liveMatchInfo").findOne({ matchId }),
        db.collection("matchInfoDetails").findOne({ matchId }),
        db.collection("commentary").findOne({ matchId })
    ]).then(results => results.every(result => result !== null));
}

async function checkExistingSeriesData(baseUrl, seriesId) {
    const db = await connectDB();
    return await Promise.all([
        db.collection("seriesInfo").findOne({ seriesId: baseUrl }),
        db.collection("seriesNews").findOne({ seriesId: baseUrl }),
        db.collection("seriesStats").findOne({ seriesId: baseUrl }),
        db.collection("squadData").findOne({ seriesId: baseUrl }),
        db.collection("pointsTable").findOne({ seriesId: baseUrl }),
        db.collection("matchesInfo").findOne({ seriesId: baseUrl }),
        db.collection("seriesData").findOne({ seriesId: `${process.env.BASE}${seriesId}` }),
    ]).then(results => results.every(result => result !== null));
}

async function fetchDataForCase(baseUrl) {
    try {
        await axios.post(baseUrl);
    } catch (error) {
        throw new Error(`Error fetching data from ${baseUrl}: ${error.message}`);
    }
}

// Main fetchAndStoreMatches function modification
async function fetchAndStoreMatches(page = null) {
    const shouldClosePage = !page;
    try {
        page = page || await createPage();
        const db = await connectDB();

        if (!db) {
            throw new Error('Database connection failed');
        }

        await page.goto('https://crex.live/', { waitUntil: 'networkidle0' });

        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => a.href.replace("https://crex.live", ""))
                .filter(href => href.includes('/scoreboard') || href.includes('/series'));
        });

        const scoreboardLinks = links.filter(href => href.includes('/scoreboard'));
        const seriesLinks = links.filter(href => href.includes('/series'));

        const uniqueMatchLinks = [...new Set(scoreboardLinks)];
        const uniqueSeriesLinks = [...new Set(seriesLinks)];

        // Store matches
        const matchCollection = db.collection("matchLinks");
        const matchBulkOps = uniqueMatchLinks.map(href => ({
            updateOne: {
                filter: { href },
                update: { $set: { href, createdAt: new Date() } },
                upsert: true
            }
        }));

        if (matchBulkOps.length > 0) {
            await matchCollection.bulkWrite(matchBulkOps);
            console.log(`Stored ${uniqueMatchLinks.length} unique match links.`);
        }

        // Store series
        const seriesCollection = db.collection("seriesLinks");
        const seriesBulkOps = uniqueSeriesLinks.map(href => ({
            updateOne: {
                filter: { href },
                update: { $set: { href, createdAt: new Date() } },
                upsert: true
            }
        }));

        if (seriesBulkOps.length > 0) {
            await seriesCollection.bulkWrite(seriesBulkOps);
            console.log(`Stored ${uniqueSeriesLinks.length} unique series links.`);
        }

        // Process links
        for (const matchLink of uniqueMatchLinks) {
            await processMatchLink(matchLink);
        }

        for (const seriesLink of uniqueSeriesLinks) {
            await processSeriesLink(seriesLink);
        }

        errorTracker.updateStats('matches', true);
        return { uniqueMatchLinks, uniqueSeriesLinks };
    } catch (error) {
        errorTracker.logError('matches', error);
        errorTracker.updateStats('matches', false);
        throw error;
    } finally {
        if (shouldClosePage && page) {
            await page.close();
        }
    }
}
async function fetchAndStoreRankings(page = null) {
    const shouldClosePage = !page;
    try {
        page = page || await createPage();
        const categories = ['men', 'women'];
        const types = ['teams', 'batter', 'bowler', 'allrounder'];

        for (const gender of categories) {
            for (const type of types) {
                await axios.post(`${process.env.BASE_SERVER}/api/rankings/scrapper/${gender}/${type}`);
                await addRandomDelay();
            }
        }
        errorTracker.updateStats('rankings', true);
    } catch (error) {
        errorTracker.logError('rankings', error);
        errorTracker.updateStats('rankings', false);
        throw error;
    } finally {
        if (shouldClosePage && page) {
            await page.close();
        }
    }
}

async function fetchAndStoreNews(page = null) {
    const shouldClosePage = !page;
    try {
        page = page || await createPage();
        await axios.post(`${process.env.BASE_SERVER}/api/news-blogs/scraper`);
        errorTracker.updateStats('news', true);
    } catch (error) {
        errorTracker.logError('news', error);
        errorTracker.updateStats('news', false);
        throw error;
    } finally {
        if (shouldClosePage && page) {
            await page.close();
        }
    }
}

async function fetchAndStoreFixtures(page = null) {
    const shouldClosePage = !page;
    try {
        page = page || await createPage();
        await Promise.all([
            axios.post(`${process.env.BASE_SERVER}/api/fixtures/scrapper/match`),
            axios.post(`${process.env.BASE_SERVER}/api/fixtures/scrapper/series`)
        ]);
        errorTracker.updateStats('fixtures', true);
    } catch (error) {
        errorTracker.logError('fixtures', error);
        errorTracker.updateStats('fixtures', false);
        throw error;
    } finally {
        if (shouldClosePage && page) {
            await page.close();
        }
    }
}

async function fetchAndStoreStats(page = null) {
    const shouldClosePage = !page;
    try {
        page = page || await createPage();
        await axios.post(`${process.env.BASE_SERVER}/api/stats-corner/scraper/suffle`);
        errorTracker.updateStats('stats', true);
    } catch (error) {
        errorTracker.logError('stats', error);
        errorTracker.updateStats('stats', false);
        throw error;
    } finally {
        if (shouldClosePage && page) {
            await page.close();
        }
    }
}

async function fetchAndStoreNavbar(page = null) {
    const shouldClosePage = !page;
    try {
        page = page || await createPage();
        await axios.post(`${process.env.BASE_SERVER}/api/nav/scraper`);
        errorTracker.updateStats('navbar', true);
    } catch (error) {
        errorTracker.logError('navbar', error);
        errorTracker.updateStats('navbar', false);
        throw error;
    } finally {
        if (shouldClosePage && page) {
            await page.close();
        }
    }
}

// Main execution function
async function executeAllScrapers() {
    console.log('Starting full scraping cycle...');
    const startTime = Date.now();
    const page = await createPage();

    try {
        await fetchAndStoreMatches(page);
        await addRandomDelay();

        await fetchAndStoreRankings(page);
        await addRandomDelay();

        await fetchAndStoreNews(page);
        await addRandomDelay();

        await fetchAndStoreFixtures(page);
        await addRandomDelay();

        await fetchAndStoreStats(page);
        await addRandomDelay();

        await fetchAndStoreNavbar(page);

        const duration = (Date.now() - startTime) / 1000;
        console.log(`Completed full scraping cycle in ${duration} seconds`);
    } catch (error) {
        console.error('Error in scraping cycle:', error);
    } finally {
        await page.close();
    }
}

// Scheduler setup
function initializeScrapers() {
    // Main daily scrape
    cron.schedule('0 0 * * *', executeAllScrapers);

    // Frequent updates for time-sensitive data
    cron.schedule('*/30 * * * *', async () => {
        try {
            const page = await createPage();
            await fetchAndStoreFixtures(page);
            await fetchAndStoreMatches(page);
            await page.close();
        } catch (error) {
            console.error('Error in frequent update:', error);
        }
    });

    // Stats update every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        try {
            const page = await createPage();
            await fetchAndStoreStats(page);
            await page.close();
        } catch (error) {
            console.error('Error in stats update:', error);
        }
    });

    console.log('All scrapers initialized successfully');
}
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Cleaning up...');
    process.exit(0);
});
module.exports = {
    executeAllScrapers,
    initializeScrapers,
    errorTracker,
    fetchAndStoreMatches,
    fetchAndStoreRankings,
    fetchAndStoreNews,
    fetchAndStoreFixtures,
    fetchAndStoreStats,
    fetchAndStoreNavbar
};