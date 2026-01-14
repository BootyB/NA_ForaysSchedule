-- Migration: Create blacklist table for post-beta
-- Date: 2026-01-13
-- Description: Blacklist table for blocking specific guilds after beta phase

CREATE TABLE IF NOT EXISTS `na_bot_blacklisted_guilds` (
  `guild_id` VARCHAR(300) NOT NULL,
  `guild_name` VARCHAR(500) DEFAULT NULL,
  `reason` TEXT DEFAULT NULL,
  `added_by` VARCHAR(300) DEFAULT NULL,
  `added_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `is_active` TINYINT(1) DEFAULT 1,
  
  PRIMARY KEY (`guild_id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
