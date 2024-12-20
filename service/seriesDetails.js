const { createPage } = require("../utility");
const connectDB = require("../db.config");

async function seriesScrapper(url) {
    const page = await createPage();
    try {
        await page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            timeout: 60000
        });

        // Wait for the main content to load
        await page.waitForSelector('.overview-wrapper');

        const content = await page.evaluate(() => {
            const data = {};

            // Extract featured matches
            data.featuredMatches = Array.from(document.querySelectorAll('.match-card-wrapper')).map(match => {
                const matchData = {
                    teams: Array.from(match.querySelectorAll('.team-name')).map(team => team.textContent.trim()),
                    scores: Array.from(match.querySelectorAll('.team-score')).map(score => score.textContent.trim()),
                    result: match.querySelector('.result')?.textContent.trim(),
                    link: match?.href?.replace('https://crex.live', '')
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

        const db = await connectDB();
        const collection = db.collection('seriesData');
        await collection.updateOne(
            { seriesId: url },
            { $set: { seriesData: content } },
            { upsert: true }
        );
        return content;
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);

    } finally {
        await page.close()
    }
}
async function scrapeTeamSquad(url) {
    const page = await createPage();

    try {
        await page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            timeout: 60000
        });

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

        const db = await connectDB();
        const collection = db.collection('squadData');
        await collection.updateOne(
            { seriesid: url },
            { $set: { squadDataData: squadData } },
            { upsert: true }
        );
        return squadData
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);

    }
}
async function scrapeSeriesInfo(url) {
    const page = await createPage();


    try {
        await page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            timeout: 60000
        });

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

        const db = await connectDB();
        const collection = db.collection('seriesInfo');
        await collection.updateOne(
            { seriesid: url },
            { $set: { seriesInfoData: seriesInfo } },
            { upsert: true }
        );
        console.log('Navbar data saved to MongoDB');
        return seriesInfo
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);

    } finally {
        await page.close();
    }
}
async function scrapeMatchesInfo(url) {

    try {
        const page = await createPage();
        await page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
        });

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
                        startTime,
                        link: card.querySelector('a')?.href.replace("https://crex.live", "")
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
        const db = await connectDB();
        const collection = db.collection('matchesInfo');
        await collection.updateOne(
            { seriesId: url },
            { $set: { matchesInfo: matchesInfo } },
            { upsert: true }
        );

        return matchesInfo;
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);

    }
};

async function scrapeSeriesStats(url) {
    const page = await createPage();


    try {
        await page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            timeout: 60000
        });

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

        const result = {
            sharedPointsTableInfo,
            seriesStats
        };

        const db = await connectDB();
        const collection = db.collection('seriesStats');
        await collection.updateOne(
            { seriesId: url },
            { $set: result },
            { upsert: true }
        );


        return result
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);

    }
}

async function scrapePointsTable(url) {
    const page = await createPage();

    try {
        await page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            timeout: 60000
        });

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

        const db = await connectDB();
        const collection = db.collection('pointsTable');
        await collection.updateOne(
            { seriesId: url },
            { $set: { pointsTableInfo: pointsTableInfo } },
            { upsert: true }
        );

        console.log('Points table info saved to MongoDB');
        return pointsTableInfo;
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);

    }
}
async function scrapeSeriesNews(url) {
    const page = await createPage();


    try {
        await page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            timeout: 60000
        });

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

            return {
                newsItems,
                title
            };
        });

        const db = await connectDB();
        const collection = db.collection('seriesNews');
        await collection.updateOne(
            { seriesId: url },
            { $set: { newsWrapper: newsWrapper } },
            { upsert: true }
        );

        console.log('Series news saved to MongoDB');
        return newsWrapper;
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);

    }
}

async function getSeriesData(seriesId) {
    const db = await connectDB();
    const collection = db.collection('seriesData');
    return await collection.findOne({ seriesId });
}

async function getSquadData(seriesid) {
    const db = await connectDB();
    const collection = db.collection('squadData');
    const data = await collection.findOne({ seriesid });
    return data.squadDataData
}

async function getSeriesInfo(seriesid) {
    const db = await connectDB();
    const collection = db.collection('seriesInfo');
    const data = await collection.findOne({ seriesid });
    return data.seriesInfoData
}

async function getMatchesInfo(seriesId) {
    const db = await connectDB();
    const collection = db.collection('matchesInfo');
    const data = await collection.findOne({ seriesId });
    return data.matchesInfo

}

async function getSeriesStats(seriesId) {
    const db = await connectDB();
    const collection = db.collection('seriesStats');
    return await collection.findOne({ seriesId });
}

async function getPointsTable(seriesid) {
    const db = await connectDB();
    const collection = db.collection('pointsTable');
    return await collection.findOne({ seriesid });
}

async function getSeriesNews(seriesId) {
    const db = await connectDB();
    const collection = db.collection('seriesNews');
    const data = await collection.findOne({ seriesId })
    return data.newsWrapper;
}

// Function to get all data for a series
async function getAllSeriesData(seriesid) {
    const [
        seriesData,
        squadData,
        seriesInfo,
        matchesInfo,
        seriesStats,
        pointsTable,
        seriesNews
    ] = await Promise.all([
        getSeriesData(seriesid),
        getSquadData(seriesid),
        getSeriesInfo(seriesid),
        getMatchesInfo(seriesid),
        getSeriesStats(seriesid),
        getPointsTable(seriesid),
        getSeriesNews(seriesid)
    ]);

    return {
        seriesData,
        squadData,
        seriesInfo,
        matchesInfo,
        seriesStats,
        pointsTable,
        seriesNews
    };
}

// Function to get the latest series
async function getLatestSeries(limit = 5) {
    const db = await connectDB();
    const collection = db.collection('seriesInfo');
    return await collection.find().sort({ _id: -1 }).limit(limit).toArray();
}

// Function to search series by name
async function searchSeriesByName(searchTerm) {
    const db = await connectDB();
    const collection = db.collection('seriesInfo');
    return await collection.find(
        { 'seriesInfoData.title': { $regex: searchTerm, $options: 'i' } }
    ).toArray();
}


module.exports = {
    seriesScrapper,
    scrapeMatchesInfo,
    scrapePointsTable,
    scrapeSeriesInfo,
    scrapeSeriesStats,
    scrapeTeamSquad,
    scrapeSeriesNews,
    getSeriesData,
    getSquadData,
    getSeriesInfo,
    getMatchesInfo,
    getSeriesStats,
    getPointsTable,
    getSeriesNews,
    getAllSeriesData,
    getLatestSeries,
    searchSeriesByName
}