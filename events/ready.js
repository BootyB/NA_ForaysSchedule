const logger = require('../utils/logger');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client, services) {
    // Service initialization is now handled in index.js before this event fires
    // This handler is kept for any additional ready-time logic if needed
    logger.debug('Ready event handler executed');
  }
};
