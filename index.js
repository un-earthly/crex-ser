const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;
const { config } = require('dotenv');
const newsRoutes = require('./routes/newsRoutes');
const statsRoutes = require('./routes/statsCornerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const seriesDetailsRoutes = require('./routes/seriesRoutes');
const fixturesRoutes = require('./routes/fixtureRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const playerRoutes = require('./routes/playerRoutes');
const navRoutes = require('./routes/navRoutes');
const { closeBrowser } = require('./utility');
const cron = require('node-cron');
const fetchAndStoreMatches = require('./jobs/matchesListScrapper');

config();
app.use(cors())
app.use(express.json())


app.use('/api/rankings', rankingRoutes);
app.use('/api/fixtures', fixturesRoutes);
app.use("/api/series", seriesDetailsRoutes)
app.use('/api/news-blogs', newsRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/stats-corner', statsRoutes);
app.use('/api/player-profile', playerRoutes);
app.use('/api/nav', navRoutes);

async function runFetchAndStoreMatches() {
    try {
        const { uniqueMatchLinks, uniqueSeriesLinks } = await fetchAndStoreMatches();
        return {
            data:
            {
                uniqueMatchLinks,
                uniqueSeriesLinks
            }
        }
    } catch (error) {
        console.error('Failed to fetch and store matches:', error);
    }
}
cron.schedule('0 0 * * *', async () => {
    try {
        const matchLinks = await runFetchAndStoreMatches();
        console.log(`Cron job completed. Fetched and stored ${matchLinks.length} match links.`);
    } catch (error) {
        console.error('Cron job failed:', error);
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await closeBrowser();
    server.close(() => {
        console.log('Server shut down');
        process.exit(0);
    });
});