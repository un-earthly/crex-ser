const {
    scrapeCricketRankings,
    scrapeRankings,
    getPlayerRankings,
    getTeamRankings
} = require('../service/rankingService.js');
const { cacheMiddleware } = require('../utility/cache.js');
const scrapeRankingsController = async (req, res) => {
    const { gen, cat } = req.params;
    let url = `${process.env.BASE}/rankings/${gen.toLowerCase()}/${cat.toLowerCase()}`;
    let scrapeFunction;

    switch (gen.toLowerCase()) {
        case 'men':
        case 'women':
            switch (cat.toLowerCase()) {
                case 'teams':
                    scrapeFunction = scrapeCricketRankings;
                    break;
                case 'batter':
                case 'bowler':
                case 'allrounder':
                    scrapeFunction = scrapeRankings;
                    break;
                default:
                    return res.status(400).send('Invalid category');
            }
            break;
        default:
            return res.status(400).send('Invalid gender');
    }
    try {
        const data = await scrapeFunction(url);
        res.json(data);
    } catch (error) {
        console.log(error)
        res.status(500).send('An error occurred while fetching rankings');
    }
};
const getRankingsController = async (req, res) => {
    const { gen, cat } = req.params;
    let url = `${process.env.BASE}/rankings/${gen.toLowerCase()}/${cat.toLowerCase()}`;
    let scrapeFunction;

    switch (gen.toLowerCase()) {
        case 'men':
        case 'women':
            switch (cat.toLowerCase()) {
                case 'teams':
                    scrapeFunction = getTeamRankings;
                    break;
                case 'batter':
                case 'bowler':
                case 'allrounder':
                    scrapeFunction = getPlayerRankings;
                    break;
                default:
                    return res.status(400).send('Invalid category');
            }
            break;
        default:
            return res.status(400).send('Invalid gender');
    }
    try {
        const data = await scrapeFunction(url);
        res.json(data);
    } catch (error) {
        console.log(error)
        res.status(500).send('An error occurred while fetching rankings');
    }
};

module.exports = {
    scrapeRankingsController: [cacheMiddleware, scrapeRankingsController],
    getRankingsController: [cacheMiddleware, getRankingsController]
};
