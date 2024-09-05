const express = require('express');
const { shuffleStatsCorner } = require('../controller/statsCornerController');
const router = express.Router();

router.get('/suffle', shuffleStatsCorner);

module.exports = router;
