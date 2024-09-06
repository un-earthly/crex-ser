const { scrapeNavBarData } = require("../service/navService");

async function scrapeNavBarDataController(req, res) {
    try {
        const navData = await scrapeNavBarData();
        res.json(navData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to scrape navbar data', error: error.message });
    }
}

module.exports = {
    scrapeNavBarDataController
}