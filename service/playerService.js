const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

async function scrapePlayerLayoutData(url) {
    const browser = await puppeteer.launch({
        args: [
            '--window-size=1920,1080',
            ...chromium.args
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForSelector(".playerAge")

    const playerData = await page.evaluate(() => {
        // Extract the player's name
        const playerFName = document.querySelector('.playerFName')?.textContent?.trim() || '';
        const playerLName = document.querySelector('.playerLName')?.textContent?.trim() || '';

        // Extract the team name
        const teamName = document.querySelector('.bgTeamName')?.textContent?.trim() || '';

        // Extract the age
        const age = document.querySelector('.playerAge span:last-child')?.textContent?.trim();
        const teamFlag = document.querySelector('.playerAge img')?.src || '';

        // Extract the role
        const role = document.querySelector('.btText span')?.textContent?.trim() || '';

        // Extract the player image
        const playerImg = document.querySelector('.playerProfileDefault img[alt]')?.src || '';

        // Extract the jersey image
        const jerseyImg = document.querySelector('.playerProfileDefault img.mr-top')?.src || '';
        const rankings = Array.from(document.querySelectorAll('.playerTop'))
            .map(el => el.textContent.trim())
            .filter(text => text);
        return {
            playerFName,
            playerLName,
            teamName,
            age,
            teamFlag,
            role,
            playerImg,
            jerseyImg,
            rankings
        };
    });

    await browser.close();

    return playerData;
}
module.exports = {
    scrapePlayerLayoutData
}