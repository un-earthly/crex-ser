const { default: axios } = require("axios");

async function fetchAndStoreNews() {
    const page = await createPage();
    const db = await connectDB();
    try {
        // Scrape main news
        await axios.post(`${process.env.BASE_SERVER}/api/news-blogs/scraper`);

        // Get existing news links to scrape individual blog details
        const newsCollection = db.collection('newsBlogs');
        const newsData = await newsCollection.findOne({ id: 'newsBlogs' });

        if (newsData && newsData.data) {
            for (const news of newsData.data) {
                if (news.link) {
                    const [cat, slug, id] = news.link.split('/').filter(Boolean);
                    try {
                        await axios.post(`${process.env.BASE_SERVER}/api/news-blogs/scraper/${cat}/${slug}/${id}`);
                        console.log(`Fetched blog details for ${news.link}`);
                    } catch (error) {
                        console.error(`Error fetching blog details for ${news.link}:`, error.message);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in news scraper:', error);
    } finally {
        await page.close();
    }
}