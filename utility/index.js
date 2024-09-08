const browser = require('./browser');
const page = require('./page');
const scraper = require('./scraper');
const cache = require('./cache');

module.exports = {
    ...browser,
    ...page,
    ...scraper,
    ...cache
};