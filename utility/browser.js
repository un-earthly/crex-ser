const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

let browser;

async function getBrowserInstance() {
    if (!browser) {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
    }
    return browser;
}

async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}

module.exports = {
    getBrowserInstance,
    closeBrowser
};