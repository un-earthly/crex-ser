const { getTeams, scrapeFixtureMatches, scrapeAndSaveSeries, getFixtures, getSeries } = require("../service/fixtureService");
const { cacheMiddleware } = require("../utility");

async function scrapeFixtureMatch(req, res) {
    try {
        const matches = await scrapeFixtureMatches(req.query.offset);
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching the data' });
    }
}

async function scrapeSeriesFixture(req, res) {
    try {
        const data = await scrapeAndSaveSeries(process.env.BASE + '/fixtures/series-list', req.query.offset)
        res.json(data);
    } catch (error) {
        console.error('Error scraping navbar data:', error);
        res.status(500).json({ error: 'Failed to scrape navbar data' });
    }
}
const getSeriesFixture = async (req, res) => {
    try {
        const { page, pageSize, search } = req.query;
        const seriesData = await getSeries(parseInt(page), parseInt(pageSize), search);
        res.json(seriesData);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving series' });
    }
};
async function getTeamFixtureMatch(req, res) {
    const { searchTerm, page } = req.query;
    try {
        const data = await getTeams(page, 100, searchTerm)
        res.json(data);
    } catch (error) {
        console.error('Error scraping navbar data:', error);
        res.status(500).json({ error: 'Failed to scrape navbar data' });
    }
}
const getFixtureMatch = async (req, res) => {
    try {
        const { page, pageSize, startDate, endDate } = req.query;
        const dateRange = startDate && endDate ? { start: new Date(startDate), end: new Date(endDate) } : null;
        const fixturesData = await getFixtures(parseInt(page), parseInt(pageSize), dateRange);
        res.json(fixturesData);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving fixtures' });
    }
}
module.exports = {
    scrapeFixtureMatch: [cacheMiddleware, scrapeFixtureMatch],
    scrapeSeriesFixture: [cacheMiddleware, scrapeSeriesFixture],
    getTeamFixtureMatch: [cacheMiddleware, getTeamFixtureMatch],
    getSeriesFixture: [cacheMiddleware, getSeriesFixture],
    getFixtureMatch: [cacheMiddleware, getFixtureMatch]

};