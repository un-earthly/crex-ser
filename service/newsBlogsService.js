const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const scrapeNewsBlogs = async (clicks = 0) => {
    try {
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
        const page = await browser.newPage();

        await page.goto('https://crex.live/', { waitUntil: 'networkidle2' });
        await page.waitForSelector('section.news-topic-wrapper');

        if (clicks) {
            for (let i = 0; i < clicks; i++) {
                await page.waitForSelector('.more-button', { visible: true, timeout: 5000 }).catch(() => {
                    console.log('Read More button not found. All content may have been loaded.');
                    return;
                });

                await page.evaluate(() => {
                    const button = document.querySelector('.more-button');
                    if (button) button.click();
                });

                console.log(`Clicked ${i + 1} times`);

                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        const data = await page.evaluate(() => {
            const cards = [];
            const cardElements = document.querySelectorAll('section.news-topic-wrapper .card-wrapper');

            cardElements.forEach(card => {
                const title = card.querySelector('.heading h2').innerText.trim();
                const imageUrl = card.querySelector('.news-card-img img').src;
                const link = card.querySelector('.news-card-img a').href?.replace('https://cricket.one', "");
                const tags = Array.from(card.querySelectorAll('.news-tag ul li a')).map(tag => tag.innerText.trim());
                const description = card.querySelector('.news-heading p').innerText.trim();
                const time = card.querySelector('.news-time span').innerText.trim();

                cards.push({
                    title,
                    imageUrl,
                    link,
                    tags,
                    description,
                    time
                });
            });

            return cards;
        });

        await browser.close();
        return data;
    } catch (error) {
        console.error('Error scraping the data:', error);
        throw new Error('Failed to scrape the data');
    }
};
const scrapeBlogDetails = async (blogUrl) => {
    try {
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
        const page = await browser.newPage();

        await page.goto(blogUrl, { waitUntil: 'networkidle2' });

        await page.waitForSelector('.blog-details-container');

        const blogDetails = await page.evaluate(() => {
            const title = document.querySelector('.blog-title').innerText.trim();
            const author = document.querySelector('.author-name').innerText.trim();
            const datePublished = document.querySelector('.published-date').innerText.trim();
            const content = document.querySelector('.blog-content').innerText.trim();
            const imageUrl = document.querySelector('.blog-img img').src;

            return {
                title,
                author,
                datePublished,
                content,
                imageUrl
            };
        });

        await browser.close();
        return blogDetails;
    } catch (error) {
        console.error('Error scraping blog details:', error);
        throw new Error('Failed to scrape blog details');
    }
};

module.exports = {
    scrapeNewsBlogs,
    scrapeBlogDetails
};
