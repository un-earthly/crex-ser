const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 });

// Function to get data from cache
function getCache(key) {
    return cache.get(key);
}

// Function to set data in cache
function setCache(key, data) {
    cache.set(key, data);
}

// Middleware to handle cache
function cacheMiddleware(req, res, next) {
    const key = req.originalUrl || req.url;
    const cachedResponse = getCache(key);
    if (cachedResponse) {
        return res.json(cachedResponse);
    }
    res.sendResponse = res.json;
    res.json = (body) => {
        setCache(key, body);
        res.sendResponse(body);
    };
    next();
}

module.exports = {
    getCache,
    setCache,
    cacheMiddleware,
};
