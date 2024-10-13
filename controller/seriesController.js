
const { seriesScrapper, scrapeSeriesInfo, scrapeSeriesNews, scrapeSeriesStats, scrapePointsTable, scrapeTeamSquad, scrapeMatchesInfo, getSeriesInfo, getSeriesNews, getSeriesStats, getPointsTable, getMatchesInfo, getSquadData } = require('../service/seriesDetails');
const { cacheMiddleware } = require('../utility');


async function scrapeSeriesOverview(req, res) {
    try {
        const { slug, subSlug } = req.params;

        const data = await seriesScrapper(process.env.BASE + '/series/' + slug + "/" + subSlug);

      
        res.json({ data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to retrieve series' });
    }
}
async function scrapeSeriesSubRoute(req, res) {
    const { slug, subSlug, subroute } = req.params;
    if (!slug || !subSlug || !subroute) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    try {
        const { slug, subSlug, subroute } = req.params;
      
        let data;
        const baseUrl = `${process.env.BASE}/series/${slug}/${subSlug}/${subroute}`;

        switch (subroute) {
            case 'info':
                data = await scrapeSeriesInfo(baseUrl);
                break;
            case 'news':
                data = await scrapeSeriesNews(baseUrl);
                break;
            case 'series-stats':
                data = await scrapeSeriesStats(baseUrl);
                break;
            case 'points-table':
                data = await scrapePointsTable(baseUrl);
                break;
            case 'team-squad':
                data = await scrapeTeamSquad(baseUrl);
                break;
            case 'matches':
                data = await scrapeMatchesInfo(baseUrl);
                break;
            default:
                return res.status(404).json({ error: 'Invalid subroute' });
        }

        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve series data', details: error.message });
    }
}

async function getSeriesOverview(req, res) {
    try {
        const { slug, subSlug } = req.params;

        const data = await seriesScrapper(process.env.BASE + '/series/' + slug + "/" + subSlug);


        res.json({ data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to retrieve series' });
    }
}
async function getSeriesSubRoute(req, res) {
    const { slug, subSlug, subroute } = req.params;
    if (!slug || !subSlug || !subroute) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    try {
        const { slug, subSlug, subroute } = req.params;

        let data;
        const baseUrl = `${process.env.BASE}/series/${slug}/${subSlug}/${subroute}`;

        switch (subroute) {
            case 'info':
                data = await getSeriesInfo(baseUrl);
                break;
            case 'news':
                data = await getSeriesNews(baseUrl);
                break;
            case 'series-stats':
                data = await getSeriesStats(baseUrl);
                break;
            case 'points-table':
                data = await getPointsTable(baseUrl);
                break;
            case 'team-squad':
                data = await getSquadData(baseUrl);
                break;
            case 'matches':
                data = await getMatchesInfo(baseUrl);
                break;
            default:
                return res.status(404).json({ error: 'Invalid subroute' });
        }

        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve series data', details: error.message });
    }
}


module.exports = {
    scrapeSeriesOverview: [cacheMiddleware, scrapeSeriesOverview],
    scrapeSeriesSubRoute: [cacheMiddleware, scrapeSeriesSubRoute],
    getSeriesSubRoute: [cacheMiddleware, getSeriesSubRoute],
    getSeriesOverview: [cacheMiddleware, getSeriesOverview] 
};
