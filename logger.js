const fs = require('fs').promises;
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        this.date = new Date().toISOString().split('T')[0];
        this.successLogFile = path.join(this.logDir, `success_${this.date}.log`);
        this.errorLogFile = path.join(this.logDir, `error_${this.date}.log`);
        this.generalLogFile = path.join(this.logDir, `general_${this.date}.log`);
        this.initialized = false;
    }

    async initialize() {
        if (!this.initialized) {
            try {
                await fs.mkdir(this.logDir, { recursive: true });
                await this.log('Logger initialized');
                this.initialized = true;
            } catch (error) {
                console.error('Error creating log directory:', error);
            }
        }
    }

    formatMessage(message) {
        return `[${new Date().toISOString()}] ${message}`;
    }

    async appendToFile(file, message) {
        const formattedMessage = this.formatMessage(message);
        await fs.appendFile(file, formattedMessage + '\n');
        console.log(message); // Also output to console
    }

    async log(message) {
        try {
            await this.initialize();
            await this.appendToFile(this.generalLogFile, message);
        } catch (error) {
            console.error('Error writing to general log:', error);
        }
    }

    async logSuccess(message) {
        try {
            await this.initialize();
            await this.appendToFile(this.successLogFile, `✓ ${message}`);
        } catch (error) {
            console.error('Error writing to success log:', error);
        }
    }

    async logError(error, context) {
        try {
            await this.initialize();
            const errorMessage = `
ERROR in ${context}
Message: ${error.message}
Stack: ${error.stack}
----------------------------------------`;
            await this.appendToFile(this.errorLogFile, errorMessage);
        } catch (err) {
            console.error('Error writing to error log:', err);
        }
    }

    async logSection(title) {
        const separator = '-'.repeat(50);
        const message = `\n${separator}\n${title}\n${separator}`;
        await this.log(message);
    }

    async logSummary(successCount, failureCount, failedItems) {
        const summary = `
SUMMARY
-------
Total Successful: ${successCount}
Total Failed: ${failureCount}
${failedItems.length > 0 ? '\nFailed Items:\n' + failedItems.map(item => `- ${item}`).join('\n') : ''}
`;
        await this.log(summary);

        if (failedItems.length > 0) {
            await this.appendToFile(this.errorLogFile, `FAILED ITEMS SUMMARY:\n${failedItems.join('\n')}`);
        }
    }
}

// Create and export a single instance
const logger = new Logger();
module.exports = logger;