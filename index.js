const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;
const chromium = require("@sparticuz/chromium");
const connectDB = require('./db.config');
const { config } = require('dotenv');
const NodeCache = require('node-cache');
const { getCacheKey } = require('./utility');
const { default: puppeteer } = require('puppeteer');
const newsRoutes = require('./routes/newsRoutes');
const statsRoutes = require('./routes/statsCornerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const seriesDetailsRoutes = require('./routes/seriesRoutes');
const fixturesRoutes = require('./routes/fixtureRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const playerRoutes = require('./routes/playerRoutes');
const navRoutes = require('./routes/navRoutes');

config()
app.use(cors())
app.use(express.json())
const cache = new NodeCache({ stdTTL: 3600 });


let db;
let browser;









app.use('/api/nav',navRoutes);


// app.get('/api/scrape-team-list', async (req, res) => {
//     try {
//         const cachedData = cache.get('team-list');

//         if (cachedData) {
//             res.json(cachedData);
//         } else {
//             const data = await scrapTeamList(process.env.BASE + '/fixtures/team-list');
//             cache.set('team-list', data, 3600);
//             res.json(data);
//         }
//     } catch (error) {
//         console.error('Error scraping navbar data:', error);
//         res.status(500).json({ error: 'Failed to scrape navbar data' });
//     }
// });


app.use('/api/rankings', rankingRoutes);
app.use('/api/fixtures', fixturesRoutes);
app.use("/api/series",seriesDetailsRoutes)
app.use('/api/news-blogs', newsRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/stats-corner', statsRoutes);
app.use('/api/player-profile', playerRoutes);


// app.get('/api/scrape-series-list', async (req, res) => {
//     try {
//         const data = await scrapeAndSaveSeries(process.env.BASE + '/fixtures/series-list', req.query.offset)
//         res.json(data);
//     } catch (error) {
//         console.error('Error scraping navbar data:', error);
//         res.status(500).json({ error: 'Failed to scrape navbar data' });
//     }
// });

// app.get('/api/series', );


// Ensure to close the browser when the application is terminated
process.on('exit', async () => {
    if (browser) {
        await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
