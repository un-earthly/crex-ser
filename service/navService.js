const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

async function scrapeNavBarData() {

    try {
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
        const page = await browser.newPage();
        await page.goto('https://crex.live/', { waitUntil: 'networkidle2' });

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

        await browser.close();

        return navData;
    } catch (err) {
        console.log(err)
        throw new Error(err.message)
    }
}


module.exports = {
    scrapeNavBarData
}