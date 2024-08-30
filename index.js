const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;
const chromium = require("@sparticuz/chromium");
const { scrapeMatchData } = require('./controller/matchController');
const connectDB = require('./db.config');
const { config } = require('dotenv');
const NodeCache = require('node-cache');
config()
app.use(cors())
app.use(express.json())


let db;
let browser;
let page;

async function initBrowserAndPage() {
    if (!browser) {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
    }

    // Always create a new page for each request
    page = await browser.newPage();
    await page.goto('https://crex.live/', { waitUntil: 'domcontentloaded' });
}


app.post('/api/clickReadMore', async (req, res) => {
    try {

        await initBrowserAndPage();

        if (!db) {
            db = await connectDB(); // Await the connection to ensure `db` is ready
            if (!db) {
                throw new Error('Database connection failed');
            }
        }

        // Wait for the button to be available
        await page.waitForSelector('div.more-button span', { visible: true });

        // Click the button
        await page.evaluate(async () => {
            const button = document.querySelector('div.more-button span');
            if (button) {
                for (let i = 0; i < 11; i++) {
                    button.click();
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 1 second between clicks
                }
            } else {
                throw new Error('Button not found');
            }
        });


        // Wait for new content to load
        await page.waitForSelector('section.news-topic-wrapper');

        // Scrape the data
        const data = await page.evaluate(() => {
            const cards = [];
            const cardElements = document.querySelectorAll('section.news-topic-wrapper .card-wrapper');

            cardElements.forEach(card => {
                const title = card.querySelector('.heading h2').innerText.trim();
                const imageUrl = card.querySelector('.news-card-img img').src;
                const link = card.querySelector('.news-card-img a').href;
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
        // Close the page after scraping
        await page.close();

        const result = await db.collection('news').insertMany(data);

        res.json({ success: true, result, message: 'Read More button clicked successfully' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while clicking the Read More button' });
    } finally {
        if (page && !page.isClosed()) {
            await page.close();
        }
    }
});



app.get('/api/news-blogs', async (req, res) => {
    try {

        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
        const page = await browser.newPage();

        // Go to the target URL
        await page.goto('https://crex.live/', { waitUntil: 'domcontentloaded' });

        // Wait for the necessary elements to load
        await page.waitForSelector('section.news-topic-wrapper');

        // Scrape the data
        const data = await page.evaluate(() => {
            const cards = [];
            const cardElements = document.querySelectorAll('section.news-topic-wrapper .card-wrapper');

            cardElements.forEach(card => {
                const title = card.querySelector('.heading h2').innerText.trim();
                const imageUrl = card.querySelector('.news-card-img img').src;
                const link = card.querySelector('.news-card-img a').href;
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

        // Close the browser
        await browser.close();

        // Send the scraped data as a response
        res.json(data);
    } catch (error) {
        console.error('Error scraping the data:', error);
        res.status(500).json({ error: 'Failed to scrape the data' });
    }
});
const cache = new NodeCache({ stdTTL: 3600 });

async function matchesScrapper(url) {
    const cachedData = cache.get(url);
    if (cachedData) {
        console.log('Returning cached data');
        return cachedData;
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.setDefaultNavigationTimeout(60000);
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
                request.abort();
            } else {
                request.continue();
            }
        });

        console.log('Navigating to page...');
        await page.goto(url, { waitUntil: 'networkidle0' });
        console.log('Page loaded');

        console.log('Waiting for content to render...');
        await page.waitForSelector('.live-card', { timeout: 60000 });
        console.log('Content rendered');

        const matches = await page.evaluate(() => {
            const matchCards = document.querySelectorAll('.live-card');
            return Array.from(matchCards).map(card => {
                const statusElement = card.querySelector('.live-card-top .ce-data span');
                let status = statusElement ? statusElement.textContent.trim() : 'Upcoming';

                const seriesName = card.querySelector('.snameTag')?.textContent.trim();
                const matchNumber = card.querySelector('.match-number')?.textContent.trim();
                const venue = card.querySelector('.match-number span:last-child')?.textContent.trim();

                const team1 = card.querySelector('.team-score:first-child');
                const team2 = card.querySelector('.team-score:last-child');

                const getTeamInfo = (teamElement) => {
                    const name = teamElement.querySelector('img')?.getAttribute('title') ||
                        teamElement.querySelector('span:not(.match-score):not(.match-over)')?.textContent.trim();

                    let score = null;
                    let overs = null;

                    const scoreSpan = teamElement.querySelector('span:not(:first-child):not(.match-over)');
                    if (scoreSpan) {
                        const scoreText = scoreSpan.textContent.trim();
                        const scoreParts = scoreText.split('/');
                        if (scoreParts.length === 2) {
                            score = scoreText;
                        }
                    }

                    const oversSpan = teamElement.querySelector('.match-over');
                    if (oversSpan) {
                        overs = oversSpan.textContent.trim();
                    } else if (scoreSpan) {
                        const fullText = scoreSpan.textContent.trim();
                        const overMatch = fullText.match(/\((\d+(\.\d+)?)\)/);
                        if (overMatch) {
                            overs = overMatch[1];
                        }
                    }

                    if (score === null) {
                        const allSpans = teamElement.querySelectorAll('span');
                        allSpans.forEach(span => {
                            const text = span.textContent.trim();
                            if (text.includes('/') && !text.includes('(')) {
                                score = text;
                            } else if (!overs && text.match(/^\d+(\.\d+)?$/)) {
                                overs = text;
                            }
                        });
                    }

                    return {
                        name,
                        score: score,
                        overs: overs
                    };
                };

                const team1Info = getTeamInfo(team1);
                const team2Info = getTeamInfo(team2);

                const resultElement = card.querySelector('.comment, span[style*="color: var(--ce_highlight_ac3)"]');
                const result = resultElement ? resultElement.textContent.trim() : null;

                if (result && (result.includes('won by') || result.includes('match tied'))) {
                    status = 'Finished';
                } else if (status.toLowerCase() === 'live' || (result && result.includes('won the toss'))) {
                    status = 'Live';
                } else if (team1Info.score || team2Info.score) {
                    status = 'Live';
                } else {
                    status = 'Upcoming';
                }

                const upcomingTime = card.querySelector('.upcomingTime')?.getAttribute('title');

                // Match date and start time extraction
                const matchDate = card.querySelector('.upcomingTime')?.textContent.trim();
                const startTimeElement = card.querySelector('.match-data');
                const startTime = startTimeElement ? startTimeElement.textContent.trim() : null;

                return {
                    status,
                    seriesName,
                    matchNumber,
                    venue,
                    team1: team1Info,
                    team2: team2Info,
                    result,
                    upcomingTime,
                    matchDate,
                    startTime
                };
            });
        });

        console.log(`Scraped ${matches.length} matches`);

        // Cache the scraped data
        cache.set(url, matches);

        return matches;
    } catch (error) {
        console.error('Error during scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}
// Function to clear cache
function clearCache() {
    cache.flushAll();
    console.log('Cache cleared');
}

// Function to get cache stats
function getCacheStats() {
    return cache.getStats();
}
async function scrapeRankings(url) {
    const browser = await puppeteer.launch({ headless: "true" });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Wait for a specific element to ensure the page has loaded
        await page.waitForSelector('.card_wrapper', { timeout: 10000 });

        const rankings = await page.evaluate(() => {
            const cards = document.querySelectorAll('.card_wrapper');
            const result = {};

            cards.forEach((card) => {
                const formatElement = card.querySelector('.type span');
                if (formatElement) {
                    const format = formatElement.textContent.trim();
                    const topPlayerCard = card.querySelector('.player-card');
                    const rows = card.querySelectorAll('tbody tr');

                    result[format] = {
                        topPlayer: null,
                        rankings: []
                    };

                    // Extract top player information
                    if (topPlayerCard) {
                        const nameElement = topPlayerCard.querySelector('.player_full_name a');
                        const ratingElement = topPlayerCard.querySelector('.player-score .number');
                        const imageElement = topPlayerCard.querySelector('.player-profile img');
                        const teamElement = topPlayerCard.querySelector('.flag_block img');

                        result[format].topPlayer = {
                            name: nameElement ? nameElement.textContent.trim().replace(/\s+/g, ' ') : 'N/A',
                            rating: ratingElement ? ratingElement.textContent.trim() : 'N/A',
                            imageUrl: imageElement ? imageElement.src : null,
                            team: teamElement ? teamElement.alt : 'N/A'
                        };
                    }

                    // Extract rankings
                    result[format].rankings = Array.from(rows).map((row) => {
                        const rankElement = row.querySelector('td:first-child');
                        const nameElement = row.querySelector('td.p_name a');
                        const teamElement = row.querySelector('td.name');
                        const ratingElement = row.querySelector('td.runs');

                        return {
                            rank: rankElement ? rankElement.textContent.trim().split(' ')[0] : 'N/A',
                            name: nameElement ? nameElement.textContent.trim() : 'N/A',
                            team: teamElement ? teamElement.textContent.trim() : 'N/A',
                            rating: ratingElement ? ratingElement.textContent.trim() : 'N/A'
                        };
                    });
                }
            });

            return result;
        });

        console.log('Rankings extracted:', rankings);
        return rankings;
    } catch (error) {
        console.error('Error during scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

async function scrapeCricketRankings(url) {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

        const rankings = await page.evaluate(() => {
            const tabContainers = document.querySelectorAll('.card_wrapper');
            const result = {};

            tabContainers.forEach((container) => {
                const tabName = container.querySelector('.type').textContent.trim();
                const topTeam = container.querySelector('.team_full_name').textContent.trim();
                const topTeamRating = container.querySelector('.number').textContent.trim();
                const topTeamImg = container.querySelector('.flag').src

                const tableRows = container.querySelectorAll('table tbody tr');
                const teamsData = Array.from(tableRows).map((row) => {
                    const columns = row.querySelectorAll('td');
                    return {
                        rank: columns[0].textContent.trim(),
                        team: columns[1].querySelector('.t_name').textContent.trim(),
                        flag: columns[1].querySelector('img').src,
                        rating: columns[2].textContent.trim(),
                    };
                });

                result[tabName] = {
                    top_team: {
                        name: topTeam,
                        rating: topTeamRating,
                        img: topTeamImg
                    },
                    rankings: teamsData
                };
            });

            return result;
        });

        await browser.close();
        return rankings;
    } catch (error) {
        console.error('An error occurred:', error);
        await browser.close();
        throw error;
    }
}

async function scrapeNavBarData() {
    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    await page.goto('https://crex.live/', { waitUntil: 'domcontentloaded' });

    // Wait for the navigation bar to load
    await page.waitForSelector('#myHeader', { visible: true });

    const navData = await page.evaluate(() => {
        const navElement = document.querySelector('#myHeader');

        const logoSrc = navElement.querySelector('img')?.src;
        const brandText = navElement.querySelector('.headText')?.textContent.trim();

        // Use 'let' since we may modify 'navLinks'
        let navLinks = Array.from(navElement.querySelectorAll('.navbar-nav .nav-item')).map(item => {
            let title = item.querySelector('.nav-link')?.textContent.trim();
            const href = item.querySelector('.nav-link')?.getAttribute('href');
            if (title?.includes('(current)')) title = title.replace('(current)', '').trim();
            return { title, href };
        });

        // Remove any empty link objects
        navLinks = navLinks.filter(link => link.href);

        // Extract dropdown menu data
        const seriesDropdown = navElement.querySelector('#dropdownMenuButton');
        const dropdownItems = Array.from(document.querySelectorAll('.dropdown-menu .dropdown-item')).map(item => {
            const text = item.textContent.trim();
            const link = item.getAttribute('href');
            return { text, link };
        });

        // Insert the series dropdown right after Home
        navLinks.splice(1, 0, {
            title: seriesDropdown?.textContent.trim(),
            href: null,  // No direct link, it's a dropdown
            items: dropdownItems
        });

        return {
            logoSrc,
            brandText,
            navLinks
        };
    });

    await browser.close();

    return navData;
}


async function seriesScrapper(url) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Wait for the main content to load
        await page.waitForSelector('.overview-wrapper');

        const content = await page.evaluate(() => {
            const data = {};

            // Extract featured matches
            data.featuredMatches = Array.from(document.querySelectorAll('.match-card-wrapper')).map(match => {
                const matchData = {
                    teams: Array.from(match.querySelectorAll('.team-name')).map(team => team.textContent.trim()),
                    scores: Array.from(match.querySelectorAll('.team-score')).map(score => score.textContent.trim()),
                    result: match.querySelector('.result')?.textContent.trim()
                };

                // Check if the match hasn't started yet
                const notStartedElement = match.querySelector('.not-started');
                if (notStartedElement) {
                    matchData.status = 'Not Started';
                    matchData.date = notStartedElement.querySelector('.time')?.textContent.trim();
                    matchData.time = notStartedElement.querySelector('.start-text')?.textContent.trim();
                } else {
                    matchData.status = 'In Progress or Completed';
                }

                return matchData;
            });

            // Extract team squads
            data.teamSquads = Array.from(document.querySelectorAll('.squad-wrapper')).map(squad => ({
                team: squad.querySelector('span')?.textContent.trim(),
                imageUrl: squad.querySelector('img')?.src
            }));

            // Extract series info
            data.seriesInfo = {
                name: document.querySelector('.series-info-wrapper .info-row:nth-child(1) .content')?.textContent.trim(),
                duration: document.querySelector('.series-info-wrapper .info-row:nth-child(2) .content')?.textContent.trim(),
                format: document.querySelector('.series-info-wrapper .info-row:nth-child(3) .content')?.textContent.trim()
            };

            // Extract key stats
            data.keyStats = Array.from(document.querySelectorAll('.key-stat')).map(stat => ({
                title: stat.querySelector('.stat-title')?.textContent.trim(),
                playerName: stat.querySelector('.name')?.textContent.trim(),
                teamName: stat.querySelector('.team-name')?.textContent.trim(),
                value: stat.querySelector('.stat-single-value')?.textContent.trim() ||
                    stat.querySelector('.stat-double-value')?.textContent.trim()
            }));

            // Extract top headlines
            data.topHeadlines = Array.from(document.querySelectorAll('.news-link')).map(news => ({
                title: news.querySelector('.title')?.textContent.trim(),
                time: news.querySelector('.time')?.textContent.trim(),
                imageUrl: news.querySelector('img')?.src
            }));

            // Extract points table

            data.pointsTable = {
                title: document.querySelector('app-series-points-table-shared .heading .title')?.textContent.trim(),
                teams: Array.from(document.querySelectorAll('app-series-points-table-shared table tr:not(:first-child)')).map(row => ({
                    name: row.querySelector('.team-wrapper div')?.textContent.trim(),
                    imageUrl: row.querySelector('.team-wrapper img')?.src,
                    played: row.querySelector('td:nth-child(2)')?.textContent.trim(),
                    won: row.querySelector('td:nth-child(3)')?.textContent.trim(),
                    lost: row.querySelector('td:nth-child(4)')?.textContent.trim(),
                    noResult: row.querySelector('td:nth-child(5)')?.textContent.trim(),
                    netRunRate: row.querySelector('td:nth-child(6)')?.textContent.trim(),
                    points: row.querySelector('td:nth-child(7)')?.textContent.trim()
                }))
            };

            return data;
        });

        console.log(JSON.stringify(content, null, 2));

        return content;
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
}



async function scrapeTeamSquad(url) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const squadData = await page.evaluate(() => {
        const teams = [];
        const teamElements = document.querySelectorAll('.series-left-card');

        teamElements.forEach((teamElement, index) => {
            const teamName = teamElement.querySelector('.name').textContent.trim();
            const playerCount = teamElement.querySelector('.player-count').textContent.trim();

            // Click on the team tab to load its players
            teamElement.click();

            // Wait for the players to load (you might need to adjust the timeout)
            setTimeout(() => { }, 1000);

            const players = [];
            const playerElements = document.querySelectorAll('.players-wrapper .custom-width');

            playerElements.forEach((playerElement) => {
                const name = playerElement.querySelector('.name').textContent.trim();
                const type = playerElement.querySelector('.player-type').textContent.trim();
                const role = playerElement.closest('.batsmen, .bowler, .allrounder')?.querySelector('.heading')?.textContent.trim() || 'Unknown';

                players.push({ name, type, role });
            });

            teams.push({ teamName, playerCount, players });
        });

        return teams;
    });

    await browser.close();
    return squadData;
}


async function scrapeSeriesInfo(url) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

        const seriesInfo = await page.evaluate(() => {
            const infoWrapper = document.querySelector('.series-info-wrapper');
            if (!infoWrapper) return null;

            const title = infoWrapper.querySelector('.title')?.textContent.trim() || '';

            const infoRows = infoWrapper.querySelectorAll('.info-row');
            let series = '';
            let duration = '';
            let format = '';

            infoRows.forEach(row => {
                const heading = row.querySelector('.heading')?.textContent.trim().toLowerCase();
                const content = row.querySelector('.content')?.textContent.trim();

                switch (heading) {
                    case 'series':
                        series = content;
                        break;
                    case 'duration':
                        duration = content;
                        break;
                    case 'format':
                        format = content;
                        break;
                }
            });

            return {
                title,
                series,
                duration,
                format
            };
        });

        return seriesInfo;
    } catch (error) {
        console.error('Error during series info scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}
async function scrapeMatchesInfo(url) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

        const matchesInfo = await page.evaluate(() => {
            const matchesWrapper = document.querySelector('.matches-wrapper');
            if (!matchesWrapper) return null;

            const title = matchesWrapper.querySelector('.title')?.textContent.trim() || '';

            const matches = Array.from(matchesWrapper.querySelectorAll('.datewise-match-wrapper')).map(dateWrapper => {
                const date = dateWrapper.querySelector('.datetime')?.textContent.trim() || '';
                const matchCards = Array.from(dateWrapper.querySelectorAll('.match-card-container')).map(card => {
                    const matchInfo = card.querySelector('.match-info')?.textContent.trim() || '';
                    const team1 = card.querySelector('.team1 .team-name')?.textContent.trim() || '';
                    const team2 = card.querySelector('.team2 .team-name')?.textContent.trim() || '';
                    const team1Score = card.querySelector('.team1 .team-score')?.textContent.trim() || '';
                    const team2Score = card.querySelector('.team2 .team-score')?.textContent.trim() || '';
                    const result = card.querySelector('.result')?.textContent.trim() || '';
                    const notStarted = card.querySelector('.not-started');
                    const startTime = notStarted ? notStarted.querySelector('.start-text')?.textContent.trim() : '';

                    return {
                        matchInfo,
                        team1,
                        team2,
                        team1Score,
                        team2Score,
                        result,
                        startTime
                    };
                });

                return {
                    date,
                    matches: matchCards
                };
            });

            return {
                title,
                matchesByDate: matches
            };
        });

        return matchesInfo;
    } catch (error) {
        console.error('Error during matches info scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
};

async function scrapeSeriesStats(url) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

        // const seriesStats = await page.evaluate(() => {
        //     const statsWrapper = document.querySelector('.series-stats-wrapper');
        //     if (!statsWrapper) return null;

        //     const format = statsWrapper.querySelector('.format')?.textContent.trim() || '';
        //     const cardWrapper = statsWrapper.querySelector('.card-wrapper');

        //     if (!cardWrapper) return { format };

        //     const team1 = cardWrapper.querySelector('.team-wrapper:first-child span')?.textContent.trim() || '';
        //     const team2 = cardWrapper.querySelector('.team-wrapper:last-child span')?.textContent.trim() || '';

        //     const metricWrapper = cardWrapper.querySelector('.metric-wrapper');
        //     const scoreMetric = metricWrapper.querySelector('.metric')?.textContent.trim() || '';
        //     const matchesInfo = metricWrapper.querySelector('.matches-info')?.textContent.trim() || '';
        //     const result = metricWrapper.querySelector('.result span')?.textContent.trim() || '';
        //     const tableWrapper = document.querySelector('app-series-points-table-shared');
        //     if (!tableWrapper) return null;

        //     const title = tableWrapper.querySelector('.title')?.textContent.trim() || '';
        //     const headers = Array.from(tableWrapper.querySelectorAll('table th')).map(th => th.textContent.trim());

        //     const rows = Array.from(tableWrapper.querySelectorAll('table tr')).slice(1).map(row => {
        //         const cells = Array.from(row.querySelectorAll('td'));
        //         const teamInfo = cells[0].querySelector('.team-wrapper');

        //         return {
        //             team: {
        //                 name: teamInfo.querySelector('div')?.textContent.trim() || '',
        //                 imageUrl: teamInfo.querySelector('img')?.src || ''
        //             },
        //             stats: headers.slice(1).reduce((acc, header, index) => {
        //                 const cell = cells[index + 1];
        //                 acc[header] = cell.classList.contains('points')
        //                     ? { value: cell.textContent.trim(), isPoints: true }
        //                     : cell.textContent.trim();
        //                 return acc;
        //             }, {})
        //         };

        //     })
        // })

        const seriesStats = await page.evaluate(() => {
            const statsWrapper = document.querySelector('.series-stats-wrapper');
            if (!statsWrapper) return null;

            const format = statsWrapper.querySelector('.format')?.textContent.trim() || '';
            const cardWrapper = statsWrapper.querySelector('.card-wrapper');

            if (!cardWrapper) return { format };

            const team1 = cardWrapper.querySelector('.team-wrapper:first-child span')?.textContent.trim() || '';
            const team2 = cardWrapper.querySelector('.team-wrapper:last-child span')?.textContent.trim() || '';

            const metricWrapper = cardWrapper.querySelector('.metric-wrapper');
            const scoreMetric = metricWrapper.querySelector('.metric')?.textContent.trim() || '';
            const matchesInfo = metricWrapper.querySelector('.matches-info')?.textContent.trim() || '';
            const result = metricWrapper.querySelector('.result span')?.textContent.trim() || '';

            return {
                format,
                team1,
                team2,
                scoreMetric,
                matchesInfo,
                result
            };
        });
        const sharedPointsTableInfo = await page.evaluate(() => {
            const tableWrapper = document.querySelector('app-series-points-table-shared');
            if (!tableWrapper) return null;

            const title = tableWrapper.querySelector('.title')?.textContent.trim() || '';
            const headers = Array.from(tableWrapper.querySelectorAll('table th')).map(th => th.textContent.trim());

            const rows = Array.from(tableWrapper.querySelectorAll('table tr')).slice(1).map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                const teamInfo = cells[0].querySelector('.team-wrapper');

                return {
                    team: {
                        name: teamInfo.querySelector('div')?.textContent.trim() || '',
                        imageUrl: teamInfo.querySelector('img')?.src || ''
                    },
                    stats: headers.slice(1).reduce((acc, header, index) => {
                        const cell = cells[index + 1];
                        acc[header] = cell.classList.contains('points')
                            ? { value: cell.textContent.trim(), isPoints: true }
                            : cell.textContent.trim();
                        return acc;
                    }, {})
                };
            });

            return {
                title,
                headers,
                teams: rows
            };
        });

        return {
            sharedPointsTableInfo,
            seriesStats
        };


    } catch (error) {
        console.error('Error during series stats scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

async function scrapePointsTable(url) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

        const pointsTableInfo = await page.evaluate(() => {
            const tableWrapper = document.querySelector('.points-table-wrapper');
            if (!tableWrapper) return null;

            const title = tableWrapper.querySelector('.title')?.textContent.trim() || '';
            const headers = Array.from(tableWrapper.querySelectorAll('table th')).map(th => th.textContent.trim());

            const rows = Array.from(tableWrapper.querySelectorAll('table tr')).slice(1).map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                const teamInfo = cells[0].querySelector('.team-wrapper');

                return {
                    team: {
                        name: teamInfo.querySelector('div')?.textContent.trim() || '',
                        imageUrl: teamInfo.querySelector('img')?.src || ''
                    },
                    stats: headers.slice(1).reduce((acc, header, index) => {
                        acc[header] = cells[index + 1]?.textContent.trim() || '';
                        return acc;
                    }, {})
                };
            });

            return {
                title,
                headers,
                teams: rows
            };
        });

        return pointsTableInfo;
    } catch (error) {
        console.error('Error during points table scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}
async function scrapeSeriesNews(url) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

        const newsWrapper = await page.evaluate(() => {
            const newsContainer = document.querySelector('.news-wrapper');

            if (!newsContainer) {
                return null;
            }
            const title = newsContainer.querySelector('.title')?.textContent.trim() || '';
            const newsItems = Array.from(newsContainer.querySelectorAll('.news')).map(item => {
                const link = item.querySelector('a.news-link');
                const img = item.querySelector('img');
                const time = item.querySelector('.time');
                const title = item.querySelector('.title');
                const excerpt = item.querySelector('.excerpt');

                return {
                    url: link ? link.href : null,
                    imageUrl: img ? img.src : null,
                    time: time ? time.textContent.trim() : null,
                    title: title ? title.textContent.trim() : null,
                    excerpt: excerpt ? excerpt.textContent.trim() : null,
                };
            });

            return { newsItems, title };
        });


        return newsWrapper;
    } catch (error) {
        console.error('Error scraping data:', error);
        await browser.close();
        throw error;
    } finally {

        await browser.close();
    }
}

async function scrapTeamList(url) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

        const teamData = await page.evaluate(() => {
            const teams = [];
            const teamElements = document.querySelectorAll('.team-div');

            teamElements.forEach((teamElement) => {
                const teamName = teamElement.querySelector('.team-name').textContent.trim();
                const flagUrl = teamElement.querySelector('.team-flag').src;

                teams.push({
                    name: teamName,
                    flagUrl: flagUrl
                });
            });

            return teams;
        });

        await browser.close();

        //-
        return teamData;

    } catch (error) {
        console.error('Error during scraping or database operation:', error);
        throw error;
    }
}


// API function to scrape and save team data
async function scrapeAndSaveTeams(url) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

        const teamData = await page.evaluate(() => {
            const teams = [];
            const teamElements = document.querySelectorAll('.team-div');

            teamElements.forEach((teamElement) => {
                const teamName = teamElement.querySelector('.team-name').textContent.trim();
                const flagUrl = teamElement.querySelector('.team-flag').src;

                teams.push({
                    name: teamName,
                    flagUrl: flagUrl
                });
            });

            return teams;
        });

        await browser.close();

        if (!db) {
            db = await connectDB();
            if (!db) {
                throw new Error('Database connection failed');
            }
        }

        const teamsCollection = db.collection("teams");

        // Insert the scraped data into MongoDB
        const result = await teamsCollection.insertMany(teamData);
        console.log(`${result.insertedCount} teams were inserted into the database`);

        return { message: `${result.insertedCount} teams were successfully scraped and saved.` };

    } catch (error) {
        console.error('Error during scraping or database operation:', error);
        throw error;
    }
}

async function getTeams(page = 1, pageSize = 10, searchTerm = '') {
    try {
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

        // Retrieve teams from the database with the specified query, pagination, and sorting
        const teams = await teamsCollection.find(query, options).toArray();

        // Calculate total number of documents for pagination
        const totalTeams = await teamsCollection.countDocuments(query);

        return { teams, totalTeams };

    } catch (error) {
        console.error('Error retrieving teams from database:', error);
        throw error;
    }
};

async function scrapeAndSaveSeries(url) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0' });

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
                    const link = card.href;

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

        // const db = await connectDB();
        // if (!db) {
        //     throw new Error('Database connection failed');
        // }

        // const seriesCollection = db.collection("series");

        // Insert the scraped data into MongoDB
        // const result = await seriesCollection.insertMany(seriesData);

        // console.log(`${result.insertedCount} series were inserted into the database`);

        return {
            seriesData,
            message: `${seriesData.length} series were successfully scraped.`
        };

    } catch (error) {
        console.error('Error during scraping or database operation:', error);
        throw error;
    }
}

