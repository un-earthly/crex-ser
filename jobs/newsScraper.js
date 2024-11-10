const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { scrapeNewsBlogs } = require('../service/newsBlogsService');


// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Logger function
const logMessage = (message, isError = false) => {
    const timestamp = new Date().toISOString();
    const logFile = path.join(logsDir, `scraper-${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = `${timestamp} - ${message}\n`;

    console.log(logEntry);
    fs.appendFileSync(logFile, logEntry);

    if (isError) {
        const errorFile = path.join(logsDir, `errors-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(errorFile, logEntry);
    }
};

// Function to run the scraper
const runScraper = async () => {
    try {
        logMessage('Starting news blog scraping...');

        // You can adjust the number of clicks as needed
        const results = await scrapeNewsBlogs();

        logMessage(`Scraping completed successfully. Processed ${results.length} blogs.`);

        // Optional: Log some statistics
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


// Handle process termination gracefully
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
