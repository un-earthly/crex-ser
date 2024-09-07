const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

async function scrapeCommentary(url, limit) {
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
        await page.goto(url, { waitUntil: 'networkidle2' });

        let commentary = [];
        let hasMore = true;

        for (let i = 0; i < limit; i++) {
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            // Scrape commentary data
            const newCommentary = await page.evaluate(() => {
                const roundcards = document.querySelectorAll('.cm-b-roundcard');
                return Array.from(roundcards).map(card => {
                    return {
                        over: card.querySelector('.cm-b-over')?.textContent.trim() || '',
                        ballUpdate: card.querySelector('.cm-b-ballupdate')?.textContent.trim() || '',
                        commentaryText: card.querySelector('.cm-b-comment-c1')?.textContent.trim() || '',
                        description: card.querySelector('.cm-b-comment-c2')?.textContent.trim() || ''
                    };
                });
            });

            if (newCommentary.length === 0) {
                hasMore = false;
                break;
            }
            commentary = [...commentary, ...newCommentary];
        }

        await browser.close();
        return { commentary, hasMore };
    } catch (error) {
        console.error('Error scraping commentary:', error);
        await browser.close();
        throw error;
    }
}
const getMatchDetailsLayout = async (url) => {
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

    await page.goto(url, { waitUntil: 'networkidle2' });

    const result = await page.evaluate(() => {
        const getTeamData = (teamSelector) => {
            const teamElement = document.querySelector(teamSelector);
            if (!teamElement) return null;
            return {
                name: teamElement.querySelector('.team-name')?.textContent.trim() || '',
                score: teamElement.querySelector('.runs span:first-child')?.textContent.trim() || '',
                overs: teamElement.querySelector('.runs span:last-child')?.textContent.trim() || '',
                imageUrl: teamElement.querySelector('img')?.src || ''
            };
        };

        const team1 = getTeamData('.team-inning:first-child');
        const team2 = getTeamData('.team-inning.second-inning');
        const result = document.querySelector('.result-box span')?.textContent.trim() || '';
        const matchName = document.querySelector('.name-wrapper span')?.textContent.trim() || '';

        return {
            team1,
            team2,
            matchName,
            result
        };
    });

    await browser.close();
    return result;
};
async function scrapeMatchInfoDetails(url) {
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
        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.waitForSelector(".info-container", { visible: true });
        await page.waitForSelector(".live-score-card", { visible: true });
        await page.waitForSelector(".content-wrap", { visible: true })
        await page.waitForSelector(".team-header-card", { visible: true });
        await page.waitForSelector(".table-responsive", { visible: true });
        await page.waitForSelector(".global-card-wrap", { visible: true });
        const matchDetails = await page.evaluate(() => {
            const contentWrap = document.querySelector('.content-wrap.s-wrap');
            let seriesInfo = null;
            if (contentWrap) {
                const seriesLink = contentWrap.getAttribute('href')?.replace(/^\//, '') || '';
                const seriesName = contentWrap.querySelector('.s-name')?.textContent.trim().split('').slice(0, -1).join('').trim() || '';
                seriesInfo = {
                    matchFormat: contentWrap.querySelector('.s-format')?.textContent.trim() || '',
                    seriesName: seriesName,
                    seriesImageUrl: contentWrap.querySelector('.s-img')?.src || '',
                    seriesLink: seriesLink

                };
            }
            const getTeamForm = (teamSelector, matchSelector) => {
                const teamElements = document.querySelectorAll(teamSelector);
                if (!teamElements) return null;

                return Array.from(teamElements).map(teamElement => {
                    const formMatches = Array.from(teamElement.parentNode.querySelectorAll(matchSelector)).map(match => {
                        const result = match.classList.contains('win') ? 'W' : 'L';
                        const isLastMatch = match.classList.contains('loss-match-star');
                        return { result, isLastMatch };
                    });

                    return {
                        name: teamElement.querySelector('.form-team-name')?.textContent.trim() || '',
                        imageUrl: teamElement.querySelector('.form-team-img')?.src || '',
                        form: formMatches
                    };
                });
            };


            const team1Form = getTeamForm('.form-match-team', ".match");

            const otherMatches = Array.from(document.querySelectorAll('.format-card-wrap')).map(card => {
                return {
                    team1: {
                        name: card.querySelector('.form-team-detail:first-child .team-name')?.textContent.trim() || '',
                        score: card.querySelector('.form-team-detail:first-child .team-score')?.textContent.trim() || '',
                        overs: card.querySelector('.form-team-detail:first-child .team-over')?.textContent.trim() || '',
                        imageUrl: card.querySelector('.form-team-detail:first-child img')?.src || ''
                    },
                    team2: {
                        name: card.querySelector('.form-team-detail:last-child .team-name')?.textContent.trim() || '',
                        score: card.querySelector('.form-team-detail:last-child .team-score')?.textContent.trim() || '',
                        overs: card.querySelector('.form-team-detail:last-child .team-over')?.textContent.trim() || '',
                        imageUrl: card.querySelector('.form-team-detail:last-child img')?.src || ''
                    },
                    matchName: card.querySelector('.match-name')?.textContent.trim() || '',
                    seriesName: card.querySelector('.series-name')?.textContent.trim() || '',
                    result: card.querySelector('.win.match span')?.textContent.trim() || card.querySelector('.loss.match span')?.textContent.trim() || ''
                };
            });
            const siblingMatchData = {
                team1: {
                    name: document.querySelector('.team1 .team-name')?.textContent.trim() || '',
                    imageUrl: document.querySelector('.team1 .team-logo img')?.src || ''
                },
                team2: {
                    name: document.querySelector('.team2 .team-name')?.textContent.trim() || '',
                    imageUrl: document.querySelector('.team2 .team-logo img')?.src || ''
                },
            };


            return {
                seriesInfo,
                teamForm: {
                    ...team1Form
                },
                otherMatches,
                siblingMatchData
            };
        });

        const tabsData = [];
        const tabs = await page.$$('.team-comp-type');
        for (let i = 0; i < tabs.length; i++) {
            await tabs[i].click();

            const tabContent = await page.evaluate(() => {
                const stats = Array.from(document.querySelectorAll('.table-responsive tbody tr')).map(row => {
                    const [team1Stat, description, team2Stat] = row.querySelectorAll('td');
                    return {
                        team1Stat: team1Stat?.textContent.trim() || '',
                        description: description?.textContent.trim() || '',
                        team2Stat: team2Stat?.textContent.trim() || ''
                    };
                });
                return stats;
            });

            const tabName = await page.evaluate((tab) => tab.textContent.trim(), tabs[i]);
            tabsData.push({
                tabName,
                stats: tabContent
            });
        }

        matchDetails.tabsData = tabsData;
        const venueDetails = await page.evaluate(() => {
            const venueElement = document.querySelector('#venue-details');
            const venueName = venueElement.querySelector('.title-text')?.innerText || '';
            const weatherCondition = venueElement.querySelector('.weather-cloudy-text-mweb')?.innerText || '';
            const temperature = venueElement.querySelector('.weather-temp')?.innerText || '';
            const humidity = venueElement.querySelector('.humidity-text')?.innerText || '';
            const chanceOfRain = venueElement.querySelector(`.humidity-text+div>img+div`)?.innerText || '';

            // Venue stats
            const matchesPlayed = venueElement.querySelector('.match-count')?.innerText || '';
            const winBatFirst = venueElement.querySelector('.win-bat-first .match-win-per')?.innerText || '';
            const winBowlFirst = venueElement.querySelector('.match-win-per.low-score-color')?.innerText || '';
            const avgFirstInnings = venueElement.querySelector('.venue-avg-wrap .venue-avg-val')?.innerText || '';
            const avgSecondInnings = venueElement.querySelector('.venue-avg-sec-inn .venue-avg-val')?.innerText || '';
            const highstats = Array.from(venueElement.querySelectorAll('.venue-score')).map(el => el.innerText)
            const paceVSspinStats = Array.from(venueElement.querySelectorAll('.wicket-count')).map(el => el.innerText)
            const paceVSspinStatsPercentage = Array.from(venueElement.querySelectorAll('.s-format')).map(el => el.innerText)
            const recentMatchesOnVenue = Array.from(venueElement.querySelectorAll('.global-card-wrap')).map(card => {
                const team1Name = card.querySelector('.global-match-team-detail .team-name')?.innerText.trim() || '';
                const team1Score = card.querySelector('.global-match-team-detail .team-score')?.innerText.trim() || '';
                const team1Overs = card.querySelector('.global-match-team-detail .team-over')?.innerText.trim() || '';
                const team1Img = card.querySelector('.global-match-team img')?.src || '';

                const team2Name = card.querySelector('.global-match-end .team-name')?.innerText.trim() || '';
                const team2Score = card.querySelector('.global-match-end .team-score')?.innerText.trim() || '';
                const team2Overs = card.querySelector('.global-match-end .team-over')?.innerText.trim() || '';
                const team2Img = card.querySelector('.global-match-end img')?.src || '';

                const matchResult = card.querySelector('.match-dec-text')?.innerText.trim() || '';
                const seriesName = card.querySelector('.series-name')?.innerText.trim() || '';
                const matchLink = card.querySelector('.global-match-card')?.href || '';

                return {
                    team1: {
                        name: team1Name,
                        score: team1Score,
                        overs: team1Overs,
                        imageUrl: team1Img
                    },
                    team2: {
                        name: team2Name,
                        score: team2Score,
                        overs: team2Overs,
                        imageUrl: team2Img
                    },
                    result: matchResult,
                    seriesName,
                    matchLink
                };
            })


            return {
                venueName,
                weather: {
                    condition: weatherCondition,
                    temperature,
                    humidity,
                    chanceOfRain,
                },
                stats: {
                    matchesPlayed,
                    winBatFirst,
                    winBowlFirst,
                    avgFirstInnings,
                    avgSecondInnings,
                    highestTotal: highstats[0],
                    lowestTotal: highstats[1],
                    highestChased: highstats[2],
                },
                paceVSspin: {
                    paceWickets: paceVSspinStats[0],
                    spinWickets: paceVSspinStats[1],
                    paceWicketsPercentage: paceVSspinStatsPercentage[0],
                    spinWicketsPercentage: paceVSspinStatsPercentage[1],
                },
                recentMatchesOnVenue,
            };
        });
        const umpireData = await page.evaluate(() => {
            // Create an object to hold the data
            let data = {};

            // Scrape On-field Umpire
            const onFieldUmpireKey = document.querySelector('h2.umpire-key')?.innerText.trim();
            const onFieldUmpireVal = document.querySelector('div.umpire-val')?.innerText.trim();
            if (onFieldUmpireKey && onFieldUmpireVal) {
                data[onFieldUmpireKey] = onFieldUmpireVal;
            }

            // Scrape Third Umpire
            const thirdUmpireKey = document.querySelectorAll('h2.umpire-key')[1]?.innerText.trim();
            const thirdUmpireVal = document.querySelectorAll('div.umpire-val')[1]?.innerText.trim();
            if (thirdUmpireKey && thirdUmpireVal) {
                data[thirdUmpireKey] = thirdUmpireVal;
            }

            // Scrape Referee
            const refereeKey = document.querySelectorAll('h2.umpire-key')[2]?.innerText.trim();
            const refereeVal = document.querySelectorAll('div.umpire-val')[2]?.innerText.trim();
            if (refereeKey && refereeVal) {
                data[refereeKey] = refereeVal;
            }

            return data;
        });
        const playerData = await page.evaluate(async () => {
            document.querySelector('.bench-toggle')?.click()
            const getPlayerData = (selector) => {
                const players = [];
                document.querySelectorAll(selector).forEach(playerElement => {
                    const playerUrl = playerElement.querySelector('a')?.href;
                    const playerName = playerElement.querySelector('.p-name')?.textContent.trim();
                    const playerRole = playerElement.querySelector('.p-name+div')?.textContent.trim();
                    const playerTitle = playerElement.querySelector('.bat-ball-type div')?.textContent.trim();
                    const playerImage = playerElement.querySelector('img')?.src;
                    let imageUrl = playerImage;
                    if (imageUrl.includes('playerPlaceholder.svg')) {
                        imageUrl = 'Image not available';
                    }

                    players.push({
                        profile: playerUrl.replace("https://crex.live", ""),
                        name: playerName,
                        image: imageUrl,
                        role: playerRole,
                        title: playerTitle,
                    });
                });
                return players;
            };
            const toss = {
                icon: document.querySelector(".toss-wrap img")?.src,
                text: document.querySelector(".toss-wrap p")?.textContent
            }
            const teamsData = {};

            const teamButtons = document.querySelectorAll('.playingxi-button');

            for (let i = 0; i < teamButtons.length; i++) {
                // Click on the team tab
                teamButtons[i].click();
                await new Promise(r => setTimeout(r, 500)); // Wait for the DOM to update

                const teamName = teamButtons[i].textContent.trim();

                teamsData[teamName] = getPlayerData('.playingxi-card-row');

            }

            return { teamsData, toss };
        });


        matchDetails.venueDetails = venueDetails;
        matchDetails.playerData = playerData
        matchDetails.umpireData = umpireData;
        return matchDetails;
    } catch (error) {
        console.error('An error occurred while scraping:', error);
        return null;
    } finally {
        await browser.close();
    }
};
async function scrapeScorecardInfo(url) {
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
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.team-tab');
    await page.waitForSelector("img");
    await page.waitForSelector(".p-section-wrapper");
    await page.waitForSelector(".bowler-table");

    // Get all team tabs and determine the active one
    const tabs = await page.$$('.team-tab');

    // Find the index of the currently active tab
    const activeTabIndex = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll(".team-tab"));
        return tabs.findIndex(tab => tab.classList.contains('bgColor'));
    });

    // Function to scrape data for the currently active tab
    async function scrapeTabData() {
        return page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll(".team-tab"));
            const activeTabData = tabs.map(tab => ({
                text: tab.innerText.trim(),
                isActive: tab.classList.contains('bgColor'),
                img: tab.querySelector("img")?.src
            }));

            const partnership = Array.from(document.querySelectorAll(".p-section-wrapper"));
            const partnerShipRows = partnership.map((row) => {
                return {
                    wicket: row.querySelector('.p-wckt-info')?.textContent.trim(),
                    batsman1: {
                        name: row.querySelector('.p-data:first-of-type a p')?.textContent.trim(),
                        runs: row.querySelector('.p-data:first-of-type p:last-child')?.textContent.split('(')[0].trim(),
                        balls: row.querySelector('.p-data:first-of-type .run-highlight')?.textContent.replace(/[()]/g, '').trim()
                    },
                    partnershipRuns: row.querySelector('.p-data:nth-of-type(2) .p-runs')?.textContent.split('(')[0].trim(),
                    partnershipBalls: row.querySelector('.p-data:nth-of-type(2) .p-runs span')?.textContent.replace(/[()]/g, '').trim(),
                    batsman2: {
                        name: row.querySelector('.p-data:last-of-type a p')?.textContent.trim(),
                        runs: row.querySelector('.p-data:last-of-type p:last-child')?.textContent.split('(')[0].trim(),
                        balls: row.querySelector('.p-data:last-of-type .run-highlight')?.textContent.replace(/[()]/g, '').trim()
                    }
                };
            });

            const sections = Array.from(document.querySelectorAll('.table-heading'));
            const sectionsData = sections.map(section => {
                const title = section.querySelector('h3')?.textContent.trim();
                let data = [];
                if (title === "Batting") {
                    const contentSibling = section.nextElementSibling;
                    data = Array.from(contentSibling.querySelectorAll('tbody tr')).map(row => ({
                        batter: row.querySelector('.player-name')?.textContent.trim(),
                        dismissal: row.querySelector('.dismissal-info')?.textContent.trim(),
                        runs: row.querySelector('td:nth-child(2) .run-highlight')?.textContent.trim(),
                        balls: row.querySelector('td:nth-child(3)')?.textContent.trim(),
                        fours: row.querySelector('td:nth-child(4)')?.textContent.trim(),
                        sixes: row.querySelector('td:nth-child(5)')?.textContent.trim(),
                        strikeRate: row.querySelector('td:nth-child(6)')?.textContent.trim(),
                    }));
                    const extrasElement = contentSibling.querySelector('.extras-text');
                    if (extrasElement) {
                        const extrasText = extrasElement.textContent.trim();
                        data.push({ extras: extrasText });
                    }
                } else if (title === "BOWLING") {
                    const contentSibling = section.nextElementSibling;
                    data = Array.from(contentSibling.querySelectorAll('.bowler-table tbody tr')).map(row => ({
                        bowler: row.querySelector('.player-name')?.textContent.trim(),
                        overs: row.querySelector('td:nth-child(2)')?.textContent.trim(),
                        maidens: row.querySelector('td:nth-child(3)')?.textContent.trim(),
                        runsConceded: row.querySelector('td:nth-child(4)')?.textContent.trim(),
                        wickets: row.querySelector('td:nth-child(5)')?.textContent.trim(),
                        economy: row.querySelector('td:nth-child(6)')?.textContent.trim()
                    }));
                } else if (title === "FALL OF WICKETS") {
                    data = Array.from(section.querySelectorAll('tbody tr')).map(row => {
                        return {
                            batsman: row.querySelector('.player-name')?.textContent.trim(),
                            score: row.querySelector('.run-highlight')?.textContent.trim(),
                            overs: row.querySelector('td:last-child div')?.textContent.trim()
                        };
                    });
                } else {
                    return;
                }

                return {
                    title: title,
                    data
                };
            });

            return {
                activeTabData,
                partnerShipRows,
                sectionsData
            };
        });
    }

    // Store data for all tabs
    const allTabsData = [];

    // Scrape data for the currently active tab first
    const activeTabData = await scrapeTabData();
    allTabsData.push({
        tabIndex: activeTabIndex,
        tabName: await tabs[activeTabIndex].evaluate(tab => tab.innerText.trim()),
        data: activeTabData
    });

    // Now scrape data for the other tabs
    for (let i = 0; i < tabs.length; i++) {
        if (i !== activeTabIndex) {
            await tabs[i].click();  // Switch to the tab
            await Promise.resolve(r => r, 1000)

            const tabData = await scrapeTabData();
            allTabsData.push({
                tabIndex: i,
                tabName: await tabs[i].evaluate(tab => tab.innerText.trim()),
                data: tabData
            });
        }
    }

    await browser.close();
    return allTabsData;
}


