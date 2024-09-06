
const { seriesScrapper, scrapeSeriesInfo, scrapeSeriesNews, scrapeSeriesStats, scrapePointsTable, scrapeTeamSquad, scrapeMatchesInfo } = require('../service/seriesDetails');


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


module.exports = {
    scrapeSeriesOverview,
    scrapeSeriesSubRoute
}