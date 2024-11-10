const {
    scrapeNewsBlogs,
    getBlogDetailsData,
    getNewsBlogsData
} = require("../service/newsBlogsService");
const { cacheMiddleware } = require("../utility");


const scrapeNewsBlogsController = async (req, res) => {
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

const getNewsBlogsController = async (req, res) => {
    const { clicks } = req.query;
    console.log(clicks)
    try {
        const data = await getNewsBlogsData(parseInt(clicks) + 1);
        res.json(data);
    } catch (error) {
        console.error('Error fetching news blogs:', error);
        res.status(500).json({ error: 'Failed to fetch news blogs' });
    }
};
const getBlogDetailsController = async (req, res) => {
    const { slug, cat, id } = req.params;
    try {
        const url = `${cat}/${slug}/${id}`;
        const blogDetails = await getBlogDetailsData(url);
        res.json(blogDetails);
    } catch (error) {
        console.error('Error fetching blog details:', error);
        res.status(500).json({ error: 'Failed to fetch blog details' });
    }
};

module.exports = {
    scrapeNewsBlogs: [cacheMiddleware, scrapeNewsBlogsController],
    getNewsBlogs: [cacheMiddleware, getNewsBlogsController],
    getBlogDetails: [cacheMiddleware, getBlogDetailsController]
};
