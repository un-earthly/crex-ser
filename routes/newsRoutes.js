// newsRoutes.js
const express = require('express');
const router = express.Router();
const { scrapeNewsData, getNewsData } = require('../controller/newsController');

router.post('/clickReadMore', async (req, res) => {

    try {
        const data = await scrapeNewsData();
        if (data) {
            res.json({ success: true, message: `Read More button clicked 20 times successfully` });
        } else {
            res.status(500).json({ error: 'Failed to scrape data' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while clicking the Read More button' });
    }
});

router.get('/getNewsData', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 3;

    const newsData = getNewsData(page, itemsPerPage);

    if (newsData) {
        res.json({ success: true, ...newsData });
    } else {
        res.status(404).json({ error: 'No data available. Please initiate scraping.' });
    }
});

module.exports = router;