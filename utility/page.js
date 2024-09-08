const { getBrowserInstance } = require('./browser');

async function createPage() {
    const browser = await getBrowserInstance();
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    return page;
}

async function navigateAndWait(page, url, pageOffset = 0) {
    await page.goto(url, { waitUntil: 'networkidle2' });

    if (pageOffset !== 0) {
        const direction = pageOffset > 0 ? 'next-button' : 'prev-button';
        const clicks = Math.abs(pageOffset);

        for (let i = 0; i < clicks; i++) {
            await page.waitForSelector(`.${direction}`);
            await page.click(`.${direction}`);
            await page.waitForTimeout(300);
        }
    }
}

module.exports = {
    createPage,
    navigateAndWait
};