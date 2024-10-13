const express = require('express');
const { getRankingsController, scrapeRankingsController } = require('../controller/rankingsController');
const router = express.Router();

router.post('/scrapper/:gen/:cat', scrapeRankingsController);
router.get('/:gen/:cat', getRankingsController);

module.exports = router;
