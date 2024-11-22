const connectDB = require("../db.config");
const { createPage } = require("../utility");

const convertRelativeTimeToTimestamp = (relativeTime) => {
    const now = new Date();
    const matches = relativeTime.match(/(\d+)\s*(\w+)\s*ago/);

    if (!matches) return now;

    const value = parseInt(matches[1]);
    const unit = matches[2].toLowerCase();

    let timestamp = new Date(now);

    switch (unit) {
        case 'second':
        case 'seconds':
            timestamp.setSeconds(now.getSeconds() - value);
            break;
        case 'minute':
        case 'minutes':
            timestamp.setMinutes(now.getMinutes() - value);
            break;
        case 'hour':
        case 'hours':
            timestamp.setHours(now.getHours() - value);
            break;
        case 'day':
        case 'days':
            timestamp.setDate(now.getDate() - value);
            break;
        case 'week':
        case 'weeks':
            timestamp.setDate(now.getDate() - (value * 7));
            break;
        case 'month':
        case 'months':
            timestamp.setMonth(now.getMonth() - value);
            break;
        case 'year':
        case 'years':
            timestamp.setFullYear(now.getFullYear() - value);
            break;
        default:
            return now;
    }

    return timestamp;
};

const scrapeNewsBlogs = async (clicks = 0) => {
    const page = await createPage();
    try {
        await page.goto('https://crex.live', { waitUntil: 'networkidle2' });
        await Promise.all([
            page.waitForSelector('section.news-topic-wrapper'),
            page.waitForSelector(".news-card")
        ]);


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
                const title = card.querySelector('.heading h2')?.innerText.trim();
                const imageUrl = card.querySelector('.news-card-img img')?.src;
                const link = card.querySelector('.news-card-img a')?.href?.replace('https://cricket.one', "");
                const tags = Array.from(card.querySelectorAll('.news-tag ul li a')).map(tag => tag.innerText.trim());
                const description = card.querySelector('.news-heading p')?.innerText.trim();
                const relativeTime = card.querySelector('.news-time span')?.innerText.trim();

                if (title && link) {
                    cards.push({
                        title,
                        imageUrl,
                        matchUrl: link.substring(1),
                        tags,
                        description,
                        relativeTime
                    });
                }
            });

            return cards;
        });

        const processedData = data.map(blog => ({
            ...blog,
            createdAt: convertRelativeTimeToTimestamp(blog.relativeTime),
            displayTime: blog.relativeTime // Keep the display format
        }));

        const sortedData = processedData.sort((a, b) => b.createdAt - a.createdAt);

        await saveNewsBlogsData(sortedData);

        const concurrencyLimit = 3;
        const detailedBlogs = [];

        for (let i = 0; i < sortedData.length; i += concurrencyLimit) {
            const batch = sortedData.slice(i, i + concurrencyLimit);
            const batchResults = await Promise.all(
                batch.map(async (blog) => {
                    try {
                        const existingDetails = await checkBlogDetailsExists(blog.matchUrl);
                        if (existingDetails) {
                            return { ...blog, details: existingDetails };
                        }

                        if (blog.link) {
                            const details = await scrapeBlogDetails(blog.matchUrl, blog.link);
                            return { ...blog, details };
                        }
                        return blog;
                    } catch (error) {
                        console.error(`Error processing blog ${blog.title}:`, error);
                        return blog;
                    }
                })
            );
            detailedBlogs.push(...batchResults);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return detailedBlogs;
    } catch (error) {
        console.error('Error scraping blogs:', error);
        throw error;
    } finally {
        await page.close();
    }
};


