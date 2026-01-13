const { ContainerBuilder, TextDisplayBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const logger = require('../utils/logger');
const { getAllHostServers } = require('../config/hostServers');

async function handleConfigInteraction(interaction, services) {
  const customId = interaction.customId;

  if (customId === 'config_select_raid') {
    const raidType = interaction.values[0];
    await showRaidConfig(interaction, services, raidType);
  } else if (customId.startsWith('config_change_hosts_')) {
    const raidType = customId.split('_').pop().toUpperCase();
    await showHostChangeMenu(interaction, services, raidType);
  } else if (customId.startsWith('config_save_hosts_')) {
    const raidType = customId.split('_').pop().toUpperCase();
    await saveHostChanges(interaction, services, raidType);
  } else if (customId === 'config_toggle_auto_update') {
    await toggleAutoUpdate(interaction, services);
  } else if (customId === 'config_refresh_schedules') {
    await refreshSchedules(interaction, services);
  } else if (customId === 'config_reset_confirmation') {
    await showResetConfirmation(interaction, services);
  } else if (customId === 'config_reset_confirmed') {
    await resetConfiguration(interaction, services);
  } else if (customId === 'config_back') {
    await showMainConfigMenu(interaction, services);
  } else if (customId === 'config_color_settings') {
    await showColorSettingsModal(interaction, services);
  } else if (customId === 'config_color_modal') {
    await saveColorSettings(interaction, services);
  }
}

async function showMainConfigMenu(interaction, services) {
  const { pool } = services;
  const guildId = interaction.guild.id;

  const configs = await pool.query(
    'SELECT * FROM na_bot_server_configs WHERE guild_id = ?',
    [guildId]
  );

  if (configs.length === 0) {
    const errorContainer = new ContainerBuilder();
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('❌ Server not configured. Please run `/na-schedule` to set up.')
    );
    await interaction.update({
      components: [errorContainer],
      flags: 1 << 15
    });
    return;
  }

  const config = configs[0];
  const container = new ContainerBuilder();

  let statusText = `## ⚙️ Server Configuration\n\n`;
  
  const configuredRaids = [];
  for (const raidType of ['BA', 'FT', 'DRS']) {
    const channelKey = `schedule_channel_${raidType.toLowerCase()}`;
    const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
    
    if (config[channelKey] && config[hostsKey]) {
      configuredRaids.push(raidType);
      const channel = interaction.guild.channels.cache.get(config[channelKey]);
      const hosts = JSON.parse(config[hostsKey]);
      
      statusText += `**${raidType}:**\n`;
      statusText += `Channel: ${channel ? channel.toString() : 'Not found'}\n`;
      statusText += `Servers: ${hosts.join(', ')}\n\n`;
    } else {
      statusText += `**${raidType}:** ❌ Not configured\n\n`;
    }
  }

  statusText += `**Auto-Update:** ${config.auto_update ? '✅ Enabled' : '❌ Disabled'}\n\n`;
  statusText += `Select a raid type below to add or modify its settings.`;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(statusText)
  );

  const allRaidTypes = ['BA', 'FT', 'DRS'];
  const raidSelect = new StringSelectMenuBuilder()
    .setCustomId('config_select_raid')
    .setPlaceholder('Select raid type to configure')
    .addOptions(
      allRaidTypes.map(raidType => ({
        label: `${raidType}${configuredRaids.includes(raidType) ? ' ✓' : ''}`,
        description: configuredRaids.includes(raidType) ? 'Currently configured' : 'Not yet configured',
        value: raidType,
        emoji: raidType === 'BA' ? '🏛️' : raidType === 'FT' ? '🗼' : '⚔️'
      }))
    );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(raidSelect)
  );

  const toggleButton = new ButtonBuilder()
    .setCustomId('config_toggle_auto_update')
    .setLabel(config.auto_update ? 'Disable Auto-Update' : 'Enable Auto-Update')
    .setStyle(config.auto_update ? ButtonStyle.Danger : ButtonStyle.Success);

  const refreshButton = new ButtonBuilder()
    .setCustomId('config_refresh_schedules')
    .setLabel('🔄 Refresh Now')
    .setStyle(ButtonStyle.Primary);

  const colorButton = new ButtonBuilder()
    .setCustomId('config_color_settings')
    .setLabel('🎨 Color Settings')
    .setStyle(ButtonStyle.Secondary);

  const resetButton = new ButtonBuilder()
    .setCustomId('config_reset_confirmation')
    .setLabel('🗑️ Reset Config')
    .setStyle(ButtonStyle.Danger);

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(toggleButton, refreshButton)
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(colorButton, resetButton)
  );

  await interaction.update({
    components: [container],
    flags: 1 << 15
  });
}

