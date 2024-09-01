const chromium = require('chrome-aws-lambda');

async function initBrowserAndPage() {
    let browser;
    let page;
    if (!browser) {
        await chromium.puppeteer.launch({
            args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: true,
            ignoreHTTPSErrors: true,
        })
    }

    // Always create a new page for each request
    page = await browser.newPage();
    return { page, browser }
}
// Function to clear cache
function clearCache() {
    cache.flushAll();
    console.log('Cache cleared');
}

// Function to get cache stats
function getCacheStats() {
    return cache.getStats();
}
const getCacheKey = (slug, subSlug, subroute) => `${slug}:${subSlug}:${subroute}`;
module.exports = {
    initBrowserAndPage,
    clearCache,
    getCacheStats,
    getCacheKey
}