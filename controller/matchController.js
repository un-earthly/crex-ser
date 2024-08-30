const puppeteer = require('puppeteer');
const chromium = require("@sparticuz/chromium");
const connectDB = require('../db.config');
async function scrapeMatchData() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('https://crex.live/', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('#slide .live-card', {
        visible: true,
        timeout: 60000
    });

    const matchData = await page.evaluate(() => {
        const matchCards = document.querySelectorAll('#slide .live-card');

        return Array.from(matchCards).map(card => {
            const seriesName = card.querySelector('.snameTag')?.textContent.trim();
            const matchNumber = card.querySelector('.match-number')?.textContent.trim();

            const teams = Array.from(card.querySelectorAll('.team-score')).map(team => {
                const name = team.querySelector('span')?.textContent.trim();
                const flagUrl = team.querySelector('img')?.src;

                let firstInningsScore = '', secondInningsScore = '';
                let firstInningsOvers = '', secondInningsOvers = '';
                const scoreElems = team.querySelectorAll('span')
                if (scoreElems.length > 4) {
                    // Test match
                    firstInningsScore = scoreElems[1]?.textContent.trim();
                    secondInningsScore = scoreElems[3]?.textContent.trim();
                    // firstInningsOvers = scoreElems[2]?.textContent.trim();
                    secondInningsOvers = scoreElems[4]?.textContent.trim();
                } else {
                    // T20 or ODI match
                    firstInningsScore = scoreElems[2]?.textContent.trim();
                    firstInningsOvers = scoreElems[3]?.textContent.trim();
                }

                return {
                    name,
                    flagUrl,
                    firstInningsScore,
                    secondInningsScore,
                    firstInningsOvers,
                    secondInningsOvers
                };
            });

            const status = card.querySelector('.live-card-middle > span')?.textContent.trim() ||
                card.querySelector('.comment')?.textContent.trim();

            const upcomingTime = card.querySelector('.upcomingTime')?.textContent.trim();
            const matchDate = card.querySelector('.match-time')?.textContent.trim();
            const matchTime = card.querySelector('.match-data')?.textContent.trim();

            const isLive = card.querySelector('.live') !== null;
            const isUpcoming = card.querySelector('.upcoming') !== null;
            // const isFinished = card.querySelector('.live-card-middle > span[style*="color: var(--ce_highlight_ac3)"]') !== null;

            return {
                seriesName,
                matchNumber,
                teams,
                status,
                upcomingTime,
                matchDate,
                matchTime,
                isLive,
                isUpcoming,
                isFinished: status ? true : false
            };
        });
    });

    await browser.close();


    const db = await connectDB();
    const collection = db.collection('matches');
    const result = await collection.insertMany(matchData);

    return result;
}
module.exports = {
    scrapeMatchData
}