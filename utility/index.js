const browser = require('./browser');
const page = require('./page');
const scraper = require('./scraper');
const cache = require('./cache');
const fs = require('fs');
const path = require('path');
const { cwd } = require('process');

function createNavDataHash(navData) {
    const str = JSON.stringify(sortObject(navData));
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

function sortObject(obj) {
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObject);

    return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
            sorted[key] = sortObject(obj[key]);
            return sorted;
        }, {});
}

const createDir = () => {
    const logsDir = path.join(cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
    }

    return logsDir
}
module.exports = {
    ...browser,
    ...page,
    ...scraper,
    ...cache,
    createNavDataHash,
    sortObject,
    createDir
};