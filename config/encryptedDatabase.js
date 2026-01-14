const pool = require('./database');
const { encrypt, decrypt, encryptJSON, decryptJSON } = require('../utils/encryption');

function encryptConfigFields(guildId, config) {
  return {
    guild_id: encrypt(guildId),
    guild_name: config.guild_name ? encrypt(config.guild_name) : null,
    setup_complete: config.setup_complete,
    auto_update: config.auto_update,
    
    schedule_channel_ba: config.schedule_channel_ba ? encrypt(config.schedule_channel_ba) : null,
    schedule_channel_ft: config.schedule_channel_ft ? encrypt(config.schedule_channel_ft) : null,
    schedule_channel_drs: config.schedule_channel_drs ? encrypt(config.schedule_channel_drs) : null,
    
    schedule_overview_ba: config.schedule_overview_ba ? encrypt(config.schedule_overview_ba) : null,
    schedule_overview_ft: config.schedule_overview_ft ? encrypt(config.schedule_overview_ft) : null,
    schedule_overview_drs: config.schedule_overview_drs ? encrypt(config.schedule_overview_drs) : null,
    
    enabled_hosts_ba: config.enabled_hosts_ba ? encryptJSON(config.enabled_hosts_ba) : null,
    enabled_hosts_ft: config.enabled_hosts_ft ? encryptJSON(config.enabled_hosts_ft) : null,
    enabled_hosts_drs: config.enabled_hosts_drs ? encryptJSON(config.enabled_hosts_drs) : null,
    
    schedule_message_ba: config.schedule_message_ba ? encryptJSON(config.schedule_message_ba) : null,
    schedule_message_ft: config.schedule_message_ft ? encryptJSON(config.schedule_message_ft) : null,
    schedule_message_drs: config.schedule_message_drs ? encryptJSON(config.schedule_message_drs) : null,
    
    schedule_color_ba: config.schedule_color_ba,
    schedule_color_ft: config.schedule_color_ft,
    schedule_color_drs: config.schedule_color_drs
  };
}

function decryptConfigFields(encryptedConfig) {
  if (!encryptedConfig) return null;
  
  return {
    guild_id: decrypt(encryptedConfig.guild_id),
    guild_name: encryptedConfig.guild_name ? decrypt(encryptedConfig.guild_name) : null,
    setup_complete: encryptedConfig.setup_complete,
    auto_update: encryptedConfig.auto_update,
    
    schedule_channel_ba: encryptedConfig.schedule_channel_ba ? decrypt(encryptedConfig.schedule_channel_ba) : null,
    schedule_channel_ft: encryptedConfig.schedule_channel_ft ? decrypt(encryptedConfig.schedule_channel_ft) : null,
    schedule_channel_drs: encryptedConfig.schedule_channel_drs ? decrypt(encryptedConfig.schedule_channel_drs) : null,
    
    schedule_overview_ba: encryptedConfig.schedule_overview_ba ? decrypt(encryptedConfig.schedule_overview_ba) : null,
    schedule_overview_ft: encryptedConfig.schedule_overview_ft ? decrypt(encryptedConfig.schedule_overview_ft) : null,
    schedule_overview_drs: encryptedConfig.schedule_overview_drs ? decrypt(encryptedConfig.schedule_overview_drs) : null,
    
    enabled_hosts_ba: encryptedConfig.enabled_hosts_ba ? decryptJSON(encryptedConfig.enabled_hosts_ba) : null,
    enabled_hosts_ft: encryptedConfig.enabled_hosts_ft ? decryptJSON(encryptedConfig.enabled_hosts_ft) : null,
    enabled_hosts_drs: encryptedConfig.enabled_hosts_drs ? decryptJSON(encryptedConfig.enabled_hosts_drs) : null,
    
    schedule_message_ba: encryptedConfig.schedule_message_ba ? decryptJSON(encryptedConfig.schedule_message_ba) : null,
    schedule_message_ft: encryptedConfig.schedule_message_ft ? decryptJSON(encryptedConfig.schedule_message_ft) : null,
    schedule_message_drs: encryptedConfig.schedule_message_drs ? decryptJSON(encryptedConfig.schedule_message_drs) : null,
    
    schedule_color_ba: encryptedConfig.schedule_color_ba,
    schedule_color_ft: encryptedConfig.schedule_color_ft,
    schedule_color_drs: encryptedConfig.schedule_color_drs,
    
    created_at: encryptedConfig.created_at,
    updated_at: encryptedConfig.updated_at
  };
}

