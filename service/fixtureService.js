const connectDB = require("../db.config");
const { createPage, navigateAndWait, scrapeData } = require("../utility");

async function scrapeFixtureMatches(pageOffset = 0) {
    const page = await createPage();
    try {
        await navigateAndWait(page, process.env.BASE + '/fixtures/match-list', pageOffset);

        const matchesByDate = await scrapeData(page, '.date-wise-matches-card', () => {
            const dateSections = document.querySelectorAll('.date-wise-matches-card > div');
            const result = [];

            dateSections.forEach(section => {
                const dateElement = section.querySelector('.date div');
                if (!dateElement) return;

                const date = dateElement.textContent.trim();
                const matchElements = section.querySelectorAll('.match-card-container');

                const matches = Array.from(matchElements).map(element => {
                    const link = element.querySelector('a').href.replace('https://crex.live', '');
                    const teams = element.querySelectorAll('.team-name');
                    const scores = element.querySelectorAll('.team-score');
                    const overs = element.querySelectorAll('.total-overs');
                    const result = element.querySelector('.result span');
                    const matchInfo = element.querySelector('.reason');
                    const startTime = element.querySelector('.not-started');
                    const logos = element.querySelectorAll("img");
                    return {
                        link,
                        team1: teams[0]?.textContent.trim(),
                        team2: teams[1]?.textContent.trim(),
                        score1: scores[0]?.textContent.trim(),
                        score2: scores[1]?.textContent.trim(),
                        logo1: logos[0]?.src,
                        logo2: logos[1]?.src,
                        overs1: overs[0]?.textContent.trim(),
                        overs2: overs[1]?.textContent.trim(),
                        result: result?.textContent.trim() || 'Upcoming',
                        matchInfo: matchInfo?.textContent.trim() || startTime?.innerText.split("\n")[2],
                        startTime: startTime && startTime.innerText.split("\n")[0]
                    };
                });

                result.push({ date, matches });
            });

            return result;
        });

        return matchesByDate;
    } catch (e) {
        console.error('Error fetching matches:', e);
        throw e;
    }
}

async function scrapeAndSaveSeries(url, pageOffset = 0) {
    const page = await createPage();
    try {
        await navigateAndWait(page, url, pageOffset);

        const seriesData = await scrapeData(page, '.serieswise', () => {
            const series = [];
            const monthDivs = document.querySelectorAll('.serieswise');

            monthDivs.forEach((monthDiv) => {
                const month = monthDiv.querySelector('.s_date span').textContent.trim();
                const seriesCards = monthDiv.querySelectorAll('.series-card');

                seriesCards.forEach((card) => {
                    const name = card.querySelector('.series-name').textContent.trim();
                    const dateRange = card.querySelector('.series-desc span').textContent.trim();
                    const imgSrc = card.querySelector('img').src;
                    const link = card.href?.replace("https://crex.live", "");

                    series.push({
                        month,
                        name,
                        dateRange,
                        imgSrc,
                        link
                    });
                });
            });

            return series;
        });

        return {
            seriesData,
            message: `${seriesData.length} series were successfully scraped.`
        };

    } catch (error) {
        console.error('Error during scraping or database operation:', error);
        throw error;
    }
}
async function getFixtures(page = 1, pageSize = 10, dateRange = null) {
    try {
        const db = await connectDB();
        if (!db) {
            throw new Error('Database connection failed');
        }

        const fixturesCollection = db.collection("fixtures");

        let query = {};
        if (dateRange) {
            query.date = { $gte: dateRange.start, $lte: dateRange.end };
        }

        const totalFixtures = await fixturesCollection.countDocuments(query);
        const fixtures = await fixturesCollection.find(query)
            .sort({ date: 1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .toArray();

        return {
            fixtures,
            totalFixtures,
            currentPage: page,
            totalPages: Math.ceil(totalFixtures / pageSize)
        };
    } catch (error) {
        console.error('Error retrieving fixtures from database:', error);
        throw error;
    }
}

async function getSeries(page = 1, pageSize = 10, searchTerm = '') {
    try {
        const db = await connectDB();
        if (!db) {
            throw new Error('Database connection failed');
        }

        const seriesCollection = db.collection("series");

        let query = {};
        if (searchTerm) {
            query.name = { $regex: searchTerm, $options: 'i' };
        }

        const totalSeries = await seriesCollection.countDocuments(query);
        const series = await seriesCollection.find(query)
            .sort({ month: -1, name: 1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .toArray();

        return {
            series,
            totalSeries,
            currentPage: page,
            totalPages: Math.ceil(totalSeries / pageSize)
        };
    } catch (error) {
        console.error('Error retrieving series from database:', error);
        throw error;
    }
}

async function getTeams(page = 1, pageSize = 10, searchTerm = '') {
    try {
        let db;
        if (!db) {
            db = await connectDB();
            if (!db) {
                throw new Error('Database connection failed');
            }
        }

        const teamsCollection = db.collection("teams");

        const query = searchTerm ? { name: { $regex: searchTerm, $options: 'i' } } : {};
        console.log(query);

        const options = {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            sort: { name: 1 }
        };
        const teams = await teamsCollection.find(query, options).toArray();

        const totalTeams = await teamsCollection.countDocuments(query);

        return { teams, totalTeams };

    } catch (error) {
        console.error('Error retrieving teams from database:', error);
        throw error;
    }
};

module.exports = {
    scrapeFixtureMatches,
    scrapeAndSaveSeries,
    getTeams,
    getFixtures,
    getSeries
};
