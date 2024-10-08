const { createPage } = require("../utility");

async function scrapeRankings(url) {
    const page = await createPage();
    try {
        await page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            timeout: 60000
        });

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

        return rankings;
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);
        if (error instanceof puppeteer.errors.TimeoutError) {
            console.error('Navigation timed out. Current URL:', page.url());
        }
    }
}

async function scrapeCricketRankings(url) {
    const page = await createPage();
    try {
        await page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            timeout: 60000
        });

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

        
        return rankings;
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);
        if (error instanceof puppeteer.errors.TimeoutError) {
            console.error('Navigation timed out. Current URL:', page.url());
        }
    }
}

module.exports = {
    scrapeCricketRankings,
    scrapeRankings
}