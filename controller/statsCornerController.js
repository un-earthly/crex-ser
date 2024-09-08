const { scrapeShuffledStatsData } = require("../service/statsCornerService");
const { cacheMiddleware } = require("../utility");

const shuffleStatsCorner = async (req, res) => {
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
        const data = await scrapeShuffledStatsData(randomUrl);
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to retrieve stats corner data', details: error.message });
    }
};

module.exports = {
    shuffleStatsCorner: [cacheMiddleware, shuffleStatsCorner]
};
