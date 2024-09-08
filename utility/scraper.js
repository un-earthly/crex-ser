async function scrapingMiddleware(page, selector, scrapeFunction) {
    try {
        await page.waitForSelector(selector, { timeout: 10000 }); // 10-second timeout as an example
        const data = await scrapeFunction();
        if (!data || data.length === 0) {
            console.warn(`No data found for selector: ${selector}`);
            return null;
        }
        return data;
    } catch (error) {
        console.error(`Error scraping data for selector: ${selector}`, error);
        return null;
    }
}

// Modified scrapeData function to use scrapingMiddleware
async function scrapeData(page, selector, evaluationFunction) {
    return scrapingMiddleware(page, selector, async () => {
        return page.evaluate(evaluationFunction);
    });
}

module.exports = {
    scrapeData,
    scrapingMiddleware
};

