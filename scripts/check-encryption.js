// SPDX-FileCopyrightText: 2024-2026 BootyB
// SPDX-License-Identifier: GPL-3.0-or-later

require('dotenv').config();
const pool = require('../config/database');
const { decrypt } = require('../utils/encryption');

async function checkEncryptionStatus() {
  try {
    console.log('🔍 Checking whitelist encryption status...\n');
    
    const guilds = await pool.query('SELECT guild_id, guild_name FROM na_bot_whitelisted_guilds LIMIT 5');
    
    console.log(`Found ${guilds.length} guilds in whitelist\n`);
    console.log('─'.repeat(80));
    
    for (const guild of guilds) {
      const isEncrypted = guild.guild_id.includes(':');
      
      console.log(`Guild ID: ${guild.guild_id}`);
      console.log(`Status: ${isEncrypted ? '🔐 ENCRYPTED' : '⚠️  PLAINTEXT (NOT ENCRYPTED)'}`);
      
      if (isEncrypted) {
        try {
          const decryptedId = decrypt(guild.guild_id);
          const decryptedName = guild.guild_name ? decrypt(guild.guild_name) : null;
          console.log(`Decrypted ID: ${decryptedId}`);
          console.log(`Decrypted Name: ${decryptedName}`);
        } catch (error) {
          console.log(`❌ Decryption failed: ${error.message}`);
        }
      } else {
        console.log(`Plaintext Name: ${guild.guild_name}`);
      }
      
      console.log('─'.repeat(80));
    }
    
    const hasEncrypted = guilds.some(g => g.guild_id.includes(':'));
    const hasPlaintext = guilds.some(g => !g.guild_id.includes(':'));
    
    console.log('\n📊 Summary:');
    if (hasPlaintext && !hasEncrypted) {
      console.log('⚠️  All data is UNENCRYPTED');
      console.log('\n🔧 Action Required:');
      console.log('   Run: node database/migrations/encrypt_existing_data.js');
    } else if (hasEncrypted && !hasPlaintext) {
      console.log('✅ All data is encrypted correctly');
    } else if (hasEncrypted && hasPlaintext) {
      console.log('⚠️  MIXED: Some encrypted, some plaintext');
      console.log('\n🔧 Action Required:');
      console.log('   Run: node database/migrations/encrypt_existing_data.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkEncryptionStatus();