async function showRaidConfig(interaction, services, raidType, useEditReply = false) {
  const { pool } = services;
  const guildId = interaction.guild.id;

  const configs = await pool.query(
    'SELECT * FROM na_bot_server_configs WHERE guild_id = ?',
    [guildId]
  );

  if (configs.length === 0) {
    const errorContainer = new ContainerBuilder();
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('❌ Server not configured. Please run `/setup` first.')
    );
    const payload = {
      components: [errorContainer],
      flags: 1 << 15
    };
    if (useEditReply) {
      await interaction.editReply(payload);
    } else {
      await interaction.update(payload);
    }
    return;
  }

  const config = configs[0];
  const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
  const enabledHosts = config[hostsKey] ? JSON.parse(config[hostsKey]) : [];

  const container = new ContainerBuilder();

  const configText = 
    `## ${raidType} Configuration\n\n` +
    `**Currently Enabled Servers:**\n` +
    (enabledHosts.length > 0 ? enabledHosts.map(h => `● ${h}`).join('\n') : 'None') +
    `\n\nUse the buttons below to modify settings.`;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(configText)
  );

  const changeHostsButton = new ButtonBuilder()
    .setCustomId(`config_change_hosts_${raidType.toLowerCase()}`)
    .setLabel('Change Host Servers')
    .setStyle(ButtonStyle.Primary);

  const backButton = new ButtonBuilder()
    .setCustomId('config_back')
    .setLabel('Back to Menu')
    .setStyle(ButtonStyle.Secondary);

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(changeHostsButton, backButton)
  );

  const payload = {
    components: [container],
    flags: 1 << 15
  };
  
  if (useEditReply) {
    await interaction.editReply(payload);
  } else {
    await interaction.update(payload);
  }
}

async function showHostChangeMenu(interaction, services, raidType) {
  const { pool } = services;
  const guildId = interaction.guild.id;

  const configs = await pool.query(
    'SELECT * FROM na_bot_server_configs WHERE guild_id = ?',
    [guildId]
  );

  const config = configs[0];
  const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
  const currentHosts = config[hostsKey] ? JSON.parse(config[hostsKey]) : [];
  const allHosts = getAllHostServers();

  const container = new ContainerBuilder();

  const headerText = 
    `## Change Host Servers for ${raidType}\n\n` +
    `Select which host servers to display.`;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(headerText)
  );

  const hostSelect = new StringSelectMenuBuilder()
    .setCustomId(`config_save_hosts_${raidType.toLowerCase()}`)
    .setPlaceholder('Select host servers')
    .setMinValues(1)
    .setMaxValues(allHosts.length)
    .addOptions(
      allHosts.map(server => ({
        label: server,
        value: server,
        default: currentHosts.includes(server)
      }))
    );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(hostSelect)
  );

  const cancelButton = new ButtonBuilder()
    .setCustomId('config_back')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(cancelButton)
  );

  await interaction.update({
    components: [container],
    flags: 64 | 32768
  });
}

async function saveHostChanges(interaction, services, raidType) {
  const selectedHosts = interaction.values;
  const { pool, updateManager } = services;
  const guildId = interaction.guild.id;

  try {
    await interaction.deferUpdate();

    const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
    
    await pool.query(
      `UPDATE na_bot_server_configs 
       SET ${hostsKey} = ? 
       WHERE guild_id = ?`,
      [JSON.stringify(selectedHosts), guildId]
    );

    logger.info('Host servers updated', {
      guildId,
      raidType,
      hosts: selectedHosts
    });

    await showRaidConfig(interaction, services, raidType, true);

    updateManager.forceUpdate(guildId).catch(err => {
      logger.error('Error in background schedule update', {
        error: err.message,
        guildId,
        raidType
      });
    });

  } catch (error) {
    logger.error('Error saving host changes', {
      error: error.message,
      guildId,
      raidType
    });

    const errorContainer = new ContainerBuilder();
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('❌ Error saving changes. Please try again.')
    );

    try {
      await interaction.editReply({
        components: [errorContainer],
        flags: 1 << 15
      });
    } catch (editError) {
      logger.error('Could not edit reply', { error: editError.message });
    }
  }
}

