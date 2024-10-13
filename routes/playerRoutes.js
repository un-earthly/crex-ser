const express = require('express');
const { 
    getProfileLayout,
    scrapeProfileLayout
 } = require('../controller/playerController.js');
const router = express.Router();

router.get('/scrape/layout/:slug/:subSlug', scrapeProfileLayout);
router.get('/layout/:slug/:subSlug', getProfileLayout);

module.exports = router;
