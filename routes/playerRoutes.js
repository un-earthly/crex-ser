const express = require('express');
const {
    getProfileLayout,
    scrapeProfileLayout
} = require('../controller/playerController.js');
const router = express.Router();

router.get('/scraper/layout/:slug/:subSlug', scrapeProfileLayout);
router.get('/layout/:slug/:subSlug', getProfileLayout);

module.exports = router;
