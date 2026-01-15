const logger = require('../utils/logger');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client, services) {
    logger.info(`Bot logged in as ${client.user.tag}`);
    logger.info(`Connected to ${client.guilds.cache.size} guilds`);

    if (services.updateManager) {
      await services.updateManager.initialize();
      logger.info('Update manager initialized');
    } else {
      logger.error('Update manager not initialized - services object missing updateManager');
    }

    if (services.whitelistManager) {
      await services.whitelistManager.initializeWhitelists();
      logger.info('Whitelists initialized');
    } else {
      logger.error('Whitelist manager not initialized - services object missing whitelistManager');
    }

    if (services.timerService) {
      services.timerService.start();
      logger.info('Timer service started successfully');
    } else {
      logger.error('Timer service not initialized - services object missing timerService');
    }

    logger.info('Bot is ready!');
  }
};
