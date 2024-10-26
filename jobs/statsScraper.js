async function fetchAndStoreStats() {
    const page = await createPage();
    try {
        await axios.post(`${process.env.BASE_SERVER}/api/stats-corner/scraper/suffle`);
    } catch (error) {
        console.error('Error in stats scraper:', error);
    } finally {
        await page.close();
    }
}