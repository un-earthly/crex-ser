const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

let browser;

async function getBrowserInstance() {
    if (!browser) {
        browser = await puppeteer.launch({
            executablePath: '/home/scorp39/.nix-profile/bin/chromium', // or the path to your installed Chromium
            headless: true,
            args: [
                '--no-sandbox', // add this option
                '--disable-setuid-sandbox' // add this option
            ]
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