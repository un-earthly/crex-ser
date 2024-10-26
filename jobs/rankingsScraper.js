const { createPage } = require("../utility");
const connectDB = require("../db.config");
const { default: axios } = require("axios");

async function fetchAndStoreRankings() {
    const page = await createPage();
    const db = await connectDB();
    try {
        const categories = ['men', 'women'];
        const types = ['teams', 'batter', 'bowler', 'allrounder'];

        for (const gender of categories) {
            for (const type of types) {
                const url = `${process.env.BASE_SERVER}/api/rankings/scrapper/${gender}/${type}`;
                try {
                    await axios.post(url);
                    console.log(`Fetched rankings for ${gender} ${type}`);
                } catch (error) {
                    console.error(`Error fetching rankings for ${gender} ${type}:`, error.message);
                }
            }
        }
    } catch (error) {
        console.error('Error in rankings scraper:', error);
    } finally {
        await page.close();
    }
}