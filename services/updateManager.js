const ScheduleManager = require('./scheduleManager');
const ScheduleContainerBuilder = require('./containerBuilder');
const { AttachmentBuilder } = require('discord.js');
const EncryptedStateManager = require('./encryptedStateManager');
const logger = require('../utils/logger');
const encryptedDb = require('../config/encryptedDatabase');
const path = require('path');
const fs = require('fs');

class UpdateManager {
  constructor(pool, client) {
    this.pool = pool;
    this.client = client;
    this.scheduleManager = new ScheduleManager(pool);
    this.containerBuilder = new ScheduleContainerBuilder(client);
    this.stateManager = new EncryptedStateManager();
    this.state = {};
  }

  async initialize() {
    await this.stateManager.initialize();
    this.state = this.stateManager.state;
    
    await this.cleanupOldState();
    
    logger.info('Loaded encrypted schedule state', { stateKeys: Object.keys(this.state).length });
  }

  async cleanupOldState() {
    try {
      const activeGuilds = await encryptedDb.getActiveServerConfigs(
        'WHERE setup_complete = 1'
      );
      
      const activeGuildIds = new Set(activeGuilds.map(g => g.guild_id));
      await this.stateManager.cleanupOldState(activeGuildIds);
      this.state = this.stateManager.state;
    } catch (error) {
      logger.error('Error cleaning up state', { error: error.message });
    }
  }

  async saveState() {
    await this.stateManager.save();
  }

  getBannerAttachment(raidType) {
    try {
      const filename = `${raidType.toLowerCase()}_opening.avif`;
      const filepath = path.join(__dirname, '../assets', filename);
      if (!fs.existsSync(filepath)) {
        logger.debug('Banner file not found', { raidType, filepath });
        return null;
      }
      
      return new AttachmentBuilder(filepath, { name: filename });
    } catch (error) {
      logger.warn('Error creating banner attachment', { raidType, error: error.message });
      return null;
    }
  }

