const pool = require('./database');
const { encrypt, decrypt, encryptJSON, decryptJSON, DEV_SERVER_ID } = require('../utils/encryption');

function encryptField(value, isDevServer) {
  if (!value) return null;
  if (isDevServer) return `DEV:${value}`;
  return encrypt(value);
}

function encryptJSONField(value, isDevServer) {
  if (!value) return null;
  if (isDevServer) return `DEV:${JSON.stringify(value)}`;
  return encryptJSON(value);
}

function decryptField(value) {
  if (!value) return null;
  if (value.startsWith('DEV:')) return value.substring(4);
  return decrypt(value);
}

function decryptJSONField(value) {
  if (!value) return null;
  if (value.startsWith('DEV:')) return JSON.parse(value.substring(4));
  return decryptJSON(value);
}

function encryptConfigFields(guildId, config) {
  const isDevServer = guildId === DEV_SERVER_ID;
  
  return {
    guild_id: guildId,
    guild_name: config.guild_name ? encryptField(config.guild_name, isDevServer) : null,
    setup_complete: config.setup_complete,
    auto_update: config.auto_update,
    
    schedule_channel_ba: config.schedule_channel_ba ? encryptField(config.schedule_channel_ba, isDevServer) : null,
    schedule_channel_ft: config.schedule_channel_ft ? encryptField(config.schedule_channel_ft, isDevServer) : null,
    schedule_channel_drs: config.schedule_channel_drs ? encryptField(config.schedule_channel_drs, isDevServer) : null,
    
    schedule_overview_ba: config.schedule_overview_ba ? encryptField(config.schedule_overview_ba, isDevServer) : null,
    schedule_overview_ft: config.schedule_overview_ft ? encryptField(config.schedule_overview_ft, isDevServer) : null,
    schedule_overview_drs: config.schedule_overview_drs ? encryptField(config.schedule_overview_drs, isDevServer) : null,
    
    enabled_hosts_ba: config.enabled_hosts_ba ? encryptJSONField(config.enabled_hosts_ba, isDevServer) : null,
    enabled_hosts_ft: config.enabled_hosts_ft ? encryptJSONField(config.enabled_hosts_ft, isDevServer) : null,
    enabled_hosts_drs: config.enabled_hosts_drs ? encryptJSONField(config.enabled_hosts_drs, isDevServer) : null,
    
    schedule_message_ba: config.schedule_message_ba ? encryptJSONField(config.schedule_message_ba, isDevServer) : null,
    schedule_message_ft: config.schedule_message_ft ? encryptJSONField(config.schedule_message_ft, isDevServer) : null,
    schedule_message_drs: config.schedule_message_drs ? encryptJSONField(config.schedule_message_drs, isDevServer) : null,
    
    schedule_color_ba: config.schedule_color_ba,
    schedule_color_ft: config.schedule_color_ft,
    schedule_color_drs: config.schedule_color_drs
  };
}

