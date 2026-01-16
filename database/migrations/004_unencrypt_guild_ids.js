require('dotenv').config();
const pool = require('../../config/database');
const { decrypt } = require('../../utils/encryption');

function decryptField(value) {
  if (!value) return null;
  if (value.startsWith('DEV:')) return value.substring(4);
  return decrypt(value);
}

async function migrateGuildIds() {
  try {
    console.log('🔧 Migrating guild_id to unencrypted format...\n');
    
    const configs = await pool.query('SELECT * FROM na_bot_server_configs');
    console.log(`Found ${configs.length} rows\n`);
    
    const byGuild = new Map();
    
    for (const config of configs) {
      let decryptedId;
      const isEncrypted = config.guild_id.includes(':') || config.guild_id.startsWith('DEV:');
      
      if (isEncrypted) {
        try {
          decryptedId = decryptField(config.guild_id);
        } catch (err) {
          console.log(`⚠️  Could not decrypt guild_id: ${config.guild_id.substring(0, 30)}...`);
          continue;
        }
      } else {
        decryptedId = config.guild_id;
      }
      
      if (!byGuild.has(decryptedId)) {
        byGuild.set(decryptedId, []);
      }
      byGuild.get(decryptedId).push({
        ...config,
        decryptedId,
        isEncrypted
      });
    }
    
    console.log(`Found ${byGuild.size} unique guilds\n`);
    console.log('═'.repeat(80));
    
    for (const [decryptedId, rows] of byGuild) {
      console.log(`\n🏠 Guild: ${decryptedId}`);
      console.log(`   Rows: ${rows.length}`);
      
      rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      
      const keepRow = rows[0];
      const deleteRows = rows.slice(1);
      
      console.log(`   Keeping row updated at: ${keepRow.updated_at}`);
      
      for (const row of deleteRows) {
        console.log(`   Deleting duplicate (updated: ${row.updated_at})`);
        await pool.query('DELETE FROM na_bot_server_configs WHERE guild_id = ?', [row.guild_id]);
      }
      
      if (keepRow.isEncrypted) {
        console.log(`   Converting guild_id from encrypted to plaintext`);
        
        await pool.query(
          `INSERT INTO na_bot_server_configs 
           (guild_id, guild_name, setup_complete, auto_update,
            schedule_channel_ba, schedule_channel_ft, schedule_channel_drs,
            schedule_overview_ba, schedule_overview_ft, schedule_overview_drs,
            enabled_hosts_ba, enabled_hosts_ft, enabled_hosts_drs,
            schedule_message_ba, schedule_message_ft, schedule_message_drs,
            schedule_color_ba, schedule_color_ft, schedule_color_drs,
            created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            decryptedId,
            keepRow.guild_name,
            keepRow.setup_complete,
            keepRow.auto_update,
            keepRow.schedule_channel_ba,
            keepRow.schedule_channel_ft,
            keepRow.schedule_channel_drs,
            keepRow.schedule_overview_ba,
            keepRow.schedule_overview_ft,
            keepRow.schedule_overview_drs,
            keepRow.enabled_hosts_ba,
            keepRow.enabled_hosts_ft,
            keepRow.enabled_hosts_drs,
            keepRow.schedule_message_ba,
            keepRow.schedule_message_ft,
            keepRow.schedule_message_drs,
            keepRow.schedule_color_ba,
            keepRow.schedule_color_ft,
            keepRow.schedule_color_drs,
            keepRow.created_at,
            keepRow.updated_at
          ]
        );
        
        await pool.query('DELETE FROM na_bot_server_configs WHERE guild_id = ?', [keepRow.guild_id]);
        console.log(`   ✅ Migrated successfully`);
      } else {
        console.log(`   ✅ Already plaintext, no migration needed`);
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('MIGRATION COMPLETE');
    console.log('═'.repeat(80));
    
    const remaining = await pool.query('SELECT guild_id FROM na_bot_server_configs');
    console.log(`\nFinal row count: ${remaining.length}`);
    
    for (const row of remaining) {
      const isEncrypted = row.guild_id.includes(':');
      console.log(`   ${row.guild_id} - ${isEncrypted ? '⚠️ STILL ENCRYPTED' : '✅ Plaintext'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateGuildIds();
