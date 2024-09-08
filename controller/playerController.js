const {
    scrapePlayerLayoutData
} = require("../service/playerService");
const { cacheMiddleware } = require("../utility");
async function getProfileLayout(req, res) {
    try {
        const { slug, subSlug } = req.params;

        const data = await scrapePlayerLayoutData(process.env.BASE + '/player-profile/' + slug + "/" + subSlug);


        res.json({ data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to retrieve layout' });
    }
}


module.exports = {
    getProfileLayout: [cacheMiddleware, getProfileLayout]  
};