function decryptConfigFields(encryptedConfig) {
  if (!encryptedConfig) return null;
  
  return {
    guild_id: encryptedConfig.guild_id,
    guild_name: encryptedConfig.guild_name ? decryptField(encryptedConfig.guild_name) : null,
    setup_complete: encryptedConfig.setup_complete,
    auto_update: encryptedConfig.auto_update,
    
    schedule_channel_ba: encryptedConfig.schedule_channel_ba ? decryptField(encryptedConfig.schedule_channel_ba) : null,
    schedule_channel_ft: encryptedConfig.schedule_channel_ft ? decryptField(encryptedConfig.schedule_channel_ft) : null,
    schedule_channel_drs: encryptedConfig.schedule_channel_drs ? decryptField(encryptedConfig.schedule_channel_drs) : null,
    
    schedule_overview_ba: encryptedConfig.schedule_overview_ba ? decryptField(encryptedConfig.schedule_overview_ba) : null,
    schedule_overview_ft: encryptedConfig.schedule_overview_ft ? decryptField(encryptedConfig.schedule_overview_ft) : null,
    schedule_overview_drs: encryptedConfig.schedule_overview_drs ? decryptField(encryptedConfig.schedule_overview_drs) : null,
    
    enabled_hosts_ba: encryptedConfig.enabled_hosts_ba ? (decryptJSONField(encryptedConfig.enabled_hosts_ba) || []) : null,
    enabled_hosts_ft: encryptedConfig.enabled_hosts_ft ? (decryptJSONField(encryptedConfig.enabled_hosts_ft) || []) : null,
    enabled_hosts_drs: encryptedConfig.enabled_hosts_drs ? (decryptJSONField(encryptedConfig.enabled_hosts_drs) || []) : null,
    
    schedule_message_ba: encryptedConfig.schedule_message_ba ? (decryptJSONField(encryptedConfig.schedule_message_ba) || []) : null,
    schedule_message_ft: encryptedConfig.schedule_message_ft ? (decryptJSONField(encryptedConfig.schedule_message_ft) || []) : null,
    schedule_message_drs: encryptedConfig.schedule_message_drs ? (decryptJSONField(encryptedConfig.schedule_message_drs) || []) : null,
    
    schedule_color_ba: encryptedConfig.schedule_color_ba,
    schedule_color_ft: encryptedConfig.schedule_color_ft,
    schedule_color_drs: encryptedConfig.schedule_color_drs,
    
    created_at: encryptedConfig.created_at,
    updated_at: encryptedConfig.updated_at
  };
}

async function getServerConfig(guildId) {
  const configs = await pool.query('SELECT * FROM na_bot_server_configs WHERE guild_id = ?', [guildId]);
  
  if (configs.length === 0) {
    return null;
  }
  
  return decryptConfigFields(configs[0]);
}

async function getActiveServerConfigs(whereClause = '', params = []) {
  const query = `SELECT * FROM na_bot_server_configs ${whereClause}`;
  const encryptedConfigs = await pool.query(query, params);
  
  return encryptedConfigs.map(config => decryptConfigFields(config));
}

async function upsertServerConfig(guildId, config) {
  const encrypted = encryptConfigFields(guildId, config);
  
  await pool.query(
    `INSERT INTO na_bot_server_configs 
     (guild_id, guild_name, setup_complete, auto_update,
      schedule_channel_ba, schedule_channel_ft, schedule_channel_drs,
      schedule_overview_ba, schedule_overview_ft, schedule_overview_drs,
      enabled_hosts_ba, enabled_hosts_ft, enabled_hosts_drs,
      schedule_message_ba, schedule_message_ft, schedule_message_drs,
      schedule_color_ba, schedule_color_ft, schedule_color_drs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       guild_name = VALUES(guild_name),
       setup_complete = VALUES(setup_complete),
       auto_update = VALUES(auto_update),
       schedule_channel_ba = VALUES(schedule_channel_ba),
       schedule_channel_ft = VALUES(schedule_channel_ft),
       schedule_channel_drs = VALUES(schedule_channel_drs),
       schedule_overview_ba = VALUES(schedule_overview_ba),
       schedule_overview_ft = VALUES(schedule_overview_ft),
       schedule_overview_drs = VALUES(schedule_overview_drs),
       enabled_hosts_ba = VALUES(enabled_hosts_ba),
       enabled_hosts_ft = VALUES(enabled_hosts_ft),
       enabled_hosts_drs = VALUES(enabled_hosts_drs),
       schedule_message_ba = VALUES(schedule_message_ba),
       schedule_message_ft = VALUES(schedule_message_ft),
       schedule_message_drs = VALUES(schedule_message_drs),
       schedule_color_ba = VALUES(schedule_color_ba),
       schedule_color_ft = VALUES(schedule_color_ft),
       schedule_color_drs = VALUES(schedule_color_drs)`,
    [
      encrypted.guild_id,
      encrypted.guild_name,
      encrypted.setup_complete,
      encrypted.auto_update,
      encrypted.schedule_channel_ba,
      encrypted.schedule_channel_ft,
      encrypted.schedule_channel_drs,
      encrypted.schedule_overview_ba,
      encrypted.schedule_overview_ft,
      encrypted.schedule_overview_drs,
      encrypted.enabled_hosts_ba,
      encrypted.enabled_hosts_ft,
      encrypted.enabled_hosts_drs,
      encrypted.schedule_message_ba,
      encrypted.schedule_message_ft,
      encrypted.schedule_message_drs,
      encrypted.schedule_color_ba,
      encrypted.schedule_color_ft,
      encrypted.schedule_color_drs
    ]
  );
}

