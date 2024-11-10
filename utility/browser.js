const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

let browser;

async function getBrowserInstance() {
    if (!browser) {
        if (process.env.BROWSER === "nix") {
            browser = await puppeteer.launch({
                executablePath: '/home/scorp39/.nix-profile/bin/chromium',
                headless: false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920x1080',
                ],
                defaultViewport: {
                    width: 1920,
                    height: 1080
                }
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