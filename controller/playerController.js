const NodeCache = require("node-cache");
const {
    scrapePlayerLayoutData
} = require("../service/playerService");
const cache = new NodeCache({ stdTTL: 3600 });
async function getProfileLayout(req, res) {
    try {
        const { slug, subSlug } = req.params;
        const cacheKey = `${slug}_${subSlug}`;

        let data = cache.get(cacheKey);

        if (!data) {
            data = await scrapePlayerLayoutData(process.env.BASE + '/player-profile/' + slug + "/" + subSlug);

            cache.set(cacheKey, data);
        }

        res.json({ data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to retrieve layout' });
    }
}

module.exports = {
    getProfileLayout
}