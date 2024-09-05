const express = require('express');
const {
    getFixtureMatch,
    getTeamFixtureMatch
} = require('../controller/fixturesController');

const router = express.Router();
router.get('/match-list', getFixtureMatch);
router.get('/team-list', getTeamFixtureMatch);

module.exports = router;
