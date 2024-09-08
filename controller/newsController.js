const { scrapeNewsBlogs, scrapeBlogDetails } = require("../service/newsBlogsService");
const { cacheMiddleware } = require("../utility");


const getNewsBlogs = async (req, res) => {
    const { clicks } = req.query;
    try {
        const clickCount = clicks ? parseInt(clicks) : 0;
        const data = await scrapeNewsBlogs(clickCount);
        res.json(data);
    } catch (error) {
        console.error('Error fetching news blogs:', error);
        res.status(500).json({ error: 'Failed to fetch news blogs' });
    }
};
const getBlogDetails = async (req, res) => {
    const { slug, cat, id } = req.params;
    try {
        const url = `https://cricket.one/${cat}/${slug}/${id}`;
        const blogDetails = await scrapeBlogDetails(url);
        res.json(blogDetails);
    } catch (error) {
        console.error('Error fetching blog details:', error);
        res.status(500).json({ error: 'Failed to fetch blog details' });
    }
};


module.exports = {
    getNewsBlogs: [cacheMiddleware, getNewsBlogs],
    getBlogDetails: [cacheMiddleware, getBlogDetails]
};
