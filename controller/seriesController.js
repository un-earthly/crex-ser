const {
    seriesScrapper,
    scrapeSeriesInfo,
    scrapeSeriesNews,
    scrapeSeriesStats,
    scrapePointsTable,
    scrapeTeamSquad,
    scrapeMatchesInfo,
    getSeriesInfo,
    getSeriesNews,
    getSeriesStats,
    getPointsTable,
    getSquadData,
    getMatchesInfo
} = require('../service/seriesDetails');
const { cacheMiddleware } = require('../utility');

// Map of route handlers for scraping and getting data
const routeHandlers = {
    '': {
        scrape: seriesScrapper,
        get: seriesScrapper
    },
    'info': {
        scrape: scrapeSeriesInfo,
        get: getSeriesInfo
    },
    'news': {
        scrape: scrapeSeriesNews,
        get: getSeriesNews
    },
    'series-stats': {
        scrape: scrapeSeriesStats,
        get: getSeriesStats
    },
    'points-table': {
        scrape: scrapePointsTable,
        get: getPointsTable
    },
    'team-squad': {
        scrape: scrapeTeamSquad,
        get: getSquadData
    },
    'matches': {
        scrape: scrapeMatchesInfo,
        get: getMatchesInfo
    }
};

// Helper function to build the base URL
const buildBaseUrl = (slug, subSlug, subroute = '') => {
    return `${process.env.BASE}/series/${slug}/${subSlug}${subroute ? `/${subroute}` : ''}`;
};

// Generic handler for both scraping and getting data
const handleSeriesRequest = (isScraping = false) => async (req, res) => {
    try {
        const { slug, subSlug, subroute = '' } = req.params;

        if (!routeHandlers[subroute]) {
            return res.status(404).json({
                error: 'Invalid subroute',
                message: `Subroute '${subroute}' not found`,
                validRoutes: Object.keys(routeHandlers)
            });
        }

        const handler = isScraping ?
            routeHandlers[subroute].scrape :
            routeHandlers[subroute].get;

        const baseUrl = buildBaseUrl(slug, subSlug, subroute);
        const data = await handler(baseUrl);

        if (!data) {
            return res.status(404).json({
                error: 'Data not found',
                message: `No data found for ${baseUrl}`
            });
        }

        res.json({ data });

    } catch (error) {
        console.error(`Error in series ${isScraping ? 'scraping' : 'fetching'}:`, error);
        res.status(500).json({
            error: `Failed to ${isScraping ? 'scrape' : 'retrieve'} series data`,
            details: error.message,
            path: req.path
        });
    }
};

// Export the controller functions with caching middleware
module.exports = {
    scrapeSeriesSubRoute: [cacheMiddleware, handleSeriesRequest(true)],
    getSeriesSubRoute: [cacheMiddleware, handleSeriesRequest(false)]
};