async function toggleAutoUpdate(interaction, services) {
  const { pool } = services;
  const guildId = interaction.guild.id;

  try {
    const configs = await pool.query(
      'SELECT auto_update FROM na_bot_server_configs WHERE guild_id = ?',
      [guildId]
    );

    const currentValue = configs[0]?.auto_update || 0;
    const newValue = currentValue ? 0 : 1;

    await pool.query(
      'UPDATE na_bot_server_configs SET auto_update = ? WHERE guild_id = ?',
      [newValue, guildId]
    );

    const successContainer = new ContainerBuilder();
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`✅ Auto-update ${newValue ? 'enabled' : 'disabled'}!`)
    );

    await interaction.update({
      components: [successContainer],
      flags: 64 | 32768
    });

  } catch (error) {
    logger.error('Error toggling auto-update', {
      error: error.message,
      guildId
    });

    const errorContainer = new ContainerBuilder();
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('❌ Error updating setting. Please try again.')
    );
    await interaction.update({
      components: [errorContainer],
      flags: 64 | 32768
    });
  }
}

async function refreshSchedules(interaction, services) {
  const guildId = interaction.guild.id;
  
  try {
    await interaction.deferUpdate();
    
    await services.updateManager.forceUpdate(guildId);
    
    const successContainer = new ContainerBuilder();
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('✅ Schedules refreshed successfully!')
    );
    
    await interaction.followUp({
      components: [successContainer],
      flags: 64 | 32768,
      ephemeral: true
    });

    logger.info('Manual refresh triggered', {
      guildId,
      user: interaction.user.tag
    });

  } catch (error) {
    logger.error('Error refreshing schedules', {
      error: error.message,
      guildId
    });

    const errorContainer = new ContainerBuilder();
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('❌ Error refreshing schedules. Please try again.')
    );
    await interaction.followUp({
      components: [errorContainer],
      flags: 64 | 32768,
      ephemeral: true
    });
  }
}

async function showResetConfirmation(interaction, services) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '## ⚠️ Reset Configuration?\n\n' +
      'This will **permanently delete** all bot configuration for this server:\n' +
      '● All raid type settings\n' +
      '● Channel assignments\n' +
      '● Host server selections\n' +
      '● All schedule messages will be removed\n\n' +
      '**This action cannot be undone!**'
    )
  );

  const confirmButton = new ButtonBuilder()
    .setCustomId('config_reset_confirmed')
    .setLabel('Yes, Reset Everything')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('config_back')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(confirmButton, cancelButton)
  );

  await interaction.update({
    components: [container],
    flags: 64 | 32768
  });
}

async function resetConfiguration(interaction, services) {
  const { pool } = services;
  const guildId = interaction.guild.id;

  try {
    const configs = await pool.query(
      'SELECT * FROM na_bot_server_configs WHERE guild_id = ?',
      [guildId]
    );

    if (configs.length > 0) {
      const config = configs[0];
      
      for (const raidType of ['BA', 'FT', 'DRS']) {
        const channelKey = `schedule_channel_${raidType.toLowerCase()}`;
        const messageKey = `schedule_message_ids_${raidType.toLowerCase()}`;
        
        if (config[channelKey] && config[messageKey]) {
          try {
            const channel = await interaction.guild.channels.fetch(config[channelKey]);
            const messageIds = JSON.parse(config[messageKey]);
            
            for (const msgId of messageIds) {
              try {
                const message = await channel.messages.fetch(msgId);
                await message.delete();
              } catch (err) {
                logger.debug('Could not delete message', { messageId: msgId });
              }
            }
          } catch (err) {
            logger.debug('Could not access channel', { channelId: config[channelKey] });
          }
        }
      }
    }

    await pool.query(
      'DELETE FROM na_bot_server_configs WHERE guild_id = ?',
      [guildId]
    );

    const successContainer = new ContainerBuilder();
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '✅ **Configuration Reset Complete**\n\n' +
        'All settings have been cleared. Run `/na-schedule` to set up the bot again.'
      )
    );

    await interaction.update({
      components: [successContainer],
      flags: 64 | 32768
    });

    logger.info('Configuration reset', {
      guildId,
      user: interaction.user.tag
    });

  } catch (error) {
    logger.error('Error resetting configuration', {
      error: error.message,
      guildId
    });

    const errorContainer = new ContainerBuilder();
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('❌ Error resetting configuration. Please try again.')
    );
    await interaction.update({
      components: [errorContainer],
      flags: 64 | 32768
    });
  }
}

