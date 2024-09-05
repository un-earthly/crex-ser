const express = require('express');
const {
    scrapeSeriesOverview,
    scrapeSeriesSubRoute
} = require('../controller/seriesController.js');

const router = express.Router();
router.get('/:slug/:subSlug', scrapeSeriesOverview);
router.get("/:slug/:subSlug/:subroute", scrapeSeriesSubRoute)


module.exports = router;
