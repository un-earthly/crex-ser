export async function fetchAndStoreFixtures() {
    const page = await createPage();
    try {
        // Scrape match fixtures
        await axios.post(`${process.env.BASE_SERVER}/api/fixtures/scrapper/match`);

        // Scrape series fixtures
        await axios.post(`${process.env.BASE_SERVER}/api/fixtures/scrapper/series`);

    } catch (error) {
        console.error('Error in fixtures scraper:', error);
    } finally {
        await page.close();
    }
}
