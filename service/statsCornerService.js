const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

async function scrapeShuffledStatsData(url, maxRetries = 3) {
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
    try {

        for (let retry = 0; retry < maxRetries; retry++) {
            try {
                await page.goto(url, { waitUntil: 'networkidle2' });
                await page.waitForSelector(".stats-header", { timeout: 10000 });
                await page.waitForSelector('tbody tr', { timeout: 10000 });

                // // Scroll to load all data
                // await autoScroll(page);

                const data = await page.evaluate(() => {
                    const safeGetText = (element, selector) => {
                        const el = element.querySelector(selector);
                        return el ? el.textContent.trim() : '';
                    };

                    const safeGetAttribute = (element, selector, attribute) => {
                        const el = element.querySelector(selector);
                        return el ? el.getAttribute(attribute) : null;
                    };

                    // Table data scraping
                    const tableData = (() => {
                        const rows = document.querySelectorAll('tbody tr');
                        return Array.from(rows, row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length === 0) return null;

                            return {
                                rank: safeGetText(row, 'td:first-child'),
                                player: {
                                    name: safeGetText(row, '.p-name'),
                                    image: safeGetAttribute(row, '.player-img img', 'src')
                                },
                                team: {
                                    name: safeGetText(row, '.team'),
                                    image: safeGetAttribute(row, '.team-flag img', 'src')
                                },
                                strikeRate: safeGetText(row, 'td:nth-child(4)'),
                                matches: safeGetText(row, 'td:nth-child(5)'),
                                innings: safeGetText(row, 'td:nth-child(6)'),
                                highestScore: safeGetText(row, 'td:nth-child(7)'),
                                average: safeGetText(row, 'td:nth-child(8)'),
                                runs: safeGetText(row, 'td:nth-child(9)'),
                                hundreds: safeGetText(row, 'td:nth-child(10)'),
                                fifties: safeGetText(row, 'td:nth-child(11)'),
                                fours: safeGetText(row, 'td:nth-child(12)'),
                                sixes: safeGetText(row, 'td:nth-child(13)')
                            };
                        }).filter(Boolean);
                    })();

                    // Stats corner data scraping
                    const statsCornerData = (() => {
                        const statsHeader = document.querySelector('.stats-header');
                        if (!statsHeader) return null;

                        const title = safeGetText(statsHeader, '.heading-wrapper h1 span');

                        const players = Array.from(statsHeader.querySelectorAll('.player-img')).map(playerDiv => ({
                            name: safeGetText(playerDiv, 'p'),
                            score: safeGetText(playerDiv, '.score'),
                            image: safeGetAttribute(playerDiv, 'img', 'src')
                        }));

                        return { title, players };
                    })();

                    return { tableData, statsCornerData };
                });

                return data;
            } catch (error) {
                console.error(`Attempt ${retry + 1} failed:`, error);
                if (retry === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    } catch (error) {
        console.error('Scraping failed after max retries:', error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = {
    scrapeShuffledStatsData
}