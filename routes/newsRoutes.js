const express = require('express');
const { getNewsBlogs, getBlogDetails } = require('../controller/newsController');
const router = express.Router();

router.get('/news-blogs', getNewsBlogs);
router.get('/news-blogs/:cat/:slug/:id', getBlogDetails);

module.exports = router;
