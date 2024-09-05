const express = require('express');
const { getNewsBlogs, getBlogDetails } = require('../controller/newsController');
const router = express.Router();

router.get('/', getNewsBlogs);
router.get('/:cat/:slug/:id', getBlogDetails);

module.exports = router;
