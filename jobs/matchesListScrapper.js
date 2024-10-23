const { createPage } = require("../utility");
const connectDB = require("../db.config");
const { default: axios } = require("axios");



async function fetchAndStoreMatches() {
    let page, db;
    try {
        page = await createPage();
        db = await connectDB();

        if (!db) {
            throw new Error('Database connection failed');
        }

        await page.goto('https://crex.live/', { waitUntil: 'networkidle0' });
        async function fetchDataForCase(baseUrl) {
            try {
                await axios.post(baseUrl);
            } catch (error) {
                throw new Error(`Error fetching data from ${baseUrl}: ${error.message}`);
            }
        }

        async function processSeriesLink(seriesLink) {
            const url = `${process.env.BASE_SERVER}/api/series/scrapper${seriesLink.replace("/series", "")}`;
            const seriesId = `${process.env.BASE}${seriesLink}`;
            const cases = ["", "info", "news", "series-stats", "points-table", "team-squad", "matches"];

            for (const caseType of cases) {
                const baseUrl = `${seriesId}/${caseType}`;
                console.log(seriesLink, seriesId, url, baseUrl);
                const existing = await Promise.all([
                    db.collection("seriesInfo").findOne({ seriesId: baseUrl }),
                    db.collection("seriesNews").findOne({ seriesId: baseUrl }),
                    db.collection("seriesStats").findOne({ seriesId: baseUrl }),
                    db.collection("squadData").findOne({ seriesId: baseUrl }),
                    db.collection("pointsTable").findOne({ seriesId: baseUrl }),
                    db.collection("matchesInfo").findOne({ seriesId: baseUrl }),
                    db.collection("seriesData").findOne({ seriesId: `${process.env.BASE}${seriesId}` }),
                ]).then(results => results.every(result => result !== null));

                if (!existing) {
                    await fetchDataForCase(url);
                }
            }

            try {
                const response = await axios.get(url);
                if (!response.data) {
                    const scrapperUrl = `${process.env.BASE_SERVER}/api/scrapper${seriesLink}`;
                    await fetchDataForCase(scrapperUrl);
                }
            } catch (error) {
                console.error(`Error processing series link ${seriesLink}:`, error.message);
            }
        }

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
            await processSeriesLink(seriesLink);
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

                                const matchId = `${process.env.BASE}${url}`;
                                const existing = await Promise.all([
                                    db.collection("matchLayouts").findOne({ matchId }),
                                    db.collection("scorecardInfo").findOne({ matchId }),
                                    db.collection("liveMatchInfo").findOne({ matchId }),
                                    db.collection("matchInfoDetails").findOne({ matchId }),
                                    db.collection("commentary").findOne({ matchId })
                                ]).then(results => results.every(result => result !== null));

                                if (!existing) {
                                    await axios.post(`${process.env.BASE_SERVER}/api/match/scrapper/layout${newMatchLink}`);

                                    switch (c) {
                                        case "live":
                                            await axios.post(`${process.env.BASE_SERVER}/api/match/scrapper/com${newMatchLink}`);
                                            await axios.post(`${process.env.BASE_SERVER}/api/match/scrapper/scoreboard${newMatchLink}`);
                                            break; // Ensure to break here
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
                console.error(`Error processing match link ${url}:`, error.message);
            }
        }
        return {
            uniqueMatchLinks,
            uniqueSeriesLinks
        }
    } catch (error) {
        console.error('Error fetching and storing matches:', error);
        throw error;
    }
}

module.exports = fetchAndStoreMatches;
