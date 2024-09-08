const {
    scrapeCommentary,
    getMatchDetailsLayout,
    getAllMatchService,
    scrapeMatchInfoDetails,
    scrapeLiveMatchInfo,
    scrapeScorecardInfo
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
        const data = await getMatchDetailsLayout(url);

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

        const data = await getAllMatchService(url);


        res.json(data);
    } catch (error) {
        console.error('Error scraping the data:', error);
        res.status(500).json({ error: 'Failed to scrape the data' });
    }
}


module.exports = {
    scraperMatchLayout: [cacheMiddleware, scraperMatchLayout],
    scrapeCommentaryController: [cacheMiddleware, scrapeCommentaryController],
    scrapeMatchInfoController: [cacheMiddleware, scrapeMatchInfoController],
    scrapeAllMatches: [cacheMiddleware, scrapeAllMatches]
};