async function scrapeLiveMatchInfo(url) {
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
        // Navigate to the webpage
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.overs-slide');

        // Scrape player data
        const playersData = await page.evaluate(() => {
            const playerCards = document.querySelectorAll('.batsmen-partnership');
            return Array.from(playerCards).map(card => {
                return {
                    name: card.querySelector('.batsmen-name')?.textContent.trim() || null,
                    img: card.querySelector('img')?.src || null,
                    link: card.querySelector('a')?.href.replace("https://crex.live", "") || null,
                    score: {
                        runs: card.querySelectorAll('.batsmen-score p')[0]?.innerText || null,
                        ball: card.querySelectorAll('.batsmen-score p')[1]?.innerText || null,
                    },
                    strikeRate: Array.from(card.querySelectorAll('.strike-rate')).map(srCard => {
                        const spans = srCard.querySelectorAll('span');
                        return {
                            [spans[0]?.textContent.trim()]: spans[1]?.textContent.trim()
                        };
                    })
                };
            });
        });

        // Scrape overs data
        const oversData = await page.evaluate(() => {
            const slides = document.querySelectorAll(".overs-slide");
            return Array.from(slides).map(slide => {
                return {
                    thisOver: slide.querySelector("span")?.textContent.trim() || '',
                    overData: Array.from(slide.querySelectorAll(".over-ball")).map(ball => ball.textContent.trim())
                };
            });
        });

        const probability = await page.evaluate(() => {
            const teamNames = Array.from(document.querySelectorAll('.odds-session-left .teamNameScreenText'))
                .map(el => el.textContent.trim());
            const percentages = Array.from(document.querySelectorAll('.odds-session-left .percentageScreenText'))
                .map(el => el.textContent.trim());
            const progressBarWidth = document.querySelector('#favTeamProgress')?.style.width || '0%';
            return { teams: teamNames, percentages, progressBarWidth };
        });

        const projectedScore = await page.evaluate(() => {
            const headers = document.querySelectorAll('.projected-score .p-score thead th span.rr-text.rr-data');
            const rows = document.querySelectorAll('.projected-score .p-score tbody tr');

            return {
                headers: Array.from(headers).map(header => header.textContent.trim()),
                rows: Array.from(rows).map(row => {
                    const cols = row.querySelectorAll('td span.over-data');
                    return Array.from(cols).map(col => col.textContent.trim());
                })
            };
        });
        const playerOfTheMatch = await page.evaluate(() => {
            const pomCard = document.querySelector('.player-of-match-card');
            if (!pomCard) return null;

            const playerLink = pomCard.querySelector('a');
            const playerName = pomCard.querySelector('.mom-player')?.textContent.trim();
            const team = pomCard.querySelector('.profile span:not(.mom-player)')?.textContent.trim();
            const performanceData = Array.from(pomCard.querySelectorAll('.data-card-pom')).map(card => card.textContent.trim());

            return {
                name: playerName || null,
                team: team || null,
                link: playerLink?.href.replace("https://crex.live", "") || null,
                performance: performanceData
            };
        });

        const inningWiseSessionPR = await page.evaluate(() => {
            const sessions = document.querySelectorAll('app-match-inning-wise-session');
            return Array.from(sessions).map(session => {
                const teamInfos = Array.from(session.querySelectorAll('.ssn-data')).map(dataItem => {
                    const sessionDetails = [];
                    const tableElement = dataItem.closest('.ssn-score').querySelector('.p-score');

                    if (tableElement) {
                        Array.from(tableElement.querySelectorAll('tbody tr')).forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length === 3) {
                                sessionDetails.push({
                                    session: cells[0]?.innerText.trim(),
                                    open: cells[1]?.innerText.trim(),
                                    pass: cells[2]?.innerText.trim()
                                });
                            }
                        });
                    } else {
                        console.warn(`Table not found for team: ${dataItem.innerText.trim()}`);
                    }

                    return {
                        teamName: dataItem.querySelector(".ps-text")?.innerText.trim() || null,
                        sessionDetails
                    };
                });

                return teamInfos;
            });
        });

        return {
            playersData,
            oversData,
            projectedScore,
            probability,
            inningWiseSessionPR,
            playerOfTheMatch
        };
    } catch (error) {
        console.error('Error scraping live match info:', error);
    } finally {
        await browser.close();
    }
}

async function getAllMatchService(url) {
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

        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.live-card');
        await page.waitForSelector("img")
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
                        overs: overs,
                        logo: teamElement.querySelector("img")?.src
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

                const upcomingTime = card.querySelector('.upcomingTime')?.title;

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
                    startTime,
                    link: card.querySelector('.live-card>a')?.href.replace('https://crex.live', '') || null

                };
            });
        });



        return matches;
    } catch (error) {
        console.error('Error during scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}
module.exports = {
    scrapeCommentary,
    getMatchDetailsLayout,
    scrapeMatchInfoDetails,
    scrapeScorecardInfo,
    scrapeLiveMatchInfo,
    getAllMatchService
}