const connectDB = require("../db.config");
const { createPage } = require("../utility");
const scrapeNewsBlogs = async (clicks = 0) => {
    const page = await createPage();

    try {


        await page.goto('https://crex.live', { waitUntil: 'networkidle2' });
        await page.waitForSelector('section.news-topic-wrapper');
        await page.waitForSelector(".news-card")

        if (clicks) {
            for (let i = 0; i < clicks; i++) {
                await page.waitForSelector('.more-button', { visible: true, timeout: 5000 }).catch(() => {
                    console.log('Read More button not found. All content may have been loaded.');
                    return;
                });

                await page.evaluate(() => {
                    const button = document.querySelector('.more-button');
                    if (button) button.click();
                });

                console.log(`Clicked ${i + 1} times`);

                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        const data = await page.evaluate(() => {
            const cards = [];
            const cardElements = document.querySelectorAll('section.news-topic-wrapper .card-wrapper');

            cardElements.forEach(card => {
                const title = card.querySelector('.heading h2').innerText.trim();
                const imageUrl = card.querySelector('.news-card-img img').src;
                const link = card.querySelector('.news-card-img a').href?.replace('https://cricket.one', "");
                const tags = Array.from(card.querySelectorAll('.news-tag ul li a')).map(tag => tag.innerText.trim());
                const description = card.querySelector('.news-heading p').innerText.trim();
                const time = card.querySelector('.news-time span').innerText.trim();

                cards.push({
                    title,
                    imageUrl,
                    link,
                    tags,
                    description,
                    time
                });
            });

            return cards;
        });
        await saveNewsBlogsData(data);

        return data;
    } catch (error) {
        console.error('Error scraping the data:', error);
        throw new Error('Failed to scrape the data');
    }
};
const scrapeBlogDetails = async (blogUrl) => {
    const page = await createPage();

    try {


        await page.goto(blogUrl, { waitUntil: 'networkidle2' });

        await page.waitForSelector('.blog-details-container');

        const blogDetails = await page.evaluate(() => {
            const title = document.querySelector('.blog-title').innerText.trim();
            const author = document.querySelector('.author-name').innerText.trim();
            const datePublished = document.querySelector('.published-date').innerText.trim();
            const content = document.querySelector('.blog-content').innerText.trim();
            const imageUrl = document.querySelector('.blog-img img').src;

            return {
                title,
                author,
                datePublished,
                content,
                imageUrl
            };
        });
        await saveBlogDetailsData(blogDetails);

        return blogDetails;
    } catch (error) {
        console.error('Error scraping blog details:', error);
        throw new Error('Failed to scrape blog details');
    }
};
async function saveNewsBlogsData(data) {
    const db = await connectDB();
    try {
        const collection = db.collection('newsBlogs');
        await collection.updateOne(
            { id: 'newsBlogs' },
            { $set: { data: data } },
            { upsert: true }
        );
        console.log('News blogs data saved to MongoDB');
    } catch (error) {
        console.error('Error saving news blogs data to MongoDB:', error);
        throw error;
    }
}

async function saveBlogDetailsData(blogDetails) {
    const db = await connectDB();
    try {
        const collection = db.collection('blogDetails');
        await collection.insertOne(blogDetails);
        console.log('Blog details saved to MongoDB');
    } catch (error) {
        console.error('Error saving blog details to MongoDB:', error);
        throw error;
    }
}

async function getNewsBlogsData(clicks) {
    const db = await connectDB();
    try {
        const collection = db.collection('newsBlogs');
        const result = await collection.findOne({ id: 'newsBlogs' });

        if (result && result.data) {
            const data = result.data;

            // Calculate how many data items to return
            const itemsToReturn = Math.min(data.length, clicks * 3);

            // Create an array to hold the result
            const output = [];

            for (let i = 0; i < clicks; i++) {
                // Push 3 items from data for each click
                for (let j = 0; j < 3; j++) {
                    if (output.length < itemsToReturn) {
                        output.push(data[(i * 3) + j]);
                    } else {
                        break; // Stop if we've reached the limit
                    }
                }
            }

            return output;
        }

        return null;
    } catch (error) {
        console.error('Error fetching news blogs data from MongoDB:', error);
        throw error;
    }
}


async function getBlogDetailsData() {
    const db = await connectDB();
    try {
        const collection = db.collection('blogDetails');
        return await collection.find().toArray();
    } catch (error) {
        console.error('Error fetching blog details from MongoDB:', error);
        throw error;
    }
}
module.exports = {
    scrapeNewsBlogs,
    scrapeBlogDetails,
    getNewsBlogsData,
    getBlogDetailsData
};