  async updateSchedule(guildId, raidType, config) {
    try {
      const stateKey = `${guildId}_${raidType}`;
      
      const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
      const enabledHosts = config[hostsKey];
      
      if (!enabledHosts) {
        logger.debug('No enabled hosts for raid type', { guildId, raidType });
        return;
      }
      if (!enabledHosts || enabledHosts.length === 0) {
        logger.debug('Empty enabled hosts array', { guildId, raidType });
        return;
      }

      const groupedRuns = await this.scheduleManager.fetchScheduleGroupedByServer(
        raidType,
        enabledHosts
      );

      const newHash = this.containerBuilder.generateContentHash(groupedRuns, raidType);

      const oldState = this.state[stateKey] || {};
      if (oldState.hash === newHash) {
        logger.debug('Schedule unchanged, skipping update', { guildId, raidType });
        return;
      }

      const colorKey = `schedule_color_${raidType.toLowerCase()}`;
      const colorValue = config[colorKey];
      const customColor = colorValue === -1 ? undefined : (colorValue !== undefined ? colorValue : undefined);

      const containers = await this.containerBuilder.buildScheduleContainers(groupedRuns, raidType, customColor);
      
      const overviewContainer = this.containerBuilder.buildOverviewContainer(raidType, customColor);

      const channelKey = `schedule_channel_${raidType.toLowerCase()}`;
      const channelId = config[channelKey];
      
      if (!channelId) {
        logger.warn('No channel configured', { guildId, raidType });
        return;
      }

      const channel = await this.client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        logger.warn('Channel not found', { guildId, raidType, channelId });
        return;
      }

      const messageKey = `schedule_message_${raidType.toLowerCase()}`;
      const overviewMessageKey = `schedule_overview_${raidType.toLowerCase()}`;
      const existingMessageIds = config[messageKey] || [];
      const existingOverviewId = config[overviewMessageKey];

      const needsRecreation = !existingOverviewId && existingMessageIds.length > 0;
      
      if (needsRecreation) {
        logger.info('Overview missing, recreating all messages in correct order', { guildId, raidType });
        
        for (const messageId of existingMessageIds) {
          try {
            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (message) {
              await message.delete();
            }
          } catch (error) {
            logger.error('Error deleting message during recreation', { error: error.message, messageId });
          }
        }
        
        existingMessageIds.length = 0;
      }

      let overviewMessageId = existingOverviewId;
      const bannerAttachment = this.getBannerAttachment(raidType);
      
      try {
        if (!existingOverviewId || needsRecreation) {
          const botMember = await channel.guild.members.fetchMe();
          const permissions = channel.permissionsFor(botMember);
          
          if (!permissions.has('ViewChannel') || !permissions.has('SendMessages')) {
            logger.error('Bot missing basic permissions in channel', {
              guildId,
              raidType,
              channelId: channel.id,
              hasViewChannel: permissions.has('ViewChannel'),
              hasSendMessages: permissions.has('SendMessages')
            });
            throw new Error('Bot missing ViewChannel or SendMessages permission');
          }
          
          if (bannerAttachment && !permissions.has('AttachFiles')) {
            logger.error('Bot missing AttachFiles permission needed for banner', {
              guildId,
              raidType,
              channelId: channel.id
            });
            throw new Error('Bot missing AttachFiles permission (required for banner image)');
          }
          
          const messageOptions = { 
            components: [overviewContainer.toJSON()], 
            flags: 1 << 15
          };
          if (bannerAttachment) {
            messageOptions.files = [bannerAttachment];
          }
          const newMessage = await channel.send(messageOptions);
          overviewMessageId = newMessage.id;
          logger.debug('Created new overview message', { guildId, raidType });
        } else {
          const existingMessage = await channel.messages.fetch(existingOverviewId).catch(() => null);
          if (existingMessage) {
            await existingMessage.edit({ components: [overviewContainer.toJSON()] });
            logger.debug('Updated existing overview message', { guildId, raidType, messageId: existingOverviewId });
          } else {
            logger.warn('Overview message not found, will recreate on next update', { guildId, raidType, messageId: existingOverviewId });
          }
        }
      } catch (error) {
        logger.error('Error updating overview message', {
          error: error.message,
          code: error.code,
          httpStatus: error.httpStatus,
          stack: error.stack,
          guildId,
          raidType
        });
      }

      const newMessageIds = [];

      for (let i = 0; i < containers.length; i++) {
        const container = containers[i];
        
        try {
          if (existingMessageIds[i]) {
            const message = await channel.messages.fetch(existingMessageIds[i]).catch(() => null);
            if (message) {
              if (message.author.id !== channel.client.user.id) {
                logger.warn('Schedule message not owned by bot, recreating', { 
                  guildId, 
                  raidType,
                  messageIndex: i,
                  messageAuthor: message.author.id,
                  botId: channel.client.user.id
                });
                const newMessage = await channel.send({ components: [container.toJSON()], flags: 1 << 15 });
                newMessageIds.push(newMessage.id);
              } else {
                await message.edit({ components: [container.toJSON()], flags: 1 << 15 });
                newMessageIds.push(message.id);
                logger.debug('Updated schedule message', { guildId, raidType, messageIndex: i });
              }
            } else {
              const newMessage = await channel.send({ components: [container.toJSON()], flags: 1 << 15 });
              newMessageIds.push(newMessage.id);
              logger.debug('Created new schedule message (old not found)', { guildId, raidType, messageIndex: i });
            }
          } else {
            const newMessage = await channel.send({ components: [container.toJSON()], flags: 1 << 15 });
            newMessageIds.push(newMessage.id);
            logger.debug('Created new schedule message', { guildId, raidType, messageIndex: i });
          }
        } catch (error) {
          logger.error('Error updating container message', {
            error: error.message,
            guildId,
            raidType,
            messageIndex: i
          });
        }
      }

      for (let i = containers.length; i < existingMessageIds.length; i++) {
        try {
          const message = await channel.messages.fetch(existingMessageIds[i]).catch(() => null);
          if (message) {
            await message.delete();
            logger.debug('Deleted extra schedule message', { guildId, raidType, messageIndex: i });
          }
        } catch (error) {
          logger.error('Error deleting extra message', { error: error.message });
        }
      }

      if (newMessageIds.length > 0 || overviewMessageId) {
        const updates = {};
        
        if (newMessageIds.length > 0) {
          updates[messageKey] = newMessageIds;
        }
        
        if (overviewMessageId) {
          updates[overviewMessageKey] = overviewMessageId;
        }
        
        await encryptedDb.updateServerConfig(guildId, updates);
      }

      this.state[stateKey] = {
        hash: newHash,
        lastUpdate: Date.now(),
        messageCount: newMessageIds.length
      };
      await this.saveState();

      logger.info('Schedule updated successfully', {
        guildId,
        raidType,
        containers: containers.length,
        runsCount: Object.values(groupedRuns).flat().length
      });

    } catch (error) {
      logger.error('Error in updateSchedule', {
        error: error.message,
        stack: error.stack,
        guildId,
        raidType
      });
    }
  }

  async updateAllSchedules() {
    try {
      const configs = await encryptedDb.getActiveServerConfigs(
        'WHERE setup_complete = 1 AND auto_update = 1'
      );

      logger.info('Starting update cycle', { configCount: configs.length });

      for (const config of configs) {
        for (const raidType of ['BA', 'DRS', 'FT']) {
          await this.updateSchedule(config.guild_id, raidType, config);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info('Update cycle complete');

    } catch (error) {
      logger.error('Error in updateAllSchedules', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  async forceUpdate(guildId) {
    try {
      const config = await encryptedDb.getServerConfig(guildId);

      if (!config) {
        logger.warn('No config found for force update', { guildId });
        return { success: false, error: 'Server not configured' };
      }

      for (const raidType of ['BA', 'DRS', 'FT']) {
        const stateKey = `${guildId}_${raidType}`;
        delete this.state[stateKey];
      }

      for (const raidType of ['BA', 'DRS', 'FT']) {
        await this.updateSchedule(config.guild_id, raidType, config);
      }

      return { success: true };

    } catch (error) {
      logger.error('Error in forceUpdate', {
        error: error.message,
        guildId
      });
      return { success: false, error: error.message };
    }
  }

  async regenerateSchedule(guildId, raidType) {
    try {
      const config = await encryptedDb.getServerConfig(guildId);

      if (!config) {
        logger.warn('No config found for regeneration', { guildId });
        return { success: false, error: 'Server not configured' };
      }

      const channelKey = `schedule_channel_${raidType.toLowerCase()}`;
      const channelId = config[channelKey];
      
      if (!channelId) {
        return { success: false, error: 'No channel configured' };
      }

      const channel = await this.client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        return { success: false, error: 'Channel not found' };
      }

      const overviewMessageKey = `schedule_overview_${raidType.toLowerCase()}`;
      const existingOverviewId = config[overviewMessageKey];
      
      if (existingOverviewId) {
        try {
          const message = await channel.messages.fetch(existingOverviewId).catch(() => null);
          if (message) {
            await message.delete();
            logger.debug('Deleted overview message', { guildId, raidType });
          }
        } catch (error) {
          logger.error('Error deleting overview message', { error: error.message });
        }
      }

      const messageKey = `schedule_message_${raidType.toLowerCase()}`;
      const existingMessageIds = config[messageKey] || [];
      
      for (const messageId of existingMessageIds) {
        try {
          const message = await channel.messages.fetch(messageId).catch(() => null);
          if (message) {
            await message.delete();
            logger.debug('Deleted schedule message', { guildId, raidType, messageId });
          }
        } catch (error) {
          logger.error('Error deleting schedule message', { error: error.message, messageId });
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await encryptedDb.updateServerConfig(guildId, {
        [messageKey]: null,
        [overviewMessageKey]: null
      });

      const stateKey = `${guildId}_${raidType}`;
      delete this.state[stateKey];
      await this.saveState();

      await this.updateSchedule(guildId, raidType, {
        ...config,
        [messageKey]: null,
        [overviewMessageKey]: null
      });

      return { success: true };

    } catch (error) {
      logger.error('Error in regenerateSchedule', {
        error: error.message,
        stack: error.stack,
        guildId,
        raidType
      });
      return { success: false, error: error.message };
    }
  }
}

module.exports = UpdateManager;
