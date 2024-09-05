const express = require('express');
const { 
    getProfileLayout
 } = require('../controller/playerController.js');
const router = express.Router();

router.get('/layout/:slug/:subSlug', getProfileLayout);

module.exports = router;
