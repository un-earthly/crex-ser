const { createDir } = require("./utility");
const path = require('path');
const fs = require('fs');


const logsDir = createDir()

const logMessage = (message, isError = false) => {
    const timestamp = new Date().toISOString();
    const logFile = path.join(logsDir, `nav-scraper-${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = `${timestamp} - ${message}\n`;

    fs.appendFileSync(logFile, logEntry);

    if (isError) {
        const errorFile = path.join(logsDir, `nav-errors-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(errorFile, logEntry);
    }
};

module.exports = logMessage