export async function fetchAndStoreFixtures() {
    const page = await createPage();
    try {
        
    } catch (error) {
        console.error('Error in fixtures scraper:', error);
    } finally {
        await page.close();
    }
}
