const { createPage } = require("../utility");
const connectDB = require("../db.config");

async function scrapeShuffledStatsData(url, maxRetries = 3) {
    const page = await createPage();

    try {
        for (let retry = 0; retry < maxRetries; retry++) {
            try {
                await page.goto(url, {
                    waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
                    timeout: 60000
                });
                await page.waitForSelector(".stats-header", { timeout: 10000 });
                await page.waitForSelector('tbody tr', { timeout: 10000 });
                const data = await page.evaluate(() => {
                    const safeGetText = (element, selector) => {
                        const el = element.querySelector(selector);
                        return el ? el.textContent.trim() : '';
                    };

                    const safeGetAttribute = (element, selector, attribute) => {
                        const el = element.querySelector(selector);
                        return el ? el.getAttribute(attribute) : null;
                    };

                    // Table data scraping
                    const tableData = (() => {
                        const rows = document.querySelectorAll('tbody tr');
                        return Array.from(rows, row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length === 0) return null;

                            return {
                                rank: safeGetText(row, 'td:first-child'),
                                player: {
                                    name: safeGetText(row, '.p-name'),
                                    image: safeGetAttribute(row, '.player-img img', 'src')
                                },
                                team: {
                                    name: safeGetText(row, '.team'),
                                    image: safeGetAttribute(row, '.team-flag img', 'src')
                                },
                                strikeRate: safeGetText(row, 'td:nth-child(4)'),
                                matches: safeGetText(row, 'td:nth-child(5)'),
                                innings: safeGetText(row, 'td:nth-child(6)'),
                                highestScore: safeGetText(row, 'td:nth-child(7)'),
                                average: safeGetText(row, 'td:nth-child(8)'),
                                runs: safeGetText(row, 'td:nth-child(9)'),
                                hundreds: safeGetText(row, 'td:nth-child(10)'),
                                fifties: safeGetText(row, 'td:nth-child(11)'),
                                fours: safeGetText(row, 'td:nth-child(12)'),
                                sixes: safeGetText(row, 'td:nth-child(13)')
                            };
                        }).filter(Boolean);
                    })();

                    // Stats corner data scraping
                    const statsCornerData = (() => {
                        const statsHeader = document.querySelector('.stats-header');
                        if (!statsHeader) return null;

                        const title = safeGetText(statsHeader, '.heading-wrapper h1 span');

                        const players = Array.from(statsHeader.querySelectorAll('.player-img')).map(playerDiv => ({
                            name: safeGetText(playerDiv, 'p'),
                            score: safeGetText(playerDiv, '.score'),
                            image: safeGetAttribute(playerDiv, 'img', 'src')
                        }));

                        return { title, players };
                    })();

                    return { tableData, statsCornerData };
                });

                await saveStatsData(data);
                return data;
            } catch (error) {
                console.error(`Attempt ${retry + 1} failed:`, error);
                if (retry === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);

    } finally {
        await page.close();
    }
}

async function saveStatsData(statsData) {
    const db = await connectDB();
    try {
        const collection = db.collection('cricketStats');
        const timestamp = new Date();
        await collection.insertOne({
            ...statsData,
            timestamp
        });
        console.log('Stats data saved to MongoDB');
    } catch (error) {
        console.error('Error saving stats data to MongoDB:', error);
        throw error;
    }
}

async function getLatestStatsData() {
    const db = await connectDB();
    try {
        const collection = db.collection('cricketStats');
        const result = await collection.find().sort({ timestamp: -1 }).limit(1).toArray();
        return result[0];
    } catch (error) {
        console.error('Error fetching latest stats data from MongoDB:', error);
        throw error;
    }
}

async function getStatsDataByDateRange(startDate, endDate) {
    const db = await connectDB();
    try {
        const collection = db.collection('cricketStats');
        const result = await collection.find({
            timestamp: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).toArray();
        return result;
    } catch (error) {
        console.error('Error fetching stats data by date range from MongoDB:', error);
        throw error;
    }
}

async function getPlayerStats(playerName) {
    const db = await connectDB();
    try {
        const collection = db.collection('cricketStats');
        const result = await collection.find({
            'tableData.player.name': playerName
        }).sort({ timestamp: -1 }).limit(1).toArray();
        return result[0]?.tableData.find(player => player.player.name === playerName);
    } catch (error) {
        console.error('Error fetching player stats from MongoDB:', error);
        throw error;
    }
}

module.exports = {
    scrapeShuffledStatsData,
    getLatestStatsData,
    getStatsDataByDateRange,
    getPlayerStats
};