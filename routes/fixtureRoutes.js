const express = require('express');
const {
    getFixtureMatch,
    getTeamFixtureMatch,
    getSeriesFixture
} = require('../controller/fixturesController');

const router = express.Router();
router.get('/match-list', getFixtureMatch);
router.get('/team-list', getTeamFixtureMatch);
router.get('/series-list', getSeriesFixture);

module.exports = router;
