const { scrapeNavBarData } = require("../service/navService");
const { cacheMiddleware } = require("../utility");


async function scrapeNavBarDataController(req, res) {
    try {
        const navData = await scrapeNavBarData();
        res.json(navData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to scrape navbar data', error: error.message });
    }
}
async function getNavBarDataController(req, res) {
    try {
        const navData = await getNavBarData();
        res.json(navData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get navbar data', error: error.message });
    }
}
module.exports = {
    scrapeNavBarDataController: [cacheMiddleware, scrapeNavBarDataController],
    getNavBarDataController: [cacheMiddleware, getNavBarDataController]
};
