# Database Setup Guide

## Prerequisites

- MariaDB or MySQL server
- Access to the `proto_ozma` database (or your configured database name)
- Database user with appropriate permissions

## Setup Steps

### 1. Create Read-Only User for Bot

```sql
-- Connect to your database as admin
mysql -u root -p

-- Create dedicated user for NA Schedule Bot
CREATE USER 'na_schedule_bot'@'%' IDENTIFIED BY 'your_secure_password_here';

-- Grant READ-ONLY access to datacenterNA table
GRANT SELECT ON proto_ozma.datacenterNA TO 'na_schedule_bot'@'%';

-- Grant FULL access to bot's config tables
GRANT SELECT, INSERT, UPDATE, DELETE ON proto_ozma.na_bot_server_configs TO 'na_schedule_bot'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON proto_ozma.na_bot_whitelisted_guilds TO 'na_schedule_bot'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON proto_ozma.na_bot_whitelisted_hosts TO 'na_schedule_bot'@'%';

-- Apply changes
FLUSH PRIVILEGES;
```

### 2. Create Bot Tables

```bash
# Run the schema file
mysql -u root -p proto_ozma < database/schema.sql
```

Or copy and paste the contents of `schema.sql` into your MySQL client.

### 3. Verify Setup

```sql
-- Check that tables were created
SHOW TABLES LIKE 'na_bot_%';

-- Verify host whitelist
SELECT * FROM na_bot_whitelisted_hosts;

-- Verify user permissions
SHOW GRANTS FOR 'na_schedule_bot'@'%';
```

### 4. Update .env File

Update your `.env` file with the database credentials:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=proto_ozma
DB_USER=na_schedule_bot
DB_PASSWORD=your_secure_password_here
```

## Whitelist Management

### Add a Guild to Whitelist

```sql
INSERT INTO na_bot_whitelisted_guilds (guild_id, guild_name, added_by, is_active)
VALUES ('123456789012345678', 'Example Server', 'your_user_id', 1);
```

### Add a Host Server to Whitelist

```sql
INSERT INTO na_bot_whitelisted_hosts (server_name, added_by, is_active)
VALUES ('New Server Name', 'your_user_id', 1);
```

### Disable a Whitelisted Guild

```sql
UPDATE na_bot_whitelisted_guilds
SET is_active = 0
WHERE guild_id = '123456789012345678';
```

## Troubleshooting

### Connection Issues

1. Check that MariaDB is running: `systemctl status mariadb`
2. Verify firewall allows connections on port 3306
3. Check database credentials in `.env`
4. Test connection: `mysql -u na_schedule_bot -p -h 127.0.0.1`

### Permission Issues

If you get "Access Denied" errors:

```sql
-- Verify grants
SHOW GRANTS FOR 'na_schedule_bot'@'%';

-- Reapply grants if needed
GRANT SELECT ON proto_ozma.datacenterNA TO 'na_schedule_bot'@'%';
FLUSH PRIVILEGES;
```

### Missing Tables

If `datacenterNA` doesn't exist, this bot requires the main Proto-Ozma bot database to be set up first, as it reads schedule data from that table.