app.get('/api/scrape-series-list', async (req, res) => {
    try {
        const data = await scrapeAndSaveSeries(process.env.BASE + '/fixtures/series-list')
        res.json(data);
    } catch (error) {
        console.error('Error scraping navbar data:', error);
        res.status(500).json({ error: 'Failed to scrape navbar data' });
    }
});

app.get('/api/series/:slug/:subSlug', async (req, res) => {
    try {
        const { slug, subSlug } = req.params;
        const data = await seriesScrapper(process.env.BASE + '/series/' + slug + "/" + subSlug)

        res.json({ data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to retrieve series ' });
    }
})


// Middleware for input validation
const validateParams = (req, res, next) => {
    const { slug, subSlug, subroute } = req.params;
    if (!slug || !subSlug || !subroute) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    next();
};

// Helper function to get cache key
const getCacheKey = (slug, subSlug, subroute) => `${slug}:${subSlug}:${subroute}`;


async function scrapeCricketMatches() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(process.env.BASE + '/fixtures/match-list', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#date-wise-wrap');

    const matchesByDate = await page.evaluate(() => {
        const dateContainers = document.querySelectorAll('#date-wise-wrap');
        const result = [];

        dateContainers.forEach(dateContainer => {
            const dateElement = dateContainer.querySelector('.date div');
            if (!dateElement) return;

            const date = dateElement.textContent.trim();
            const matchElements = dateContainer.querySelectorAll('.match-card-container');

            const matches = Array.from(matchElements).map(element => {
                const teams = element.querySelectorAll('.team-name');
                const scores = element.querySelectorAll('.team-score');
                const overs = element.querySelectorAll('.total-overs');
                const result = element.querySelector('.result span');
                const matchInfo = element.querySelector('.reason');
                const startTime = element.querySelector('.not-started');
                const logos = element.querySelectorAll("img");
                return {
                    team1: teams[0]?.textContent.trim(),
                    team2: teams[1]?.textContent.trim(),
                    score1: scores[0]?.textContent.trim(),
                    score2: scores[1]?.textContent.trim(),
                    logo1: logos[0]?.src || 'N/A',
                    logo2: logos[1]?.src || 'N/A',
                    overs1: overs[0]?.textContent.trim() || 'N/A',
                    overs2: overs[1]?.textContent.trim() || 'N/A',
                    result: result?.textContent.trim() || 'Upcoming',
                    matchInfo: matchInfo?.textContent.trim() || startTime?.innerText.split("\n")[2] || 'N/A',
                    startTime: startTime ? startTime.innerText.split("\n")[0] : 'N/A'
                };
            });

            result.push({ date, matches });
        });

        return result;
    });

    await browser.close();
    return matchesByDate;
}
app.get('/api/fixtures/match-list', async (req, res) => {
    try {
        // Check if data is in cache
        const cachedData = cache.get('match-list');
        if (cachedData) {
            console.log('Serving from cache');
            return res.json(cachedData);
        }

        // If not in cache, scrape the data
        console.log('Scraping fresh data');
        const matches = await scrapeCricketMatches();

        // Store in cache
        cache.set('matches', matches);

        res.json(matches);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while fetching the data' });
    }
});

app.get('/api/series/:slug/:subSlug/:subroute', validateParams, async (req, res) => {
    try {
        const { slug, subSlug, subroute } = req.params;
        const cacheKey = getCacheKey(slug, subSlug, subroute);

        // Check cache first
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('Returning cached data for', cacheKey);
            return res.json({ data: cachedData });
        }

        let data;
        const baseUrl = `${process.env.BASE}/series/${slug}/${subSlug}/${subroute}`;

        switch (subroute) {
            case 'info':
                data = await scrapeSeriesInfo(baseUrl);
                break;
            case 'news':
                data = await scrapeSeriesNews(baseUrl);
                break;
            case 'series-stats':
                data = await scrapeSeriesStats(baseUrl);
                break;
            case 'points-table':
                data = await scrapePointsTable(baseUrl);
                break;
            case 'team-squad':
                data = await scrapeTeamSquad(baseUrl);
                break;
            case 'matches':
                data = await scrapeMatchesInfo(baseUrl);
                break;
            default:
                return res.status(404).json({ error: 'Invalid subroute' });
        }

        // Cache the data
        cache.set(cacheKey, data);

        res.json({ data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to retrieve series data', details: error.message });
    }
});

app.get('/api/rankings/:gen/:cat', async function (req, res) {
    const { gen, cat } = req.params;
    let url = `${process.env.BASE}/rankings/${gen.toLowerCase()}/${cat.toLowerCase()}`;
    let scrapeFunction;
    switch (gen.toLowerCase()) {
        case 'men':
        case 'women':
            switch (cat.toLowerCase()) {
                case 'teams':
                    scrapeFunction = scrapeCricketRankings;
                    break;
                case 'batter':
                case 'bowler':
                case 'allrounder':
                    scrapeFunction = scrapeRankings;

                    break;
                default:
                    return res.status(400).send('Invalid category');
            }
            break;
        default:
            return res.status(400).send('Invalid gender');
    }

    try {
        const data = await scrapeFunction(url);
        res.json(data);
    } catch (error) {
        console.error('Error in rankings route:', error);
        res.status(500).send('An error occurred while fetching rankings');
    }
});

app.get('/api/rankings', async function (req, res) {

    try {
        const navData = await scrapeCricketRankings();
        res.json(navData);
    } catch (error) {
        console.error('Error scraping navbar data:', error);
        res.status(500).json({ error: 'Failed to scrape navbar data' });
    }
})

app.get('/api/nav', async (req, res) => {
    try {
        const cachedData = cache.get('navData');
        if (cachedData) {
            return res.json(cachedData);
        }
        const navData = await scrapeNavBarData();
        cache.set('navData', navData);
        res.json(navData);
    } catch (error) {
        console.error('Error scraping navbar data:', error);
        res.status(500).json({ error: 'Failed to scrape navbar data' });
    }
});


app.get('/api/scrape-team-list', async (req, res) => {
    try {
        const cachedData = cache.get('team-list');

        if (cachedData) {
            console.log('Returning cached data');
            res.json(cachedData);
        } else {
            console.log('Fetching fresh data');
            const data = await scrapTeamList(process.env.BASE + '/fixtures/team-list');
            cache.set('team-list', data, 3600);
            res.json(data);
        }
    } catch (error) {
        console.error('Error scraping navbar data:', error);
        res.status(500).json({ error: 'Failed to scrape navbar data' });
    }
});

app.get('/api/team-list', async (req, res) => {
    const { searchTerm, page } = req.query;
    try {
        const data = await getTeams(page, 100, searchTerm)
        res.json(data);
    } catch (error) {
        console.error('Error scraping navbar data:', error);
        res.status(500).json({ error: 'Failed to scrape navbar data' });
    }
});

app.get('/api/matches', async (req, res) => {
    try {
        let data = await matchesScrapper(process.env.BASE)
        // data = await matchesScrapper(process.env.BASE);
        console.log(getCacheStats());
        res.json(data);
    } catch (error) {
        console.error('Error scraping the data:', error);
        res.status(500).json({ error: 'Failed to scrape the data' });
    }
});

// app.get('/api/news-blogs', async (req, res) => {
//     try {
//         const { page = 1, limit = 3 } = req.query;

//         // Validate and convert parameters to numbers
//         const pageNumber = parseInt(page, 10);
//         const pageSize = parseInt(limit, 10);

//         if (isNaN(pageNumber) || isNaN(pageSize) || pageNumber < 1 || pageSize < 1) {
//             return res.status(400).json({ error: 'Invalid pagination parameters' });
//         }

//         if (!db) {
//             db = await connectDB(); // Await the connection to ensure `db` is ready
//             if (!db) {
//                 throw new Error('Database connection failed');
//             }
//         }

//         const collection = db.collection('news');

//         // Calculate the skip and limit values
//         const skip = (pageNumber - 1) * pageSize;
//         const matches = await collection.find().skip(skip).limit(pageSize).toArray();
//         const totalCount = await collection.countDocuments();

//         res.json({
//             totalPages: Math.ceil(totalCount / pageSize),
//             currentPage: pageNumber,
//             totalCount,
//             matches
//         });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ error: 'Failed to retrieve matches from the database' });
//     }
// });
async function scrapeTableData(url, maxRetries = 3) {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);  // Increase timeout to 60 seconds

        for (let retry = 0; retry < maxRetries; retry++) {
            try {
                await page.goto(url, { waitUntil: 'networkidle0' });
                await page.waitForSelector(".stats-header", { timeout: 10000 });
                await page.waitForSelector('tbody tr', { timeout: 10000 });

                // Scroll to load all data
                await autoScroll(page);

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
                await new Promise(resolve => setTimeout(resolve, 5000));  // Wait 5 seconds before retrying
            }
        }
    } catch (error) {
        console.error('Scraping failed after max retries:', error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}
app.get('/api/stats-corner', async function (req, res) {
    try {
        const urlList = [
            "https://crex.live/stats/most-fifties-in-ipl-2024?m=2&sid=5&sn=1IR&vn=-1&tm=-1&fmt=2&isT=0&yr=2024",
            "https://crex.live/stats/most-sixes-in-ipl-2024?m=3&sid=5&sn=1IR&vn=-1&tm=-1&fmt=2&isT=0&yr=2024",
            "https://crex.live/stats/most-fours-in-ipl-2024?m=4&sid=5&sn=1IR&vn=-1&tm=-1&fmt=2&isT=0&yr=2024",
            "https://crex.live/stats/ipl-2024-orange-cap-list?m=0&sid=5&sn=1IR&vn=-1&tm=-1&fmt=2&isT=0&yr=2024",
            "https://crex.live/stats/most-runs-in-t20-wc-2024?m=0&sid=1&sn=1H5&vn=-1&tm=-1&fmt=2&isT=1&yr=2024",
            "https://crex.live/stats/most-wickets-in-t20-wc-2024?m=1&sid=1&sn=1H5&vn=-1&tm=-1&fmt=2&isT=1&yr=2024",
            "https://crex.live/stats/most-fours-in-t20-wc-2024?m=0&sid=1&sn=1H5&vn=-1&tm=-1&fmt=2&isT=1&yr=2024",
            "https://crex.live/stats/highest-strike-rate-in-t20-wc-2024?m=5&sid=1&sn=1H5&vn=-1&tm=-1&fmt=2&isT=1&yr=2024",
            "https://crex.live/stats/most-fifties-in-t20-wc-2024?m=2&sid=1&sn=1H5&vn=-1&tm=-1&fmt=2&isT=1&yr=2024",
            "https://crex.live/stats/most-sixes-in-t20-wc-2024?m=3&sid=1&sn=1H5&vn=-1&tm=-1&fmt=2&isT=1&yr=2024",
        ];

        const randomUrl = urlList[Math.floor(Math.random() * urlList.length)];
        const data = await scrapeTableData(randomUrl);
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to retrieve stats corner data', details: error.message });
    }
});

app.get('/api/get-suffle-list', async function (req, res) {
    const baseUrl = 'https://crex.live/stats/most-runs-in-asia-cup-2022?m=0&sid=1&sn=11J&vn=6U&tm=T&fmt=2&isT=6&yr=2022';
    const numberOfClicks = 100;

    const browser = await puppeteer.launch({ headless: true }); // Set to true for production
    const page = await browser.newPage();

    await page.goto(baseUrl, { waitUntil: 'networkidle0' });

    const urls = [baseUrl];

    for (let i = 1; i < numberOfClicks; i++) {
        try {
            await page.waitForSelector('body', { timeout: 5000 });

            await page.evaluate(() => {
                if (typeof shuffleData === 'function') {
                    shuffleData();
                } else {
                    console.error('shuffleData function not found');
                }
            });

            // Wait for the URL to change
            await page.waitForFunction(
                (oldUrl) => window.location.href !== oldUrl,
                { timeout: 5000 },
                page.url()
            );

            // Get the current URL after shuffling
            const currentUrl = await page.url();
            urls.push(currentUrl);

            console.log(`Collected URL ${i + 1}: ${currentUrl}`);

            // Add a small delay to avoid overwhelming the server
            await page.waitForTimeout(1000);
        } catch (error) {
            console.error(`Error on iteration ${i + 1}:`, error.message);
        }
    }

    await browser.close();

    return urls;
});


app.get('/api/series-list', async (req, res) => {
    try {

        if (!db) {
            db = await connectDB();
            if (!db) {
                throw new Error('Database connection failed');
            }
        }

        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto(process.env.BASE + '/fixtures/series-list');
        await page.waitForSelector('.series-card', { timeout: 60000 });

        let hasMoreData = true;

        while (hasMoreData) {
            // Extract data from the current page
            const seriesData = await page.evaluate(() => {
                const series = [];
                document.querySelectorAll('.series-card').forEach(card => {
                    series.push({
                        name: card.querySelector('.series-name').textContent,
                        date: card.querySelector('.series-desc span').textContent,
                        imageUrl: card.querySelector('img').src
                    });
                });
                return series;
            });

            // Insert data into MongoDB
            const seriesCollection = db.collection("cricket_series");
            const result = await seriesCollection.insertMany(seriesData);
            console.log(`${result.insertedCount} documents were inserted`);

            // Check if there's a next button and it's not disabled
            const nextButtonDisabled = await page.evaluate(() => {
                const nextButton = document.querySelector('.arrow.arrow-right');
                return nextButton ? nextButton.disabled : true;
            });

            if (!nextButtonDisabled) {
                await page.click('.arrow.arrow-right');
                await page.waitForNavigation({ waitUntil: 'networkidle0' });
            } else {
                hasMoreData = false;
            }
        }

        await browser.close();
        res.send('Scraping completed successfully');
    } catch (error) {
        console.error('Error during scraping:', error);
        res.status(500).send('An error occurred during scraping');
    }
});



// Ensure to close the browser when the application is terminated
process.on('exit', async () => {
    if (browser) {
        await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
