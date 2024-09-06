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

config()
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



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
