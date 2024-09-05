const NodeCache = require("node-cache");
const { scrapeNavBarData } = require("../service/navService");
const cache = new NodeCache({ stdTTL: 3600 });

async function scrapeNavBarDataController(req, res) {
    try {
        const cachedData = cache.get('navData');
        if (cachedData) {
            return res.json(cachedData);
        }
        const navData = await scrapeNavBarData();
        cache.set('navData', navData);
        res.json(navData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to scrape navbar data', error: error.message });
    }
}

module.exports = {
    scrapeNavBarDataController
}