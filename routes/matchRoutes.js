const express = require('express');
const {
    scraperMatchLayout,
    scrapeCommentaryController,
    scrapeMatchInfoController,
    scrapeAllMatches
} = require('../controller/matchController');

const router = express.Router();
router.get('/all', scrapeAllMatches);
router.get('/layout/:param1/:param2/:param3/:param4/:param5/:param6', scraperMatchLayout);
router.get('/com/:param1/:param2/:param3/:param4/:param5/:param6/:limit', scrapeCommentaryController);
router.get("/scoreboard/:param1/:param2/:param3/:param4/:param5/:param6/:sub", scrapeMatchInfoController)


module.exports = router;
