const { createPage } = require("../utility");
const connectDB = require("../db.config");
const logMessage = require("../logger");
require("dotenv").config();

function hasNavDataChanged(oldData, newData) {
    if (!oldData || !newData) return true;

    
    if (oldData.logoSrc !== newData.logoSrc ||
        oldData.brandText !== newData.brandText) {
        return true;
    }

    
    if (oldData.navLinks.length !== newData.navLinks.length) {
        return true;
    }

    
    return oldData.navLinks.some((oldLink, index) => {
        const newLink = newData.navLinks[index];

        
        if (oldLink.title !== newLink.title ||
            oldLink.href !== newLink.href) {
            return true;
        }

        
        if (oldLink.items && newLink.items) {
            if (oldLink.items.length !== newLink.items.length) {
                return true;
            }
            return oldLink.items.some((oldItem, itemIndex) => {
                const newItem = newLink.items[itemIndex];
                return oldItem.text !== newItem.text ||
                    oldItem.link !== newItem.link;
            });
        }

        return false;
    });
}

async function scrapeNavBarData() {
    const page = await createPage();
    logMessage('Starting navigation bar scraping...');

    try {
        await page.goto(process.env.BASE, {
            waitUntil: ['load', 'networkidle2'],
            timeout: 30000
        });

        await page.waitForSelector('#myHeader', { visible: true });

        const navData = await page.evaluate(() => {
            const navElement = document.querySelector('#myHeader');
            const logoSrc = navElement.querySelector('img')?.src;
            const brandText = navElement.querySelector('.headText')?.textContent?.trim();

            // Get main nav links
            let navLinks = Array.from(navElement.querySelectorAll('.navbar-nav .nav-item')).map(item => {
                let title = item.querySelector('.nav-link')?.textContent?.trim();
                const href = item.querySelector('.nav-link')?.getAttribute('href');
                title = title?.replace('(current)', '').trim();
                const img = item.querySelector('img')?.src || null;
                return { title, href, img };
            }).filter(link => link.href);

            // Get series dropdown items
            const seriesDropdown = navElement.querySelector('#dropdownMenuButton');
            const dropdownItems = Array.from(document.querySelectorAll('.dropdown-menu .dropdown-item'))
                .map(item => ({
                    text: item.textContent?.trim() || '',
                    link: item.getAttribute('href') || ''
                }))
                .filter(item => item.text && item.link);

            // Insert series dropdown at position 1
            navLinks.splice(1, 0, {
                title: seriesDropdown?.textContent?.trim(),
                href: null,
                items: dropdownItems
            });

            return {
                logoSrc,
                brandText,
                navLinks,
                lastUpdated: new Date().toISOString()
            };
        });

        await saveNavBarData(navData);
        logMessage('Navigation data processing completed');
        return navData;

    } catch (error) {
        logMessage(`Error scraping navigation data: ${error.message}`, true);
        throw error;
    } finally {
        await page.close();
    }
}

async function saveNavBarData(newNavData) {
    const db = await connectDB();
    try {
        const collection = db.collection('navbarData');

        // Get existing data
        const existingData = await collection.findOne({});

        // Check if there are actual changes
        if (!existingData || hasNavDataChanged(existingData.navData, newNavData)) {
            // Update or insert new data
            await collection.updateOne(
                {},
                {
                    $set: {
                        navData: newNavData,
                        lastUpdated: new Date()
                    }
                },
                { upsert: true }
            );
            logMessage('Navigation data updated with changes');
        } else {
            // Just update the timestamp if no changes
            await collection.updateOne(
                {},
                { $set: { lastUpdated: new Date() } }
            );
            logMessage('Navigation data verified - no changes needed');
        }
    } catch (error) {
        logMessage(`Error saving navigation data: ${error.message}`, true);
        throw error;
    }
}

async function getNavBarData() {
    const db = await connectDB();
    try {
        const collection = db.collection('navbarData');
        const result = await collection.findOne({});
        return result?.navData || null;
    } catch (error) {
        logMessage(`Error retrieving navigation data: ${error.message}`, true);
        throw error;
    }
}

module.exports = {
    scrapeNavBarData,
    getNavBarData
};