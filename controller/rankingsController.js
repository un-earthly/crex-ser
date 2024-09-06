const {
    scrapeCricketRankings,
    scrapeRankings
} = require('../service/rankingService.js');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 });

const getRankings = async (req, res) => {
    const { gen, cat } = req.params;
    const cacheKey = `${gen.toLowerCase()}_${cat.toLowerCase()}`;
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
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }
    try {
        const data = await scrapeFunction(url);
        cache.set(cacheKey, data);
        res.json(data);
    } catch (error) {
        console.log(error)
        res.status(500).send('An error occurred while fetching rankings');
    }
};

module.exports = { getRankings };
