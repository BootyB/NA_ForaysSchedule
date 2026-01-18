#!/usr/bin/env node
// SPDX-FileCopyrightText: 2024-2026 BootyB
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Database Migration Script
 * 
 * This script sets up the required database tables for the NA Schedule Bot.
 * Run this after configuring your .env file.
 * 
 * Usage: node database/migrate.js
 */

require('dotenv').config();
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

// Check required environment variables
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    console.error('Please configure your .env file before running migrations.');
    process.exit(1);
  }
}

async function runMigration() {
  let conn;
  
  try {
    console.log('🔄 Connecting to database...');
    
    conn = await mariadb.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Connected to database');
    console.log('');
    console.log('📝 Reading schema file...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Running migrations...');
    console.log('');

    await conn.query(schema);

    console.log('✅ Server configurations table created/verified');
    console.log('✅ Whitelisted guilds table created/verified');
    console.log('✅ Whitelisted host servers table created/verified');
    console.log('✅ Default host servers inserted');
    console.log('');
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add your Discord server to the whitelist (see README.md)');
    console.log('2. Deploy commands: npm run deploy');
    console.log('3. Start the bot: npm start');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('');
      console.error('Database access denied. Please check:');
      console.error('- DB_USER has correct username');
      console.error('- DB_PASSWORD is correct');
      console.error('- User has CREATE and INSERT permissions');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('Cannot connect to database. Please check:');
      console.error('- DB_HOST is correct');
      console.error('- DB_PORT is correct (default: 3306)');
      console.error('- Database server is running');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('');
      console.error('Database does not exist. Please check:');
      console.error('- DB_NAME is correct');
      console.error('- Database has been created');
    }
    
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
      console.log('');
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration();