const scrapeBlogDetails = async (blogId, blogUrl) => {
    const page = await createPage();
    try {
        await Promise.all([
            page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
            page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 }),
            page.setJavaScriptEnabled(true)
        ]);

        await page.goto('https://cricket.one' + blogUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        const errorPage = await page.evaluate(() => {
            return document.title.includes('Access Denied') ||
                document.body.textContent.includes('Access Denied');
        });

        if (errorPage) {
            await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
            await page.reload({ waitUntil: 'networkidle2' });

            if (await page.evaluate(() => document.title.includes('Access Denied'))) {
                throw new Error('Access Denied');
            }
        }

        await page.waitForSelector('.section-inner-first', { timeout: 10000 });

        const blogDetails = await page.evaluate(() => {
            const mainContainer = document.querySelector('.section-inner-first');
            const content = Array.from(mainContainer.children).map(element => {
                if (element.tagName === 'H2') {
                    return { type: 'heading', content: element.textContent.trim() };
                }
                if (element.tagName === 'P') {
                    const img = element.querySelector('img');
                    if (img) {
                        return {
                            type: 'image',
                            src: img.src,
                            alt: img.alt,
                            caption: element.textContent.replace(img.alt, '').trim()
                        };
                    }
                    const text = element.textContent.trim();
                    return text ? { type: 'paragraph', content: text } : null;
                }
                return null;
            }).filter(Boolean);

            const tags = Array.from(document.querySelectorAll('.tags a')).map(tag => tag.innerText);


            const wordCount = content
                .filter(item => item.type === 'paragraph')
                .reduce((count, item) => count + item.content.split(/\s+/).length, 0);

            return {
                title: mainContainer.querySelector('h1')?.textContent.trim(),
                content,
                url: window.location.href,
                metadata: {
                    wordCount,
                    readingTime: Math.ceil(wordCount / 200)
                },
                tags
            };
        });

        const detailsWithId = {
            matchUrl: blogId,
            ...blogDetails,
            updatedAt: new Date()
        };

        await saveBlogDetailsData(detailsWithId);
        return detailsWithId;
    } catch (error) {
        console.error(`Error scraping blog details: ${blogUrl}`, error);
        throw error;
    } finally {
        await page.close();
    }
};

const saveNewsBlogsData = async (blogs) => {
    const db = await connectDB();
    try {
        const collection = db.collection('newsBlogs');
        const operations = await Promise.all(blogs.map(async (blog) => {
            const existingBlog = await collection.findOne({ matchUrl: blog.matchUrl });

            if (existingBlog) {
                const { createdAt: oldCreatedAt } = existingBlog;
                return {
                    updateOne: {
                        filter: { matchUrl: blog.matchUrl },
                        update: {
                            $set: {
                                ...blog,
                                createdAt: oldCreatedAt,
                                updatedAt: new Date()
                            }
                        }
                    }
                };
            }

            return {
                insertOne: {
                    document: {
                        ...blog,
                        updatedAt: new Date()
                    }
                }
            };
        }));

        if (operations.length > 0) {
            await collection.bulkWrite(operations);
        }
    } catch (error) {
        console.error('Database operation failed:', error);
        throw error;
    }
};

const getNewsBlogsData = async (clicks) => {
    const db = await connectDB();
    try {
        const collection = db.collection('newsBlogs');
        return await collection
            .find({})
            .sort({ createdAt: -1 })
            .limit(clicks * 3)
            .toArray();
    } catch (error) {
        console.error('Error fetching blogs:', error);
        throw error;
    }
};

const getBlogDetailsData = async (id) => {
    const db = await connectDB();
    try {
        const collection = db.collection('blogDetails');
        return await collection.findOne({ matchUrl: id });
    } catch (error) {
        console.error('Error fetching blog details:', error);
        throw error;
    }
};

const checkBlogDetailsExists = async (blogId) => {
    const db = await connectDB();
    try {
        const collection = db.collection('blogDetails');
        return await collection.findOne({ matchUrl: blogId });
    } catch (error) {
        console.error('Error checking blog existence:', error);
        return null;
    }
};

const saveBlogDetailsData = async (blogDetails) => {
    const db = await connectDB();
    try {
        const collection = db.collection('blogDetails');
        await collection.updateOne(
            { matchUrl: blogDetails.matchUrl },
            {
                $set: blogDetails,
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );
    } catch (error) {
        console.error('Error saving blog details:', error);
        throw error;
    }
};

module.exports = {
    scrapeNewsBlogs,
    getNewsBlogsData,
    getBlogDetailsData
};