const logger = require('../utils/logger');

module.exports = {
  name: 'guildCreate',
  async execute(guild, services) {
    logger.info('Bot added to new guild', {
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount
    });

    const { whitelistManager } = services;

    const isWhitelisted = await whitelistManager.isGuildWhitelisted(guild.id);

    if (!isWhitelisted) {
      logger.warn('Non-whitelisted guild detected', {
        guildId: guild.id,
        guildName: guild.name
      });

      try {
        const owner = await guild.fetchOwner();
        
        const message = 
          `👋 Hello! Thank you for adding the NA Forays Schedule Bot.\n\n` +
          `⚠️ **This bot is currently in private beta.**\n\n` +
          `To use this bot, please contact the bot owner, <@${process.env.BOT_OWNER_ID}>, to request access. ` +
          `Once your server is whitelisted, you can run \`/na-schedule\` to configure schedule displays.\n\n` +
          `For now, the bot will remain in your server but will not function until whitelisted.`;

        await owner.send(message).catch(() => {
          if (guild.systemChannel) {
            guild.systemChannel.send(message).catch(() => {
              logger.warn('Could not send whitelist message', { guildId: guild.id });
            });
          }
        });

      } catch (error) {
        logger.error('Error sending whitelist notification', {
          error: error.message,
          guildId: guild.id
        });
      }


      return;
    }

    try {
      const owner = await guild.fetchOwner();
      
      const welcomeMessage = 
        `👋 Welcome to **NA Forays Schedule**!\n\n` +
        `This bot displays FFXIV NA datacenter raid schedules from multiple host servers.\n\n` +
        `**To get started:**\n` +
        `1. Run \`/na-schedule\` in your server\n` +
        `2. Choose which raid types to display (BA/FT/DRS)\n` +
        `3. Select channels for each raid type\n` +
        `4. Choose which host servers to include\n\n` +
        `Schedules will automatically update every 60 seconds.\n\n`;

      await owner.send(welcomeMessage).catch(() => {
        if (guild.systemChannel) {
          guild.systemChannel.send(welcomeMessage).catch(() => {
            logger.warn('Could not send welcome message', { guildId: guild.id });
          });
        }
      });

    } catch (error) {
      logger.error('Error sending welcome message', {
        error: error.message,
        guildId: guild.id
      });
    }
  }
};
