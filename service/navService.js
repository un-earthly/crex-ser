const { createPage } = require("../utility");
const connectDB = require("../db.config");

async function scrapeNavBarData() {
    const page = await createPage();

    try {

        await page.goto(process.env.BASE, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            timeout: 60000
        });

        // Wait for the navigation bar to load
        await page.waitForSelector('#myHeader', { visible: true });

        const navData = await page.evaluate(() => {
            const navElement = document.querySelector('#myHeader');

            const logoSrc = navElement.querySelector('img')?.src;
            const brandText = navElement.querySelector('.headText')?.textContent.trim();

            // Use 'let' since we may modify 'navLinks'
            let navLinks = Array.from(navElement.querySelectorAll('.navbar-nav .nav-item')).map(item => {
                let title = item.querySelector('.nav-link')?.textContent.trim();
                const href = item.querySelector('.nav-link')?.getAttribute('href');
                if (title?.includes('(current)')) title = title.replace('(current)', '').trim();
                return { title, href };
            });

            // Remove any empty link objects
            navLinks = navLinks.filter(link => link.href);

            // Extract dropdown menu data
            const seriesDropdown = navElement.querySelector('#dropdownMenuButton');
            const dropdownItems = Array.from(document.querySelectorAll('.dropdown-menu .dropdown-item')).map(item => {
                const text = item.textContent.trim();
                const link = item.getAttribute('href');
                return { text, link };
            });

            // Insert the series dropdown right after Home
            navLinks.splice(1, 0, {
                title: seriesDropdown?.textContent.trim(),
                href: null,  // No direct link, it's a dropdown
                items: dropdownItems
            });

            return {
                logoSrc,
                brandText,
                navLinks
            };
        });

        await saveNavBarData(navData);

        return navData;
    } catch (error) {
        console.error('An error occurred:', error);
        console.error('Error stack:', error.stack);
    } finally {
        await page.close();
    }
}
async function saveNavBarData(navData) {
    const db = await connectDB();
    try {
        const collection = db.collection('navbarData');
        await collection.updateOne(
            { id: 'navbar' },
            { $set: { navData: navData } },
            { upsert: true }
        );
        console.log('Navbar data saved to MongoDB');
    } catch (error) {
        console.error('Error saving navbar data to MongoDB:', error);
        throw error;
    }
}

async function getNavBarData() {
    const db = await connectDB();
    try {
        const collection = db.collection('navbarData');
        const result = await collection.findOne({ id: 'navbar' });
        return result ? result.navData : null;
    } catch (error) {
        console.error('Error fetching navbar data from MongoDB:', error);
        throw error;
    }
}


module.exports = {
    scrapeNavBarData,
    getNavBarData
}