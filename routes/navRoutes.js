const express = require('express');
const {
    scrapeNavBarDataController
} = require('../controller/navbarController.js');
const router = express.Router();

router.get('/', scrapeNavBarDataController);

module.exports = router;
