const express = require('express');
const {
    scrapeSeriesSubRoute,
    getSeriesSubRoute
} = require('../controller/seriesController.js');
const router = express.Router();

router.post("/scrapper/:slug/:subSlug/:subroute", scrapeSeriesSubRoute);
router.get("/:slug/:subSlug/:subroute", getSeriesSubRoute);

module.exports = router;