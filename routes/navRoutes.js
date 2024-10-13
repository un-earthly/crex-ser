const express = require('express');
const {
    scrapeNavBarDataController,
    getNavBarDataController
} = require('../controller/navbarController.js');
const router = express.Router();

router.post('/scraper', scrapeNavBarDataController);
router.get('/', getNavBarDataController);

module.exports = router;