async function updateServerConfig(guildId, updates) {
  const exists = await pool.query('SELECT 1 FROM na_bot_server_configs WHERE guild_id = ?', [guildId]);
  
  if (exists.length === 0) {
    throw new Error(`Server config not found for guild: ${guildId}`);
  }
  
  const isDevServer = guildId === DEV_SERVER_ID;
  
  const encryptedUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) {
      encryptedUpdates[key] = null;
      continue;
    }
    
    if (key === 'guild_name') {
      encryptedUpdates[key] = encryptField(value, isDevServer);
    } else if (key.includes('channel') || key.includes('overview')) {
      encryptedUpdates[key] = encryptField(value, isDevServer);
    } else if (key.includes('enabled_hosts') || key.includes('schedule_message')) {
      encryptedUpdates[key] = encryptJSONField(value, isDevServer);
    } else {
      encryptedUpdates[key] = value;
    }
  }
  
  const setClauses = Object.keys(encryptedUpdates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(encryptedUpdates);
  
  await pool.query(
    `UPDATE na_bot_server_configs SET ${setClauses} WHERE guild_id = ?`,
    [...values, guildId]
  );
}

async function deleteServerConfig(guildId) {
  await pool.query('DELETE FROM na_bot_server_configs WHERE guild_id = ?', [guildId]);
}

async function getWhitelistedGuild(guildId) {
  const allGuilds = await pool.query(
    'SELECT * FROM na_bot_whitelisted_guilds WHERE is_active = 1'
  );
  
  for (const guild of allGuilds) {
    try {
      const decryptedId = decryptField(guild.guild_id);
      if (decryptedId === guildId) {
        return {
          guild_id: decryptedId,
          guild_name: guild.guild_name ? decryptField(guild.guild_name) : null,
          added_by: guild.added_by ? decryptField(guild.added_by) : null,
          added_at: guild.added_at,
          is_active: guild.is_active,
          notes: guild.notes
        };
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

async function removeWhitelistedGuild(guildId) {
  const allGuilds = await pool.query('SELECT guild_id FROM na_bot_whitelisted_guilds WHERE is_active = 1');
  
  for (const guild of allGuilds) {
    try {
      const decryptedId = decryptField(guild.guild_id);
      if (decryptedId === guildId) {
        await pool.query(
          'UPDATE na_bot_whitelisted_guilds SET is_active = 0 WHERE guild_id = ?',
          [guild.guild_id]
        );
        return;
      }
    } catch (error) {
      continue;
    }
  }
}

async function getAllWhitelistedGuilds() {
  const encryptedGuilds = await pool.query(
    'SELECT * FROM na_bot_whitelisted_guilds WHERE is_active = 1'
  );
  
  return encryptedGuilds.map(guild => ({
    guild_id: decryptField(guild.guild_id),
    guild_name: guild.guild_name ? decryptField(guild.guild_name) : null,
    added_by: guild.added_by ? decryptField(guild.added_by) : null,
    added_at: guild.added_at,
    is_active: guild.is_active,
    notes: guild.notes
  }));
}

async function addWhitelistedGuild(guildId, guildName, addedBy, notes = null) {
  const isDevServer = guildId === DEV_SERVER_ID;
  await pool.query(
    'INSERT INTO na_bot_whitelisted_guilds (guild_id, guild_name, added_by, notes) VALUES (?, ?, ?, ?)',
    [encryptField(guildId, isDevServer), encryptField(guildName, isDevServer), encryptField(addedBy, isDevServer), notes]
  );
}

module.exports = {
  getServerConfig,
  getActiveServerConfigs,
  upsertServerConfig,
  updateServerConfig,
  deleteServerConfig,
  
  getWhitelistedGuild,
  addWhitelistedGuild,
  removeWhitelistedGuild,
  getAllWhitelistedGuilds,
  
  encryptConfigFields,
  decryptConfigFields
};
