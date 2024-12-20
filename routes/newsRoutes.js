const express = require('express');
const { getNewsBlogs, getBlogDetails, scrapeBlogDetails, scrapeNewsBlogs } = require('../controller/newsController');
const router = express.Router();

router.post('/scraper', scrapeNewsBlogs);
router.get('/', getNewsBlogs);
router.get('/:cat/:slug/:id', getBlogDetails);
module.exports = router;
