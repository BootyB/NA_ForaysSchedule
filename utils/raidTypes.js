// SPDX-FileCopyrightText: 2024-2026 BootyB
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * RaidType utility module
 * 
 * Provides a centralized abstraction for raid type handling throughout the codebase.
 * Eliminates hardcoded 'BA', 'FT', 'DRS' strings and provides helper methods for
 * config key generation, validation, and iteration.
 */

const { RAID_TYPES, RUN_TYPE_PRIORITY, GOOGLE_CALENDAR_IDS, BANNER_IMAGES } = require('../config/constants');

// Enum-like object for raid type keys
const RaidTypeKey = Object.freeze({
  BA: 'BA',
  FT: 'FT',
  DRS: 'DRS'
});

// Array of all valid raid type keys for iteration
const ALL_RAID_TYPES = Object.freeze([RaidTypeKey.BA, RaidTypeKey.FT, RaidTypeKey.DRS]);

/**
 * Check if a string is a valid raid type
 * @param {string} type - The string to validate
 * @returns {boolean} True if valid raid type
 */
function isValidRaidType(type) {
  return ALL_RAID_TYPES.includes(type);
}

/**
 * Get all raid type keys
 * @returns {string[]} Array of raid type keys
 */
function getAllRaidTypes() {
  return [...ALL_RAID_TYPES];
}

/**
 * Get raid type info (name, emoji, color, runTypes)
 * @param {string} raidType - The raid type key
 * @returns {Object|null} Raid type info or null if invalid
 */
function getRaidTypeInfo(raidType) {
  return RAID_TYPES[raidType] || null;
}

/**
 * Get the display name for a raid type
 * @param {string} raidType - The raid type key
 * @returns {string} Display name or the key if not found
 */
function getRaidTypeName(raidType) {
  return RAID_TYPES[raidType]?.name || raidType;
}

/**
 * Get the default color for a raid type
 * @param {string} raidType - The raid type key
 * @returns {number} Color value
 */
function getRaidTypeColor(raidType) {
  return RAID_TYPES[raidType]?.color || 0xED4245;
}

/**
 * Get the emoji for a raid type
 * @param {string} raidType - The raid type key
 * @returns {Object|null} Emoji object with id and name
 */
function getRaidTypeEmoji(raidType) {
  return RAID_TYPES[raidType]?.emoji || null;
}

/**
 * Get the run type priority array for sorting
 * @param {string} raidType - The raid type key
 * @returns {string[]} Array of run types in priority order
 */
function getRunTypePriority(raidType) {
  return RUN_TYPE_PRIORITY[raidType] || [];
}

/**
 * Get the banner image URL for a raid type
 * @param {string} raidType - The raid type key
 * @returns {string|null} Banner image URL
 */
function getBannerImage(raidType) {
  return BANNER_IMAGES[raidType] || null;
}

/**
 * Get the Google Calendar ID for a raid type
 * @param {string} raidType - The raid type key
 * @returns {string|null} Calendar ID
 */
function getCalendarId(raidType) {
  return GOOGLE_CALENDAR_IDS[raidType] || null;
}

// ============================================
// Config Key Generators
// ============================================

/**
 * Generate config key name for a raid type field
 * @param {string} prefix - The field prefix (e.g., 'schedule_channel', 'enabled_hosts')
 * @param {string} raidType - The raid type key
 * @returns {string} The config key (e.g., 'schedule_channel_ba')
 */
function getConfigKey(prefix, raidType) {
  return `${prefix}_${raidType.toLowerCase()}`;
}

/**
 * Get all config key names for a given field prefix
 * @param {string} prefix - The field prefix
 * @returns {Object} Object mapping raid type to config key
 */
function getAllConfigKeys(prefix) {
  const keys = {};
  for (const raidType of ALL_RAID_TYPES) {
    keys[raidType] = getConfigKey(prefix, raidType);
  }
  return keys;
}

// Pre-computed config key mappings for common fields
const ConfigKeys = Object.freeze({
  SCHEDULE_CHANNEL: getAllConfigKeys('schedule_channel'),
  SCHEDULE_OVERVIEW: getAllConfigKeys('schedule_overview'),
  ENABLED_HOSTS: getAllConfigKeys('enabled_hosts'),
  SCHEDULE_MESSAGE: getAllConfigKeys('schedule_message'),
  SCHEDULE_COLOR: getAllConfigKeys('schedule_color')
});

/**
 * Get the schedule channel config key for a raid type
 * @param {string} raidType - The raid type key
 * @returns {string} Config key
 */