async function getServerConfig(guildId) {
  const allConfigs = await pool.query('SELECT * FROM na_bot_server_configs');
  
  for (const config of allConfigs) {
    try {
      const decryptedId = decrypt(config.guild_id);
      if (decryptedId === guildId) {
        return decryptConfigFields(config);
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
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
  const allConfigs = await pool.query('SELECT guild_id FROM na_bot_server_configs');
  
  let encryptedGuildIdInDb = null;
  for (const config of allConfigs) {
    try {
      const decryptedId = decrypt(config.guild_id);
      if (decryptedId === guildId) {
        encryptedGuildIdInDb = config.guild_id;
        break;
      }
    } catch (error) {
      continue;
    }
  }
  
  if (!encryptedGuildIdInDb) {
    throw new Error(`Server config not found for guild: ${guildId}`);
  }
  
  const encryptedUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) {
      encryptedUpdates[key] = null;
      continue;
    }
    
    if (key === 'guild_name') {
      encryptedUpdates[key] = encrypt(value);
    } else if (key.includes('channel') || key.includes('overview')) {
      encryptedUpdates[key] = encrypt(value);
    } else if (key.includes('enabled_hosts') || key.includes('schedule_message')) {
      encryptedUpdates[key] = encryptJSON(value);
    } else {
      encryptedUpdates[key] = value;
    }
  }
  
  const setClauses = Object.keys(encryptedUpdates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(encryptedUpdates);
  
  await pool.query(
    `UPDATE na_bot_server_configs SET ${setClauses} WHERE guild_id = ?`,
    [...values, encryptedGuildIdInDb]
  );
}

async function deleteServerConfig(guildId) {
  const allConfigs = await pool.query('SELECT guild_id FROM na_bot_server_configs');
  
  for (const config of allConfigs) {
    try {
      const decryptedId = decrypt(config.guild_id);
      if (decryptedId === guildId) {
        await pool.query(
          'DELETE FROM na_bot_server_configs WHERE guild_id = ?',
          [config.guild_id]
        );
        return;
      }
    } catch (error) {
      continue;
    }
  }
}

async function getWhitelistedGuild(guildId) {
  const allGuilds = await pool.query(
    'SELECT * FROM na_bot_whitelisted_guilds WHERE is_active = 1'
  );
  
  for (const guild of allGuilds) {
    try {
      const decryptedId = decrypt(guild.guild_id);
      if (decryptedId === guildId) {
        return {
          guild_id: decryptedId,
          guild_name: guild.guild_name ? decrypt(guild.guild_name) : null,
          added_by: guild.added_by ? decrypt(guild.added_by) : null,
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
      const decryptedId = decrypt(guild.guild_id);
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
    guild_id: decrypt(guild.guild_id),
    guild_name: guild.guild_name ? decrypt(guild.guild_name) : null,
    added_by: guild.added_by ? decrypt(guild.added_by) : null,
    added_at: guild.added_at,
    is_active: guild.is_active,
    notes: guild.notes
  }));
}

async function addWhitelistedGuild(guildId, guildName, addedBy, notes = null) {
  await pool.query(
    'INSERT INTO na_bot_whitelisted_guilds (guild_id, guild_name, added_by, notes) VALUES (?, ?, ?, ?)',
    [encrypt(guildId), encrypt(guildName), encrypt(addedBy), notes]
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
