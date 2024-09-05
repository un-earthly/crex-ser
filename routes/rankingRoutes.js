const express = require('express');
const { getRankings } = require('../controller/rankingsController');
const router = express.Router();

router.get('/:gen/:cat', getRankings);

module.exports = router;
