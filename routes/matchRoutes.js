const express = require('express');
const {
    scraperMatchLayout,
    scrapeCommentaryController,
    scrapeMatchInfoController,
    scrapeAllMatches,
    getMatchLayout,
    getCommentary,
    getMatchInfo,
    getAllMatches
} = require('../controller/matchController');

const router = express.Router();
// Scraping routes (POST)
router.post('/scraper/all', scrapeAllMatches);
router.post('/scraper/layout/:param1/:param2/:param3/:param4/:param5/:param6', scraperMatchLayout);
router.post('/scraper/com/:param1/:param2/:param3/:param4/:param5/:param6/:limit', scrapeCommentaryController);
router.post("/scraper/scoreboard/:param1/:param2/:param3/:param4/:param5/:param6/:sub", scrapeMatchInfoController);

// Database retrieval routes (GET)
router.get('/all', getAllMatches);
router.get('/layout/:param1/:param2/:param3/:param4/:param5/:param6', getMatchLayout);
router.get('/com/:param1/:param2/:param3/:param4/:param5/:param6/:limit', getCommentary);
router.get("/scoreboard/:param1/:param2/:param3/:param4/:param5/:param6/:sub", getMatchInfo);

module.exports = router;
