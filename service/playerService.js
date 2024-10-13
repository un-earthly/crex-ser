const connectDB = require("../db.config");
const { createPage } = require("../utility");
async function scrapePlayerLayoutData(url) {
    const page = await createPage();

    try {

        await page.goto(url, { waitUntil: 'networkidle0' });
        await page.waitForSelector(".playerAge")

        const playerData = await page.evaluate(() => {
            // Extract the player's name
            const playerFName = document.querySelector('.playerFName')?.textContent?.trim() || '';
            const playerLName = document.querySelector('.playerLName')?.textContent?.trim() || '';

            // Extract the team name
            const teamName = document.querySelector('.bgTeamName')?.textContent?.trim() || '';

            // Extract the age
            const age = document.querySelector('.playerAge span:last-child')?.textContent?.trim();
            const teamFlag = document.querySelector('.playerAge img')?.src || '';

            // Extract the role
            const role = document.querySelector('.btText span')?.textContent?.trim() || '';

            // Extract the player image
            const playerImg = document.querySelector('.playerProfileDefault img[alt]')?.src || '';

            // Extract the jersey image
            const jerseyImg = document.querySelector('.playerProfileDefault img.mr-top')?.src || '';
            const rankings = Array.from(document.querySelectorAll('.playerTop'))
                .map(el => el.textContent.trim())
                .filter(text => text);
            return {
                playerFName,
                playerLName,
                teamName,
                age,
                teamFlag,
                role,
                playerImg,
                jerseyImg,
                rankings
            };
        });
        await savePlayerData(playerData);

        return playerData;
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);
        if (error instanceof puppeteer.errors.TimeoutError) {
            console.error('Navigation timed out. Current URL:', page.url());
        }
    } finally {
        await page.close();
    }
}

async function savePlayerData(playerData) {
    const db = await connectDB();
    try {
        const collection = db.collection('playerData');
        await collection.updateOne(
            { playerFName: playerData.playerFName, playerLName: playerData.playerLName },
            { $set: playerData },
            { upsert: true }
        );
        console.log('Player data saved to MongoDB');
    } catch (error) {
        console.error('Error saving player data to MongoDB:', error);
        throw error;
    } finally {
        await db.close();
    }
}

async function getPlayerData(firstName, lastName) {
    const db = await connectDB();
    try {
        const collection = db.collection('playerData');
        const result = await collection.findOne({ playerFName: firstName, playerLName: lastName });
        return result;
    } catch (error) {
        console.error('Error fetching player data from MongoDB:', error);
        throw error;
    } finally {
        await db.close();
    }
}

async function getAllPlayers() {
    const db = await connectDB();
    try {
        const collection = db.collection('playerData');
        const result = await collection.find({}).toArray();
        return result;
    } catch (error) {
        console.error('Error fetching all player data from MongoDB:', error);
        throw error;
    } finally {
        await db.close();
    }
}

async function getPlayersByTeam(teamName) {
    const db = await connectDB();
    try {
        const collection = db.collection('playerData');
        const result = await collection.find({ teamName: teamName }).toArray();
        return result;
    } catch (error) {
        console.error('Error fetching player data by team from MongoDB:', error);
        throw error;
    } finally {
        await db.close();
    }
}
module.exports = {
    scrapePlayerLayoutData,
    getAllPlayers,
    getPlayersByTeam,
    getPlayerData
}