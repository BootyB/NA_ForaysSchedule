-- Migration: Add encryption support by expanding column sizes
-- Date: 2026-01-13
-- Description: Encrypted data is significantly larger than plaintext.
--              This migration expands VARCHAR columns to accommodate encrypted values.

-- Server configurations table - expand columns for encrypted data
ALTER TABLE `na_bot_server_configs`
  MODIFY `guild_id` VARCHAR(300) NOT NULL,
  MODIFY `guild_name` VARCHAR(500) DEFAULT NULL,
  MODIFY `schedule_channel_ba` VARCHAR(300) DEFAULT NULL,
  MODIFY `schedule_channel_ft` VARCHAR(300) DEFAULT NULL,
  MODIFY `schedule_channel_drs` VARCHAR(300) DEFAULT NULL,
  MODIFY `schedule_overview_ba` VARCHAR(300) DEFAULT NULL,
  MODIFY `schedule_overview_ft` VARCHAR(300) DEFAULT NULL,
  MODIFY `schedule_overview_drs` VARCHAR(300) DEFAULT NULL,
  -- JSON fields will store encrypted JSON strings, need more space
  MODIFY `enabled_hosts_ba` TEXT DEFAULT NULL,
  MODIFY `enabled_hosts_ft` TEXT DEFAULT NULL,
  MODIFY `enabled_hosts_drs` TEXT DEFAULT NULL,
  MODIFY `schedule_message_ba` TEXT DEFAULT NULL,
  MODIFY `schedule_message_ft` TEXT DEFAULT NULL,
  MODIFY `schedule_message_drs` TEXT DEFAULT NULL;

-- Whitelisted guilds table
ALTER TABLE `na_bot_whitelisted_guilds`
  MODIFY `guild_id` VARCHAR(300) NOT NULL,
  MODIFY `guild_name` VARCHAR(500) DEFAULT NULL,
  MODIFY `added_by` VARCHAR(300) DEFAULT NULL;

-- Note: Host servers table doesn't contain user data, no changes needed
