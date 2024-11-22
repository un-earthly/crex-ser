const cron = require('node-cron');
const { scrapeNewsBlogs } = require('../service/newsBlogsService');
const logMessage = require('../logger');

const runScraper = async () => {
    try {
        logMessage('Starting news blog scraping...');
        const results = await scrapeNewsBlogs();
        logMessage(`Scraping completed successfully. Processed ${results.length} blogs.`);
        const blogsWithDetails = results.filter(blog => blog.details).length;
        logMessage(`Blogs with details: ${blogsWithDetails}/${results.length}`);

    } catch (error) {
        logMessage(`Scraping failed: ${error.message}`, true);
        logMessage(`Stack trace: ${error.stack}`, true);
    }
};

cron.schedule('0 * * * *', async () => {
    logMessage('Initiating scheduled scraping task');
    await runScraper();
});

process.on('SIGINT', () => {
    logMessage('Scraper process terminated');
    process.exit();
});

process.on('uncaughtException', (error) => {
    logMessage(`Uncaught Exception: ${error.message}`, true);
    logMessage(`Stack trace: ${error.stack}`, true);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logMessage(`Unhandled Rejection at: ${promise}, reason: ${reason}`, true);
    process.exit(1);
});


module.exports = { newsScrapper: runScraper };