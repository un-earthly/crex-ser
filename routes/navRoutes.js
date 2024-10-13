const express = require('express');
const {
    scrapeNavBarDataController,
    getNavBarDataController
} = require('../controller/navbarController.js');
const router = express.Router();

router.get('/scrape', scrapeNavBarDataController);
router.get('/', getNavBarDataController);

module.exports = router;
