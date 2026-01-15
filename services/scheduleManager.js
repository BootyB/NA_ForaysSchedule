const { DateTime } = require('luxon');
const { SCHEDULE_DAYS_AHEAD, RUN_TYPE_PRIORITY } = require('../config/constants');
const { isWhitelistedHost } = require('../config/hostServers');
const logger = require('../utils/logger');

class ScheduleManager {
  constructor(pool) {
    this.pool = pool;
  }

  async fetchScheduleGroupedByServer(raidType, enabledHosts = [], daysAhead = SCHEDULE_DAYS_AHEAD) {
    try {
      if (!['BA', 'FT', 'DRS'].includes(raidType)) {
        throw new Error(`Invalid raid type: ${raidType}`);
      }

      if (!enabledHosts || enabledHosts.length === 0) {
        logger.warn('No enabled hosts provided for schedule fetch', { raidType });
        return {};
      }

      const currentTime = Date.now();
      const futureTime = currentTime + (daysAhead * 24 * 60 * 60 * 1000);

      const sourceDbName = process.env.DB_SOURCE_NAME || process.env.DB_NAME;
      const tableName = process.env.DB_TABLE_NAME;
      
      logger.debug('Database configuration', {
        sourceDbName, 
        tableName,
        DB_SOURCE_NAME: process.env.DB_SOURCE_NAME,
        DB_NAME: process.env.DB_NAME
      });
      
      if (!sourceDbName || !tableName) {
        throw new Error('DB_SOURCE_NAME (or DB_NAME) and DB_TABLE_NAME must be set in environment variables');
      }
      
      // Validate identifiers to prevent SQL injection
      const identifierRegex = /^[a-zA-Z0-9_]+$/;
      if (!identifierRegex.test(sourceDbName) || !identifierRegex.test(tableName)) {
        throw new Error('Invalid database or table name format');
      }
      
      let query = `
        SELECT 
          ID,
          Type,
          Start,
          ServerNameTag,
          ServerID,
          RunDC,
          ServerName,
          referenceLink,
          SourceMessageID,
          EventID
        FROM \`${sourceDbName}\`.\`${tableName}\`
        WHERE Start > ?
          AND Start < ?
          AND isCancelled = 0
      `;

      const params = [currentTime, futureTime];

      if (raidType === 'BA') {
        query += ' AND DRS = 0 AND FT = 0';
      } else if (raidType === 'FT') {
        query += ' AND FT = 1';
      } else if (raidType === 'DRS') {
        query += ' AND DRS = 1';
      }

      query += ' AND ServerName IN (?)';
      params.push(enabledHosts);

      query += ' ORDER BY ServerName, Start ASC';

      const runs = await this.pool.query(query, params);

      const groupedRuns = {};
      for (const run of runs) {
        if (!groupedRuns[run.ServerName]) {
          groupedRuns[run.ServerName] = [];
        }
        groupedRuns[run.ServerName].push(run);
      }

      logger.debug('Fetched schedule', {
        raidType,
        enabledHosts: enabledHosts.length,
        totalRuns: runs.length,
        servers: Object.keys(groupedRuns).length
      });

      return groupedRuns;

    } catch (error) {
      logger.error('Error fetching schedule', {
        error: error.message,
        raidType,
        enabledHosts
      });
      throw error;
    }
  }

  async fetchScheduleGroupedByType(raidType, enabledHosts = [], daysAhead = SCHEDULE_DAYS_AHEAD) {
    try {
      const groupedByServer = await this.fetchScheduleGroupedByServer(raidType, enabledHosts, daysAhead);
      
      const groupedByType = {};
      
      for (const serverName in groupedByServer) {
        for (const run of groupedByServer[serverName]) {
          const runType = run.Type || 'Unknown';
          if (!groupedByType[runType]) {
            groupedByType[runType] = [];
          }
          groupedByType[runType].push(run);
        }
      }

      for (const runType in groupedByType) {
        groupedByType[runType].sort((a, b) => a.Start - b.Start);
      }

      return groupedByType;

    } catch (error) {
      logger.error('Error fetching schedule grouped by type', {
        error: error.message,
        raidType
      });
      throw error;
    }
  }

  sortRunTypes(groupedRuns, raidType) {
    const priority = RUN_TYPE_PRIORITY[raidType] || [];
    const runTypes = Object.keys(groupedRuns);
    
    return runTypes.sort((a, b) => {
      const indexA = priority.indexOf(a);
      const indexB = priority.indexOf(b);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      if (indexA !== -1) return -1;
      
      if (indexB !== -1) return 1;
      
      return a.localeCompare(b);
    });
  }

  formatRunTime(startTime) {
    const timestamp = Math.round(startTime / 1000);
    return `<t:${timestamp}:F>`;
  }

  getRelativeTime(startTime) {
    const timestamp = Math.round(startTime / 1000);
    return `<t:${timestamp}:R>`;
  }

  async hasUpcomingRuns(raidType, enabledHosts) {
    try {
      const runs = await this.fetchScheduleGroupedByServer(raidType, enabledHosts);
      return Object.keys(runs).length > 0;
    } catch (error) {
      logger.error('Error checking for upcoming runs', {
        error: error.message,
        raidType
      });
      return false;
    }
  }
}

module.exports = ScheduleManager;
