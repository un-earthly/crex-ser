const { createPage } = require("../utility");
const connectDB = require("../db.config");
const { default: axios } = require("axios");

async function fetchAndStoreMatches() {
    let page;
    let db;
    try {
        page = await createPage();
        db = await connectDB();

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

        const matchCollection = db.collection("matchLinks");
        const seriesCollection = db.collection("seriesLinks");

        const uniqueMatchLinks = [...new Set(scoreboardLinks)];
        const uniqueSeriesLinks = [...new Set(seriesLinks)];

        const matchBulkOps = uniqueMatchLinks.map(href => ({
            updateOne: {
                filter: { href },
                update: { $set: { href, createdAt: new Date() } },
                upsert: true
            }
        }));

        if (matchBulkOps.length > 0) {
            await matchCollection.bulkWrite(matchBulkOps);
            console.log(`Stored ${uniqueMatchLinks.length} unique match links in the database.`);
        }

        const seriesBulkOps = uniqueSeriesLinks.map(href => ({
            updateOne: {
                filter: { href },
                update: { $set: { href, createdAt: new Date() } },
                upsert: true
            }
        }));

        if (seriesBulkOps.length > 0) {
            await seriesCollection.bulkWrite(seriesBulkOps);
            console.log(`Stored ${uniqueSeriesLinks.length} unique series links in the database.`);
        }

        for (const seriesLink of uniqueSeriesLinks) {
            const url = `${process.env.BASE_SERVER}/api${seriesLink}`;
            try {
                const response = await axios.get(url);
                if (!response.data) {
                    const scrapperUrl = `${process.env.BASE_SERVER}/api/scrapper${seriesLink}`;
                    await axios.post(scrapperUrl);
                }
            } catch (error) {
                console.error(`Error processing series link ${seriesLink}:`, error.message);
            }
        }

        for (const matchLink of uniqueMatchLinks) {
            const url = `${process.env.BASE_SERVER}/api/match${matchLink}`;
            try {
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
                console.error(`Error processing match link ${url}:`, error.message);
            }
        }

        return { uniqueMatchLinks, uniqueSeriesLinks };
    } catch (error) {
        console.error('Error fetching and storing matches:', error);
        throw error;
    }
}

module.exports = fetchAndStoreMatches;
