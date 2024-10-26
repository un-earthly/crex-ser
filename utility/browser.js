const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

let browser;

async function getBrowserInstance() {
    if (!browser) {
        if (process.env.BROWSER === "nix") {
            browser = await puppeteer.launch({
                executablePath: '/home/scorp39/.nix-profile/bin/chromium',
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox'
                ]
            });
        } else {
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            });
        }
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