function getScheduleChannelKey(raidType) {
  return ConfigKeys.SCHEDULE_CHANNEL[raidType];
}

/**
 * Get the schedule overview config key for a raid type
 * @param {string} raidType - The raid type key
 * @returns {string} Config key
 */
function getScheduleOverviewKey(raidType) {
  return ConfigKeys.SCHEDULE_OVERVIEW[raidType];
}

/**
 * Get the enabled hosts config key for a raid type
 * @param {string} raidType - The raid type key
 * @returns {string} Config key
 */
function getEnabledHostsKey(raidType) {
  return ConfigKeys.ENABLED_HOSTS[raidType];
}

/**
 * Get the schedule message config key for a raid type
 * @param {string} raidType - The raid type key
 * @returns {string} Config key
 */
function getScheduleMessageKey(raidType) {
  return ConfigKeys.SCHEDULE_MESSAGE[raidType];
}

/**
 * Get the schedule color config key for a raid type
 * @param {string} raidType - The raid type key
 * @returns {string} Config key
 */
function getScheduleColorKey(raidType) {
  return ConfigKeys.SCHEDULE_COLOR[raidType];
}

// ============================================
// Iteration Helpers
// ============================================

/**
 * Iterate over all raid types with a callback
 * @param {Function} callback - Function called with (raidType, info) for each type
 */
function forEachRaidType(callback) {
  for (const raidType of ALL_RAID_TYPES) {
    callback(raidType, RAID_TYPES[raidType]);
  }
}

/**
 * Map over all raid types
 * @param {Function} callback - Function called with (raidType, info) returning a value
 * @returns {Array} Array of mapped values
 */
function mapRaidTypes(callback) {
  return ALL_RAID_TYPES.map(raidType => callback(raidType, RAID_TYPES[raidType]));
}

/**
 * Build an object with a value for each raid type
 * @param {Function} valueGenerator - Function called with (raidType) returning the value
 * @returns {Object} Object with raid types as keys
 */
function buildRaidTypeObject(valueGenerator) {
  const result = {};
  for (const raidType of ALL_RAID_TYPES) {
    result[raidType] = valueGenerator(raidType);
  }
  return result;
}

// ============================================
// Config Field Mappers (for database operations)
// ============================================

/**
 * Field mapping for encryption/decryption operations
 * Each entry defines: configKey, encryption type ('field' or 'json')
 */
const ENCRYPTED_FIELD_MAP = Object.freeze([
  { prefix: 'schedule_channel', type: 'field' },
  { prefix: 'schedule_overview', type: 'field' },
  { prefix: 'enabled_hosts', type: 'json' },
  { prefix: 'schedule_message', type: 'json' }
]);

/**
 * Generate all encrypted field configurations for iteration
 * @returns {Array<{configKey: string, raidType: string, encryptType: string}>}
 */
function getEncryptedFieldConfigs() {
  const configs = [];
  for (const { prefix, type } of ENCRYPTED_FIELD_MAP) {
    for (const raidType of ALL_RAID_TYPES) {
      configs.push({
        configKey: getConfigKey(prefix, raidType),
        raidType,
        encryptType: type
      });
    }
  }
  return configs;
}

/**
 * Generate color field configurations (not encrypted, just raid-type specific)
 * @returns {Array<{configKey: string, raidType: string, key: string}>}
 */
function getColorFieldConfigs() {
  return ALL_RAID_TYPES.map(raidType => ({
    key: raidType.toLowerCase(),
    configKey: getScheduleColorKey(raidType),
    raidType
  }));
}

module.exports = {
  // Enum-like keys
  RaidTypeKey,
  ALL_RAID_TYPES,
  
  // Validation
  isValidRaidType,
  
  // Getters
  getAllRaidTypes,
  getRaidTypeInfo,
  getRaidTypeName,
  getRaidTypeColor,
  getRaidTypeEmoji,
  getRunTypePriority,
  getBannerImage,
  getCalendarId,
  
  // Config key helpers
  getConfigKey,
  getAllConfigKeys,
  ConfigKeys,
  getScheduleChannelKey,
  getScheduleOverviewKey,
  getEnabledHostsKey,
  getScheduleMessageKey,
  getScheduleColorKey,
  
  // Iteration helpers
  forEachRaidType,
  mapRaidTypes,
  buildRaidTypeObject,
  
  // Database field mapping
  ENCRYPTED_FIELD_MAP,
  getEncryptedFieldConfigs,
  getColorFieldConfigs
};
