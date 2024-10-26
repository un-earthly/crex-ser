const connectDB = require("../db.config");
const { createPage } = require("../utility");
const axios = require("axios");

// Process API calls for a single match
async function processMatchAPIs(href, baseServer) {
    const endpoints = [
        { type: 'commentary', path: `/api/match/scrapper/com${href}` },
        { type: 'live scoreboard', path: `/api/match/scrapper/scoreboard${href}/live` },
        { type: 'scorecard', path: `/api/match/scrapper/scoreboard${href}/scorecard` },
        { type: 'match info', path: `/api/match/scrapper/scoreboard${href}/info` }
    ];

    for (const endpoint of endpoints) {
        console.log(`Fetching ${endpoint.type}...`);
        await axios.post(`${baseServer}${endpoint.path}`);
    }
}

// Scrape matches from a series page
async function scrapMatchListFromSeries(seriesLink, base) {
    const page = await createPage();
    try {
        await page.goto(base + seriesLink + "/matches", { waitUntil: 'networkidle0' });

        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => a.href.replace("https://crex.live", ""))
                .filter(href => href.includes('/scoreboard'));
        });

        return links;
    } catch (error) {
        console.error(`Error scraping series ${seriesLink}:`, error.message);
        return [];
    } finally {
        await page.close();
    }
}

// Main scraping handler
async function handleMatchListScraping() {
    let db;
    let mainPage;
    const processedLinks = new Set();
    const failedLinks = new Set();

    try {
        // Initialize database and browser
        db = await connectDB();
        mainPage = await createPage();
        const base = process.env.BASE;

        // Navigate to main page
        await mainPage.goto(base, { waitUntil: 'networkidle0' });

        // Extract initial links
        const { seriesList, matchList } = await mainPage.evaluate(() => {
            const matchLinks = [];
            const seriesLinks = [];

            Array.from(document.querySelectorAll('a'))
                .map(a => a.href.replace("https://crex.live", ""))
                .filter(href => href.includes('/scoreboard') || href.includes('/series'))
                .forEach(link => {
                    if (link.includes('/scoreboard')) {
                        matchLinks.push(link);
                    } else {
                        seriesLinks.push(link);
                    }
                });

            return { seriesList: seriesLinks, matchList: matchLinks };
        });

        // Scrape matches from series pages
        console.log(`Scraping ${seriesList.length} series pages...`);
        const seriesMatchLinks = await Promise.all(
            seriesList.map(link => scrapMatchListFromSeries(link, base))
        );

        // Combine and deduplicate all match links
        const uniqueMatchLinks = new Set(matchList);
        seriesMatchLinks.flat().forEach(link => uniqueMatchLinks.add(link));

        // Prepare links for processing
        const existingMatchLinks = await db.collection('matchLinks').find({}).toArray();
        const existingHrefs = new Set(existingMatchLinks.map(linkObj => linkObj.href));

        const linksToInsert = Array.from(uniqueMatchLinks)
            .map(link => link.split("/").slice(0, -1).join("/"))
            .filter(link => !existingHrefs.has(link))
            .map(link => ({
                href: link,
                createdAt: new Date()
            }));

        if (linksToInsert.length === 0) {
            console.log("No new links to process.");
            return;
        }

        // Process each link sequentially
        console.log(`Processing ${linksToInsert.length} new links...`);
        for (let i = 0; i < linksToInsert.length; i++) {
            const { href } = linksToInsert[i];
            console.log(`\nProcessing link ${i + 1}/${linksToInsert.length}: ${href}`);

            try {
                await processMatchAPIs(href, process.env.BASE_SERVER);
                processedLinks.add(href);

                // Insert successful link immediately
                await db.collection('matchLinks').insertOne({
                    href,
                    createdAt: new Date(),
                    processedAt: new Date()
                });

                console.log(`✓ Successfully processed and saved link: ${href}`);

                // Add delay between requests
                if (i < linksToInsert.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                failedLinks.add({ href, error: error.message });
                console.error(`✗ Failed to process link: ${href}`);
                console.error(`Error details: ${error.message}`);
            }
        }

    } catch (error) {
        console.error("Fatal error in scraping process:", error);
        throw error;
    } finally {
        // Clean up resources
        if (mainPage) await mainPage.close();

        // Print final summary
        console.log("\nScraping Process Summary:");
        console.log(`- Total links processed: ${processedLinks.size + failedLinks.size}`);
        console.log(`- Successfully processed: ${processedLinks.size}`);
        console.log(`- Failed: ${failedLinks.size}`);

        if (failedLinks.size > 0) {
            console.log("\nFailed Links:");
            failedLinks.forEach(({ href, error }) => {
                console.log(`- ${href}: ${error}`);
            });
        }
    }
}

module.exports = handleMatchListScraping;