// newsController.js
const puppeteer = require('puppeteer');
const NodeCache = require('node-cache');
const dataCache = new NodeCache({ stdTTL: 3600 }); // Cache data for 1 hour
const chromium = require("@sparticuz/chromium");


let browser;
let isScrapingInProgress = false;

async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
    }
}

async function scrapeNewsData(clickCount = 100) {
    if (isScrapingInProgress) {
        console.log('Scraping already in progress');
        return null;
    }

    isScrapingInProgress = true;
    let page;

    try {
        await initBrowser();
        page = await browser.newPage();
        await page.goto('https://crex.live/', { waitUntil: 'domcontentloaded' });

        let allCards = [];

        for (let i = 0; i < clickCount; i++) {
            await page.waitForSelector('div.more-button span', { visible: true, timeout: 5000 }).catch(() => {
                console.log('Read More button not found. All content may have been loaded.');
                return;
            });

            await page.evaluate(() => {
                const button = document.querySelector('div.more-button span');
                if (button) button.click();
            });

            // await page.waitForTimeout(2000);

            const newCards = await page.evaluate(() => {
                const cards = [];
                const cardElements = document.querySelectorAll('section.news-topic-wrapper .card-wrapper');

                cardElements.forEach(card => {
                    const title = card.querySelector('.heading h2').innerText.trim();
                    const imageUrl = card.querySelector('.news-card-img img').src;
                    const link = card.querySelector('.news-card-img a').href;
                    const tags = Array.from(card.querySelectorAll('.news-tag ul li a')).map(tag => tag.innerText.trim());
                    const description = card.querySelector('.news-heading p').innerText.trim();
                    const time = card.querySelector('.news-time span').innerText.trim();

                    cards.push({ title, imageUrl, link, tags, description, time });
                });

                return cards;
            });

            allCards = allCards.concat(newCards);
        }

        // Remove duplicates
        const uniqueCards = Array.from(new Set(allCards.map(card => card.title)))
            .map(title => allCards.find(card => card.title === title));

        const db = getDb();

        const result = await db.collection('news').insertMany(uniqueCards);

        console.log(`Scraped and cached ${uniqueCards.length} unique cards`);
        return { uniqueCards, result };
    } catch (error) {
        console.error('Error during scraping:', error);
        return null;
    } finally {
        if (page && !page.isClosed()) await page.close();
        isScrapingInProgress = false;
    }
}

function getNewsData(page = 1, itemsPerPage = 3) {
    const cachedData = dataCache.get('scrapedData');

    if (!cachedData) {
        return null;
    }

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = cachedData.slice(startIndex, endIndex);

    return {
        data: paginatedData,
        currentPage: page,
        totalPages: Math.ceil(cachedData.length / itemsPerPage),
        totalItems: cachedData.length
    };
}

module.exports = {
    scrapeNewsData,
    getNewsData
};