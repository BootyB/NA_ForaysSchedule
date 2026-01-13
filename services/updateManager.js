const ScheduleManager = require('./scheduleManager');
const ScheduleContainerBuilder = require('./containerBuilder');
const { AttachmentBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class UpdateManager {
  constructor(pool, client) {
    this.pool = pool;
    this.client = client;
    this.scheduleManager = new ScheduleManager(pool);
    this.containerBuilder = new ScheduleContainerBuilder(client);
    this.stateFile = path.join(__dirname, '../data/scheduleState.json');
    this.state = {};
  }

  async initialize() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      this.state = JSON.parse(data);
      
      // Clean up old state entries
      await this.cleanupOldState();
      
      logger.info('Loaded schedule state', { stateKeys: Object.keys(this.state).length });
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No existing state file, starting fresh');
        this.state = {};
      } else {
        logger.error('Error loading state file', { error: error.message });
        this.state = {};
      }
    }
  }

  async cleanupOldState() {
    try {
      const activeGuilds = await this.pool.query(
        'SELECT guild_id FROM na_bot_server_configs WHERE setup_complete = 1'
      );
      
      const activeGuildIds = new Set(activeGuilds.map(g => g.guild_id));
      const stateKeys = Object.keys(this.state);
      let removedCount = 0;
      
      for (const key of stateKeys) {
        const guildId = key.split('_')[0];
        if (!activeGuildIds.has(guildId)) {
          delete this.state[key];
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        logger.info('Cleaned up old state entries', { removed: removedCount });
        await this.saveState();
      }
    } catch (error) {
      logger.error('Error cleaning up state', { error: error.message });
    }
  }

  async saveState() {
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      logger.error('Error saving state file', { error: error.message });
    }
  }

  getBannerAttachment(raidType) {
    // Only BA and DRS have banners currently
    if (raidType !== 'BA' && raidType !== 'DRS') {
      return null;
    }
    
    try {
      const filename = `${raidType.toLowerCase()}_opening.avif`;
      const filepath = path.join(__dirname, '../assets', filename);
      const fsSync = require('fs');
      if (!fsSync.existsSync(filepath)) {
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
      const enabledHostsJson = config[hostsKey];
      
      if (!enabledHostsJson) {
        logger.debug('No enabled hosts for raid type', { guildId, raidType });
        return;
      }

      const enabledHosts = JSON.parse(enabledHostsJson);
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
      const customColor = config[colorKey] || null;

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
      const existingMessageIds = config[messageKey] ? JSON.parse(config[messageKey]) : [];
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
          logger.debug('Keeping existing overview message', { guildId, raidType, messageId: existingOverviewId });
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
              // Check if the message is owned by this bot
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
        const updates = [];
        const params = [];
        
        if (newMessageIds.length > 0) {
          updates.push(`${messageKey} = ?`);
          params.push(JSON.stringify(newMessageIds));
        }
        
        if (overviewMessageId) {
          updates.push(`${overviewMessageKey} = ?`);
          params.push(overviewMessageId);
        }
        
        params.push(guildId);
        
        await this.pool.query(
          `UPDATE na_bot_server_configs 
           SET ${updates.join(', ')} 
           WHERE guild_id = ?`,
          params
        );
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
      const configs = await this.pool.query(
        `SELECT * FROM na_bot_server_configs 
         WHERE setup_complete = 1 AND auto_update = 1`
      );

      logger.info('Starting update cycle', { configCount: configs.length });

      for (const config of configs) {
        for (const raidType of ['BA', 'FT', 'DRS']) {
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
      const configs = await this.pool.query(
        'SELECT * FROM na_bot_server_configs WHERE guild_id = ?',
        [guildId]
      );

      if (configs.length === 0) {
        logger.warn('No config found for force update', { guildId });
        return { success: false, error: 'Server not configured' };
      }

      const config = configs[0];

      for (const raidType of ['BA', 'FT', 'DRS']) {
        const stateKey = `${guildId}_${raidType}`;
        delete this.state[stateKey];
      }

      for (const raidType of ['BA', 'FT', 'DRS']) {
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
      const configs = await this.pool.query(
        'SELECT * FROM na_bot_server_configs WHERE guild_id = ?',
        [guildId]
      );

      if (configs.length === 0) {
        logger.warn('No config found for regeneration', { guildId });
        return { success: false, error: 'Server not configured' };
      }

      const config = configs[0];

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
      const existingMessageIds = config[messageKey] ? JSON.parse(config[messageKey]) : [];
      
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

      await this.pool.query(
        `UPDATE na_bot_server_configs 
         SET ${messageKey} = NULL, ${overviewMessageKey} = NULL 
         WHERE guild_id = ?`,
        [guildId]
      );

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
