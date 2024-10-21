const express = require('express');
const {
    scraperMatchLayout,
    scrapeCommentaryController,
    scrapeMatchInfoController,
    scrapeAllMatches,
    getMatchLayout,
    getCommentary,
    getMatchInfo,
    getAllMatches,
    getLiveMatchScores
} = require('../controller/matchController');

const router = express.Router();
router.post('/scrapper/all', scrapeAllMatches);
router.post('/scrapper/layout/:param1/:param2/:param3/:param4/:param5/:param6', scraperMatchLayout);
router.post('/scrapper/com/:param1/:param2/:param3/:param4/:param5/:param6/:limit', scrapeCommentaryController);
router.post("/scrapper/scoreboard/:param1/:param2/:param3/:param4/:param5/:param6/:sub", scrapeMatchInfoController);

router.get('/all', getAllMatches);
router.get('/layout/:param1/:param2/:param3/:param4/:param5/:param6', getMatchLayout);
router.get('/com/:param1/:param2/:param3/:param4/:param5/:param6/:limit', getCommentary);
router.get("/scoreboard/:param1/:param2/:param3/:param4/:param5/:param6/:sub", getMatchInfo);

module.exports = router;
