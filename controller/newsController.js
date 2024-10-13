const { scrapeNewsBlogs, scrapeBlogDetails, getBlogDetailsData, getNewsBlogsData } = require("../service/newsBlogsService");
const { cacheMiddleware } = require("../utility");


const scrapeNewsBlogs = async (req, res) => {
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
const scrapeBlogDetails = async (req, res) => {
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

const getNewsBlogsController = async (req, res) => {
    try {
        const data = await getNewsBlogsData();
        res.json(data);
    } catch (error) {
        console.error('Error fetching news blogs:', error);
        res.status(500).json({ error: 'Failed to fetch news blogs' });
    }
};
const getBlogDetailsController = async (req, res) => {
    const { slug, cat, id } = req.params;
    try {
        const url = `https://cricket.one/${cat}/${slug}/${id}`;
        const blogDetails = await getBlogDetailsData(url);
        res.json(blogDetails);
    } catch (error) {
        console.error('Error fetching blog details:', error);
        res.status(500).json({ error: 'Failed to fetch blog details' });
    }
};

module.exports = {
    scrapeNewsBlogs: [cacheMiddleware, scrapeNewsBlogs],
    scrapeBlogDetails: [cacheMiddleware, scrapeBlogDetails],
    getNewsBlogs: [cacheMiddleware, getNewsBlogsController],
    getBlogDetails: [cacheMiddleware, getBlogDetailsController]
};
