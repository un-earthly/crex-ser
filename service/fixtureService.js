const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const connectDB = require("../db.config");

async function scrapeFixtureMatches(pageOffset = 0) {
    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    try {


        await page.goto(process.env.BASE + '/fixtures/match-list', { waitUntil: 'networkidle2' });

        if (pageOffset !== 0) {
            const direction = pageOffset > 0 ? 'next-button' : 'prev-button';
            const clicks = Math.abs(pageOffset);

            for (let i = 0; i < clicks; i++) {
                await page.waitForSelector(`.${direction}`);
                await page.click(`.${direction}`);
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        await page.waitForSelector('.date-wise-matches-card');

        const matchesByDate = await page.evaluate(() => {
            const dateSections = document.querySelectorAll('.date-wise-matches-card > div');
            const result = [];

            dateSections.forEach(section => {
                const dateElement = section.querySelector('.date div');
                if (!dateElement) return;

                const date = dateElement.textContent.trim();
                const matchElements = section.querySelectorAll('.match-card-container');

                const matches = Array.from(matchElements).map(element => {
                    const link = element.querySelector('a').href.replace('https://crex.live', '');
                    const teams = element.querySelectorAll('.team-name');
                    const scores = element.querySelectorAll('.team-score');
                    const overs = element.querySelectorAll('.total-overs');
                    const result = element.querySelector('.result span');
                    const matchInfo = element.querySelector('.reason');
                    const startTime = element.querySelector('.not-started');
                    const logos = element.querySelectorAll("img");
                    return {
                        link,
                        team1: teams[0]?.textContent.trim(),
                        team2: teams[1]?.textContent.trim(),
                        score1: scores[0]?.textContent.trim(),
                        score2: scores[1]?.textContent.trim(),
                        logo1: logos[0]?.src,
                        logo2: logos[1]?.src,
                        overs1: overs[0]?.textContent.trim(),
                        overs2: overs[1]?.textContent.trim(),
                        result: result?.textContent.trim() || 'Upcoming',
                        matchInfo: matchInfo?.textContent.trim() || startTime?.innerText.split("\n")[2],
                        startTime: startTime && startTime.innerText.split("\n")[0]
                    };
                });

                result.push({ date, matches });
            });

            return result;
        });

        await browser.close();
        return matchesByDate;
    } catch (e) {
        console.error('Error fetching matches:', e);
        throw e;
    }
}
async function getTeams(page = 1, pageSize = 10, searchTerm = '') {
    try {
        let db;
        if (!db) {
            db = await connectDB();
            if (!db) {
                throw new Error('Database connection failed');
            }
        }

        const teamsCollection = db.collection("teams");

        // Create a search query based on the search term
        const query = searchTerm ? { name: { $regex: searchTerm, $options: 'i' } } : {};
        console.log(query)

        // Apply pagination and sorting
        const options = {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            sort: { name: 1 } // Sort by name ascending
        };
        const teams = await teamsCollection.find(query, options).toArray();

        const totalTeams = await teamsCollection.countDocuments(query);

        return { teams, totalTeams };

    } catch (error) {
        console.error('Error retrieving teams from database:', error);
        throw error;
    }
};
async function scrapeAndSaveSeries(url, pageOffset = 0) {
    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        if (pageOffset !== 0) {
            const direction = pageOffset > 0 ? 'next-button' : 'prev-button';
            const clicks = Math.abs(pageOffset);

            for (let i = 0; i < clicks; i++) {
                await page.waitForSelector(`.${direction}`);
                await page.click(`.${direction}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }


        const seriesData = await page.evaluate(() => {
            const series = [];
            const monthDivs = document.querySelectorAll('.serieswise');

            monthDivs.forEach((monthDiv) => {
                const month = monthDiv.querySelector('.s_date span').textContent.trim();
                const seriesCards = monthDiv.querySelectorAll('.series-card');

                seriesCards.forEach((card) => {
                    const name = card.querySelector('.series-name').textContent.trim();
                    const dateRange = card.querySelector('.series-desc span').textContent.trim();
                    const imgSrc = card.querySelector('img').src;
                    const link = card.href?.replace("https://crex.live", "");

                    series.push({
                        month,
                        name,
                        dateRange,
                        imgSrc,
                        link
                    });
                });
            });

            return series;
        });

        await browser.close();


        return {
            seriesData,
            message: `${seriesData.length} series were successfully scraped.`
        };

    } catch (error) {
        console.error('Error during scraping or database operation:', error);
        throw error;
    }
}

module.exports = {
    scrapeFixtureMatches,
    getTeams,
    scrapeAndSaveSeries
}