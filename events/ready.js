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
    }

    if (services.whitelistManager) {
      await services.whitelistManager.initializeWhitelists();
      logger.info('Whitelists initialized');
    }

    if (services.timerService) {
      services.timerService.start();
      logger.info('Timer service started');
    }

    logger.info('Bot is ready!');
  }
};
