const express = require('express');
const {
    scrapeNavBarDataController,
    getNavBarDataController
} = require('../controller/navbarController.js');
const { getJobStatus } = require('../jobs/navbarScraper.js');
const router = express.Router();

router.post('/scraper', scrapeNavBarDataController);
router.get('/', getNavBarDataController);
router.get('/status', (req, res) => {
    res.status(200).json(getJobStatus())
})
module.exports = router;
