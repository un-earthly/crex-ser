const express = require('express');
const {
    shuffleStatsCorner,
    getshuffleStatsCorner
} = require('../controller/statsCornerController');
const router = express.Router();

router.post('/scraper/suffle', shuffleStatsCorner);
router.get('/suffle', getshuffleStatsCorner);

module.exports = router;
