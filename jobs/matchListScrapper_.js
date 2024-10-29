const fs = require('fs/promises');
const { createReadStream, createWriteStream } = require('fs');
const readline = require('readline');
const path = require('path');
const os = require('os');
const connectDB = require("../db.config");
const logger = require('../logger');

const { createPage } = require('../utility/page');

// Constants
const BATCH_SIZE = 1; 
const WAIT_TIME = 3000;
const DUMP_DIR = path.join(os.tmpdir(), 'scraper-dumps');

// Browser management
let browser = null;
let activePage = null;

async function cleanup() {
    if (activePage) {
        try {
            await activePage.close();
        } catch (error) {
            console.error('Error closing page:', error);
        }
        activePage = null;
    }
    if (browser) {
        try {
            await browser.close();
        } catch (error) {
            console.error('Error closing browser:', error);
        }
        browser = null;
    }
    if (global.gc) {
        global.gc();
    }
}

async function processSeriesAPIs() {
    const keys = ['', 'news', 'info', 'series-stats', 'points-table', 'team-squad', 'matches']

}
async function processMatchAPIs() {
    const keys = ['','live','scorecard','info']
 }

async function writeLinksToFile(links, filename) {
    const filepath = path.join(DUMP_DIR, filename);
    const stream = createWriteStream(filepath);

    for (const link of links) {
        await new Promise((resolve, reject) => {
            stream.write(`${link}\n`, error => {
                if (error) reject(error);
                else resolve();
            });
        });
    }

    await new Promise(resolve => stream.end(resolve));
    return filepath;
}

async function* readLinksFromFile(filepath) {
    const fileStream = createReadStream(filepath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line.trim()) {
            yield line.trim();
            await new Promise(resolve => setTimeout(resolve, 100)); 
        }
    }
}

async function scrapeLinks(baseUrl, type = 'series') {
    const links = [];
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            if (!activePage) {
                activePage = await createPage();
            }

            await activePage.goto(baseUrl, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            const pageLinks = await activePage.evaluate((type) => {
                return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href.replace("https://crex.live", ""))
                    .filter(href => href.includes(`/${type}`));
            }, type);

            links.push(...pageLinks);
            await cleanup();
            break;

        } catch (error) {
            retryCount++;
            await logger.logError(error, `Scraping attempt ${retryCount} failed`);
            await cleanup();

            if (retryCount === maxRetries) {
                throw new Error(`Failed to scrape after ${maxRetries} attempts`);
            }

            await new Promise(resolve => setTimeout(resolve, retryCount * 5000));
        }
    }

    return links;
}

async function processLink(link, processor) {
    try {
        await processor(link);
        await logger.logSuccess(`Processed: ${link}`);
        return { success: true };
    } catch (error) {
        await logger.logError(error, `Failed to process: ${link}`);
        return { success: false, error: error.message };
    }
}

async function handleMatchListScraping() {
    try {
        await fs.mkdir(DUMP_DIR, { recursive: true });
        await logger.initialize();
        const db = await connectDB();
        const base = process.env.BASE;
        const baseServer = process.env.BASE_SERVER;

        // Process series
        await logger.logSection('Scraping Series');
        const seriesLinks = await scrapeLinks(base, 'series');
        const seriesFile = await writeLinksToFile(seriesLinks, `series_${Date.now()}.txt`);

        let processedSeries = 0;
        let failedSeries = 0;

        for await (const link of readLinksFromFile(seriesFile)) {
            const exists = await db.collection('seriesLinks').findOne({ href: link });
            if (!exists) {
                const result = await processLink(link, async (l) => {
                    await processSeriesAPIs(l, baseServer);
                    await db.collection('seriesLinks').insertOne({
                        href: l,
                        createdAt: new Date()
                    });
                });

                if (result.success) processedSeries++;
                else failedSeries++;

                await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
            }
        }

        // Process matches
        await logger.logSection('Scraping Matches');
        const matchLinks = await scrapeLinks(base, 'scoreboard');
        const matchFile = await writeLinksToFile(matchLinks, `matches_${Date.now()}.txt`);

        let processedMatches = 0;
        let failedMatches = 0;

        for await (const link of readLinksFromFile(matchFile)) {
            const matchLink = link.split("/").slice(0, -1).join("/");
            const exists = await db.collection('matchLinks').findOne({ href: matchLink });

            if (!exists) {
                const result = await processLink(matchLink, async (l) => {
                    await processMatchAPIs(l, baseServer);
                    await db.collection('matchLinks').insertOne({
                        href: l,
                        createdAt: new Date()
                    });
                });

                if (result.success) processedMatches++;
                else failedMatches++;

                await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
            }
        }

        // Cleanup and summary
        await cleanup();
        await fs.rm(DUMP_DIR, { recursive: true, force: true });

        await logger.logSection('Final Summary');
        await logger.logSummary(
            processedSeries + processedMatches,
            failedSeries + failedMatches,
            []
        );

    } catch (error) {
        await logger.logError(error, 'Fatal error in scraping process');
        throw error;
    } finally {
        await cleanup();
    }
}

module.exports = handleMatchListScraping;