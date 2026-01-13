const logger = require('../utils/logger');
const { getAllHostServers } = require('../config/hostServers');

class WhitelistManager {
  constructor(pool) {
    this.pool = pool;
  }

  async isGuildWhitelisted(guildId) {
    try {
      logger.info('Checking guild whitelist', { guildId });
      
      const query = 'SELECT * FROM na_bot_whitelisted_guilds WHERE guild_id = ? AND is_active = 1';
      logger.info('Executing whitelist query', { query, params: [guildId] });
      
      const result = await this.pool.query(query, [guildId]);
      
      logger.info('Query raw result', { 
        guildId,
        resultType: Array.isArray(result) ? 'array' : typeof result,
        resultLength: Array.isArray(result) ? result.length : 'N/A',
        result: result
      });
      
      const rows = Array.isArray(result) ? result : [];
      const isWhitelisted = rows.length > 0;
      
      logger.info('Whitelist check result', { 
        guildId, 
        isWhitelisted,
        rowCount: rows.length 
      });
      
      return isWhitelisted;
    } catch (error) {
      logger.error('Error checking guild whitelist', {
        error: error.message,
        stack: error.stack,
        guildId
      });
      return false;
    }
  }

  async addGuild(guildId, guildName, addedBy) {
    try {
      await this.pool.query(
        `INSERT INTO na_bot_whitelisted_guilds 
         (guild_id, guild_name, added_by, added_at, is_active) 
         VALUES (?, ?, ?, NOW(), 1)
         ON DUPLICATE KEY UPDATE 
         guild_name = ?, is_active = 1`,
        [guildId, guildName, addedBy, guildName]
      );
      
      logger.info('Guild added to whitelist', { guildId, guildName, addedBy });
      return true;
    } catch (error) {
      logger.error('Error adding guild to whitelist', {
        error: error.message,
        guildId
      });
      return false;
    }
  }

  async removeGuild(guildId) {
    try {
      await this.pool.query(
        'UPDATE na_bot_whitelisted_guilds SET is_active = 0 WHERE guild_id = ?',
        [guildId]
      );
      
      logger.info('Guild removed from whitelist', { guildId });
      return true;
    } catch (error) {
      logger.error('Error removing guild from whitelist', {
        error: error.message,
        guildId
      });
      return false;
    }
  }

  async getAllWhitelistedGuilds() {
    try {
      const guilds = await this.pool.query(
        'SELECT * FROM na_bot_whitelisted_guilds WHERE is_active = 1'
      );
      return guilds;
    } catch (error) {
      logger.error('Error fetching whitelisted guilds', {
        error: error.message
      });
      return [];
    }
  }

  async isHostWhitelisted(serverName) {
    try {
      const result = await this.pool.query(
        'SELECT 1 FROM na_bot_whitelisted_hosts WHERE server_name = ? AND is_active = 1',
        [serverName]
      );
      return result.length > 0;
    } catch (error) {
      logger.error('Error checking host whitelist', {
        error: error.message,
        serverName
      });
      return getAllHostServers().includes(serverName);
    }
  }

  async getAllWhitelistedHosts() {
    try {
      const hosts = await this.pool.query(
        'SELECT server_name FROM na_bot_whitelisted_hosts WHERE is_active = 1'
      );
      return hosts.map(h => h.server_name);
    } catch (error) {
      logger.error('Error fetching whitelisted hosts', {
        error: error.message
      });
      return getAllHostServers();
    }
  }

  async initializeWhitelists() {
    try {
      const hostServers = getAllHostServers();
      
      for (const serverName of hostServers) {
        await this.pool.query(
          `INSERT INTO na_bot_whitelisted_hosts 
           (server_name, added_by, added_at, is_active)
           VALUES (?, 'system', NOW(), 1)
           ON DUPLICATE KEY UPDATE is_active = 1`,
          [serverName]
        );
      }
      
      logger.info('Initialized host whitelist', { count: hostServers.length });
      
    } catch (error) {
      logger.error('Error initializing whitelists', {
        error: error.message
      });
    }
  }
}

module.exports = WhitelistManager;
