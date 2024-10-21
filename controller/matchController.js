const {
    scrapeCommentary,
    scrapeMatchInfoDetails,
    scrapeLiveMatchInfo,
    scrapeScorecardInfo,
    scrapeAllMatchService,
    scrapeMatchDetailsLayout,
    getAllMatches,
    getCommentary,
    getMatchLayout,
    getScorecardInfo,
    getMatchInfoDetails,
    getLiveMatchInfo,
    fetchLiveMatchScores

} = require("../service/matchService");
const { cacheMiddleware } = require("../utility");

async function scrapeMatchInfoController(req, res) {
    const { param1, param2, param3, param4, param5, param6, sub } = req.params;

    const url = `${process.env.BASE}/scoreboard/${param1}/${param2}/${param3}/${param4}/${param5}/${param6}/${sub}`;
    try {
        let data;
        switch (sub) {
            case 'live':
                data = await scrapeLiveMatchInfo(url);
                break;
            case 'info':
                data = await scrapeMatchInfoDetails(url);
                break;
            case 'scorecard':
                data = await scrapeScorecardInfo(url);
                break;
            default:
                res.status(400).json({ error: 'Invalid type specified' });
                return;
        }

        res.json(data);
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).json({ error: 'Failed to retrieve match details' });
    }
}

async function scraperMatchLayout(req, res) {
    const { param1, param2, param3, param4, param5, param6 } = req.params;

    try {
        const url = `${process.env.BASE}/scoreboard/${param1}/${param2}/${param3}/${param4}/${param5}/${param6}`;
        const data = await scrapeMatchDetailsLayout(url);

        res.json(data);
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).json({ error: 'Failed to retrieve match details' });
    }
}
async function scrapeCommentaryController(req, res) {
    const { param1, param2, param3, param4, param5, param6, limit } = req.params;
    const url = `${process.env.BASE}/scoreboard/${param1}/${param2}/${param3}/${param4}/${param5}/${param6}/live`;
    try {
        const commentaryData = await scrapeCommentary(url, limit);
        res.json(commentaryData);
    } catch (error) {
        console.error('Error occurred while fetching commentary:', error);
        res.status(500).json({ error: 'Failed to retrieve commentary' });
    }
}

async function scrapeAllMatches(req, res) {
    console.log("api hit")
    try {
        const url = process.env.BASE;

        const data = await scrapeAllMatchService(url);


        res.json(data);
    } catch (error) {
        console.error('Error scraping the data:', error);
        res.status(500).json({ error: 'Failed to scrape the data' });
    }
}

async function getMatchLayoutController(req, res) {
    const { param1, param2, param3, param4, param5, param6 } = req.params;

    try {
        const url = `${process.env.BASE}/scoreboard/${param1}/${param2}/${param3}/${param4}/${param5}/${param6}`;
        const data = await getMatchLayout(url);

        res.json(data);
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).json({ error: 'Failed to retrieve match layout' });
    }
}

async function getCommentaryController(req, res) {
    const { param1, param2, param3, param4, param5, param6, limit } = req.params;
    const url = `${process.env.BASE}/scoreboard/${param1}/${param2}/${param3}/${param4}/${param5}/${param6}/live`;
    try {
        const commentaryData = await getCommentary(url, limit);
        res.json(commentaryData);
    } catch (error) {
        console.error('Error occurred while fetching commentary:', error);
        res.status(500).json({ error: 'Failed to retrieve commentary' });
    }
}

async function getMatchInfoController(req, res) {
    const { param1, param2, param3, param4, param5, param6, sub } = req.params;

    const url = `${process.env.BASE}/scoreboard/${param1}/${param2}/${param3}/${param4}/${param5}/${param6}/${sub}`;
    console.log(url)
    try {
        let data;
        switch (sub) {
            case 'live':
                data = await getLiveMatchInfo(url);
                break;
            case 'info':
                data = await getMatchInfoDetails(url);
                break;
            case 'scorecard':
                data = await getScorecardInfo(url);
                break;
            default:
                res.status(400).json({ error: 'Invalid type specified' });
                return;
        }

        res.json(data);
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).json({ error: 'Failed to retrieve match details' });
    }
}

async function getAllMatchesController(req, res) {
    console.log("api hit")
    try {
        const url = process.env.BASE;

        const data = await getAllMatches(url);

        res.json(data);
    } catch (error) {
        console.error('Error scraping the data:', error);
        res.status(500).json({ error: 'Failed to scrape the data' });
    }
}

async function getLiveMatchScoresController() {
    const liveMatchScores = await fetchLiveMatchScores();
    return liveMatchScores;
}
module.exports = {
    scraperMatchLayout: [cacheMiddleware, scraperMatchLayout],
    scrapeCommentaryController: [cacheMiddleware, scrapeCommentaryController],
    scrapeMatchInfoController: [cacheMiddleware, scrapeMatchInfoController],
    scrapeAllMatches: [cacheMiddleware, scrapeAllMatches],
    getMatchLayout: [cacheMiddleware, getMatchLayoutController],
    getCommentary: [cacheMiddleware, getCommentaryController],
    getMatchInfo: [cacheMiddleware, getMatchInfoController],
    getAllMatches: [cacheMiddleware, getAllMatchesController],
    getLiveMatchScores: [() => { }, getLiveMatchScoresController]
};
