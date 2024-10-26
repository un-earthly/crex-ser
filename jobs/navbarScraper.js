const { default: axios } = require("axios");

async function fetchAndStoreNavbar() {
    const page = await createPage();
    try {
        await axios.post(`${process.env.BASE_SERVER}/api/nav/scraper`);
    } catch (error) {
        console.error('Error in navbar scraper:', error);
    } finally {
        await page.close();
    }
}
