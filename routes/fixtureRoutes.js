const express = require('express');
const {
    getFixtureMatch,
    getTeamFixtureMatch,
    getSeriesFixture,
    scrapeSeriesFixture,
    scrapeFixtureMatch
} = require('../controller/fixturesController');

const router = express.Router();
router.get('/team-list', getTeamFixtureMatch);
router.get('/match-list', getFixtureMatch);
router.get('/series-list', getSeriesFixture);
router.post('/scrapper/match', scrapeFixtureMatch);
router.post('/scrapper/series', scrapeSeriesFixture);

module.exports = router;
