const express = require('express');
const {
    scrapeSeriesOverview,
    scrapeSeriesSubRoute,
    getSeriesOverview,
    getSeriesSubRoute
} = require('../controller/seriesController.js');

const router = express.Router();
router.post('/scrapper/:slug/:subSlug', scrapeSeriesOverview);
router.post("/scrapper/:slug/:subSlug/:subroute", scrapeSeriesSubRoute)
router.get('/:slug/:subSlug', getSeriesOverview);
router.get("/:slug/:subSlug/:subroute", getSeriesSubRoute)


module.exports = router;