async function showColorSettingsModal(interaction, services) {
  const { pool } = services;
  const guildId = interaction.guild.id;

  const configs = await pool.query(
    'SELECT schedule_color_ba, schedule_color_ft, schedule_color_drs FROM na_bot_server_configs WHERE guild_id = ?',
    [guildId]
  );

  const config = configs[0] || {};
  
  const baColor = config.schedule_color_ba ? '#' + config.schedule_color_ba.toString(16).padStart(6, '0').toUpperCase() : '';
  const ftColor = config.schedule_color_ft ? '#' + config.schedule_color_ft.toString(16).padStart(6, '0').toUpperCase() : '';
  const drsColor = config.schedule_color_drs ? '#' + config.schedule_color_drs.toString(16).padStart(6, '0').toUpperCase() : '';

  const modal = new ModalBuilder()
    .setCustomId('config_color_modal')
    .setTitle('Schedule Color Settings');

  const baInput = new TextInputBuilder()
    .setCustomId('color_ba')
    .setLabel('BA Color (hex)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('#5865F2 or 5865F2')
    .setRequired(false)
    .setMaxLength(7);

  if (baColor) baInput.setValue(baColor);

  const ftInput = new TextInputBuilder()
    .setCustomId('color_ft')
    .setLabel('FT Color (hex)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('#57F287 or 57F287')
    .setRequired(false)
    .setMaxLength(7);

  if (ftColor) ftInput.setValue(ftColor);

  const drsInput = new TextInputBuilder()
    .setCustomId('color_drs')
    .setLabel('DRS Color (hex)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('#ED4245 or ED4245')
    .setRequired(false)
    .setMaxLength(7);

  if (drsColor) drsInput.setValue(drsColor);

  modal.addComponents(
    new ActionRowBuilder().addComponents(baInput),
    new ActionRowBuilder().addComponents(ftInput),
    new ActionRowBuilder().addComponents(drsInput)
  );

  await interaction.showModal(modal);
}

async function saveColorSettings(interaction, services) {
  const { pool, updateManager } = services;
  const guildId = interaction.guild.id;

  try {
    const baColor = interaction.fields.getTextInputValue('color_ba').trim();
    const ftColor = interaction.fields.getTextInputValue('color_ft').trim();
    const drsColor = interaction.fields.getTextInputValue('color_drs').trim();

    const colors = {
      ba: parseHexColor(baColor),
      ft: parseHexColor(ftColor),
      drs: parseHexColor(drsColor)
    };

    const errors = [];
    if (baColor && colors.ba === null) errors.push('BA color is invalid');
    if (ftColor && colors.ft === null) errors.push('FT color is invalid');
    if (drsColor && colors.drs === null) errors.push('DRS color is invalid');

    if (errors.length > 0) {
      await interaction.reply({
        content: `❌ **Invalid color format:**\n${errors.join('\n')}\n\nPlease use hex format: #RRGGBB or RRGGBB`,
        ephemeral: true
      });
      return;
    }

    await pool.query(
      `UPDATE na_bot_server_configs 
       SET schedule_color_ba = ?, schedule_color_ft = ?, schedule_color_drs = ?
       WHERE guild_id = ?`,
      [colors.ba, colors.ft, colors.drs, guildId]
    );

    logger.info('Color settings updated', {
      guildId,
      colors: { ba: baColor, ft: ftColor, drs: drsColor }
    });

    let successText = '✅ **Color settings saved!**\n\n';
    if (baColor) successText += `**BA:** ${baColor}\n`;
    if (ftColor) successText += `**FT:** ${ftColor}\n`;
    if (drsColor) successText += `**DRS:** ${drsColor}\n`;
    if (!baColor && !ftColor && !drsColor) successText += 'All colors cleared (using default).\n';
    successText += '\nSchedules are updating...';

    await interaction.reply({
      content: successText,
      ephemeral: true
    });

    try {
      await updateManager.forceUpdate(guildId);
      
      await interaction.editReply({
        content: '✅ **Completed!** Schedules updated with new colors.'
      }).catch(() => {
      });
      
      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {
        });
      }, 3000);
      
    } catch (err) {
      logger.error('Error updating schedules after color change', {
        error: err.message,
        guildId
      });
      
      await interaction.editReply({
        content: '⚠️ Colors saved but schedules failed to update. Try refreshing manually.'
      }).catch(() => {
      });
    }

  } catch (error) {
    logger.error('Error saving color settings', {
      error: error.message,
      stack: error.stack,
      guildId
    });

    await interaction.reply({
      content: `❌ Error saving color settings: ${error.message}`,
      ephemeral: true
    });
  }
}

function parseHexColor(hexColor) {
  if (!hexColor) return null;
  
  let hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return null;
  }
  
  return parseInt(hex, 16);
}

module.exports = { handleConfigInteraction };
