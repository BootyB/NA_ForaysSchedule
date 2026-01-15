const { ContainerBuilder, TextDisplayBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { getAllHostServers, getServerEmoji } = require('../config/hostServers');
const { areValidHostServers } = require('../utils/validators');
const encryptedDb = require('../config/encryptedDatabase');
const { buildConfigMenu } = require('../utils/configMenuBuilder');

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
  } else if (customId.startsWith('config_regenerate_raid_')) {
    const raidType = customId.split('_').pop().toUpperCase();
    await regenerateRaidSchedule(interaction, services, raidType);
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
  const guildId = interaction.guild.id;

  const config = await encryptedDb.getServerConfig(guildId);

  if (!config) {
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

  const container = buildConfigMenu(config, interaction.guild);

  await interaction.update({
    components: [container],
    flags: 1 << 15
  });
}

async function showRaidConfig(interaction, services, raidType, useEditReply = false) {
  const guildId = interaction.guild.id;

  const config = await encryptedDb.getServerConfig(guildId);

  if (!config) {
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

  const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
  const enabledHosts = config[hostsKey] || [];

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

  const regenerateButton = new ButtonBuilder()
    .setCustomId(`config_regenerate_raid_${raidType.toLowerCase()}`)
    .setLabel('Regenerate Schedule')
    .setStyle(ButtonStyle.Success);

  const backButton = new ButtonBuilder()
    .setCustomId('config_back')
    .setLabel('Back to Menu')
    .setStyle(ButtonStyle.Secondary);

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(changeHostsButton, regenerateButton)
  );
  
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(backButton)
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
  const guildId = interaction.guild.id;

  const config = await encryptedDb.getServerConfig(guildId);
  const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
  const currentHosts = config[hostsKey] || [];
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
      allHosts.map(server => {
        const option = {
          label: server,
          value: server,
          default: currentHosts.includes(server)
        };
        const emoji = getServerEmoji(server);
        if (emoji) {
          option.emoji = emoji;
        }
        return option;
      })
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

    if (!areValidHostServers(selectedHosts)) {
      logger.warn('Invalid host servers selected', { guildId, raidType, selectedHosts });
      
      const errorContainer = new ContainerBuilder();
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('❌ One or more selected host servers are invalid. Please try again.')
      );
      
      await interaction.editReply({
        components: [errorContainer],
        flags: 64 | 32768
      });
      return;
    }

    const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
    
    await encryptedDb.updateServerConfig(guildId, {
      [hostsKey]: selectedHosts
    });

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
  const guildId = interaction.guild.id;

  try {
    const config = await encryptedDb.getServerConfig(guildId);

    const currentValue = config?.auto_update || 0;
    const newValue = currentValue ? 0 : 1;

    await encryptedDb.updateServerConfig(guildId, { auto_update: newValue });

    const updatedConfig = { ...config, auto_update: newValue };
    const container = buildConfigMenu(updatedConfig, interaction.guild);

    await interaction.update({
      components: [container],
      flags: 1 << 15
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

async function regenerateRaidSchedule(interaction, services, raidType) {
  const guildId = interaction.guild.id;
  
  try {
    const config = await encryptedDb.getServerConfig(guildId);
    if (!config) {
      const errorContainer = new ContainerBuilder();
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('❌ Server not configured.')
      );
      await interaction.update({
        components: [errorContainer],
        flags: 64
      });
      return;
    }

    const channelKey = `schedule_channel_${raidType.toLowerCase()}`;
    const scheduleChannelId = config[channelKey];
    const isSameChannel = interaction.channelId === scheduleChannelId;

    if (isSameChannel) {
      await interaction.deferUpdate();
      await interaction.deleteReply().catch(() => {});
      
      const result = await services.updateManager.regenerateSchedule(guildId, raidType);
      
      if (result.success) {
        const successContainer = new ContainerBuilder();
        successContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ ${raidType} schedule regenerated successfully! Returning to configuration...`)
        );
        
        const successMessage = await interaction.followUp({
          components: [successContainer],
          flags: 64 | 32768
        });

        logger.info('Raid schedule regenerated', {
          guildId,
          raidType,
          user: interaction.user.tag
        });

        setTimeout(async () => {
          try {
            const config = await encryptedDb.getServerConfig(guildId);
            
            if (!config) {
              return;
            }

            const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
            const enabledHosts = config[hostsKey] || [];

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

            const regenerateButton = new ButtonBuilder()
              .setCustomId(`config_regenerate_raid_${raidType.toLowerCase()}`)
              .setLabel('Regenerate Schedule')
              .setStyle(ButtonStyle.Success);

            const backButton = new ButtonBuilder()
              .setCustomId('config_back')
              .setLabel('Back to Menu')
              .setStyle(ButtonStyle.Secondary);

            container.addActionRowComponents(
              new ActionRowBuilder().addComponents(changeHostsButton, regenerateButton)
            );
            
            container.addActionRowComponents(
              new ActionRowBuilder().addComponents(backButton)
            );

            await interaction.webhook.editMessage(successMessage.id, {
              components: [container]
            });
          } catch (error) {
            logger.error('Error updating success message to config', {
              error: error.message,
              guildId,
              raidType
            });
          }
        }, 3000);
      } else {
        const errorContainer = new ContainerBuilder();
        errorContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`❌ Error regenerating ${raidType} schedule: ${result.error}`)
        );
        await interaction.followUp({
          components: [errorContainer],
          flags: 64 | 32768
        });
      }
    } else {
      await interaction.deferUpdate();
      
      const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
      const enabledHosts = config[hostsKey] || [];

      const container = new ContainerBuilder();

      const configText = 
        `## ${raidType} Configuration\n\n` +
        `**Currently Enabled Servers:**\n` +
        (enabledHosts.length > 0 ? enabledHosts.map(h => `● ${h}`).join('\n') : 'None') +
        `\n\nUse the buttons below to modify settings.\n\n` +
        `*Building...*`;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(configText)
      );

      const changeHostsButton = new ButtonBuilder()
        .setCustomId(`config_change_hosts_${raidType.toLowerCase()}`)
        .setLabel('Change Host Servers')
        .setStyle(ButtonStyle.Primary);

      const regenerateButton = new ButtonBuilder()
        .setCustomId(`config_regenerate_raid_${raidType.toLowerCase()}`)
        .setLabel('Regenerate Schedule')
        .setStyle(ButtonStyle.Success);

      const backButton = new ButtonBuilder()
        .setCustomId('config_back')
        .setLabel('Back to Menu')
        .setStyle(ButtonStyle.Secondary);

      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(changeHostsButton, regenerateButton)
      );
      
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(backButton)
      );

      await interaction.editReply({
        components: [container]
      });

      const result = await services.updateManager.regenerateSchedule(guildId, raidType);

      if (result.success) {
        const successText = 
          `## ${raidType} Configuration\n\n` +
          `**Currently Enabled Servers:**\n` +
          (enabledHosts.length > 0 ? enabledHosts.map(h => `● ${h}`).join('\n') : 'None') +
          `\n\nUse the buttons below to modify settings.\n\n` +
          `*✅ Success*`;

        const successContainer = new ContainerBuilder();
        successContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(successText)
        );
        successContainer.addActionRowComponents(
          new ActionRowBuilder().addComponents(changeHostsButton, regenerateButton)
        );
        successContainer.addActionRowComponents(
          new ActionRowBuilder().addComponents(backButton)
        );

        await interaction.editReply({
          components: [successContainer]
        });

        logger.info('Raid schedule regenerated', {
          guildId,
          raidType,
          user: interaction.user.tag
        });

        setTimeout(async () => {
          try {
            const finalText = 
              `## ${raidType} Configuration\n\n` +
              `**Currently Enabled Servers:**\n` +
              (enabledHosts.length > 0 ? enabledHosts.map(h => `● ${h}`).join('\n') : 'None') +
              `\n\nUse the buttons below to modify settings.`;

            const finalContainer = new ContainerBuilder();
            finalContainer.addTextDisplayComponents(
              new TextDisplayBuilder().setContent(finalText)
            );
            finalContainer.addActionRowComponents(
              new ActionRowBuilder().addComponents(changeHostsButton, regenerateButton)
            );
            finalContainer.addActionRowComponents(
              new ActionRowBuilder().addComponents(backButton)
            );

            await interaction.editReply({
              components: [finalContainer]
            });
          } catch (error) {
            logger.error('Error removing status line', {
              error: error.message,
              guildId,
              raidType
            });
          }
        }, 3000);
      } else {
        const errorText = 
          `## ${raidType} Configuration\n\n` +
          `**Currently Enabled Servers:**\n` +
          (enabledHosts.length > 0 ? enabledHosts.map(h => `● ${h}`).join('\n') : 'None') +
          `\n\nUse the buttons below to modify settings.\n\n` +
          `*❌ Error: ${result.error}*`;

        const errorContainer = new ContainerBuilder();
        errorContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(errorText)
        );
        errorContainer.addActionRowComponents(
          new ActionRowBuilder().addComponents(changeHostsButton, regenerateButton)
        );
        errorContainer.addActionRowComponents(
          new ActionRowBuilder().addComponents(backButton)
        );

        await interaction.editReply({
          components: [errorContainer]
        });

        setTimeout(async () => {
          try {
            const finalText = 
              `## ${raidType} Configuration\n\n` +
              `**Currently Enabled Servers:**\n` +
              (enabledHosts.length > 0 ? enabledHosts.map(h => `● ${h}`).join('\n') : 'None') +
              `\n\nUse the buttons below to modify settings.`;

            const finalContainer = new ContainerBuilder();
            finalContainer.addTextDisplayComponents(
              new TextDisplayBuilder().setContent(finalText)
            );
            finalContainer.addActionRowComponents(
              new ActionRowBuilder().addComponents(changeHostsButton, regenerateButton)
            );
            finalContainer.addActionRowComponents(
              new ActionRowBuilder().addComponents(backButton)
            );

            await interaction.editReply({
              components: [finalContainer]
            });
          } catch (error) {
            logger.error('Error removing error line', {
              error: error.message,
              guildId,
              raidType
            });
          }
        }, 5000);
      }
    }

  } catch (error) {
    logger.error('Error regenerating raid schedule', {
      error: error.message,
      guildId,
      raidType
    });

    try {
      const errorContainer = new ContainerBuilder();
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`❌ Error regenerating ${raidType} schedule. Please try again.`)
      );
      
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          components: [errorContainer],
          flags: 64 | 32768
        }).catch(() => {});
      } else {
        await interaction.reply({
          components: [errorContainer],
          flags: 64 | 32768
        }).catch(() => {});
      }
    } catch (err) {
      logger.error('Failed to send error message', { error: err.message });
    }
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
      '● Custom accent colors\n' +
      '● All active schedule containers (overview and schedule messages)\n\n' +
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
  const guildId = interaction.guild.id;

  try {
    await interaction.deferUpdate();
    
    const config = await encryptedDb.getServerConfig(guildId);

    if (config) {
      for (const raidType of ['BA', 'DRS', 'FT']) {
        const channelKey = `schedule_channel_${raidType.toLowerCase()}`;
        const channelId = config[channelKey];
        
        if (channelId) {
          try {
            const channel = await interaction.guild.channels.fetch(channelId);
            
            const overviewKey = `schedule_overview_${raidType.toLowerCase()}`;
            const overviewId = config[overviewKey];
            if (overviewId) {
              try {
                const overviewMsg = await channel.messages.fetch(overviewId);
                await overviewMsg.delete();
                logger.debug('Deleted overview message', { guildId, raidType });
              } catch (err) {
                logger.debug('Could not delete overview message', { messageId: overviewId });
              }
            }
            
            const messageKey = `schedule_message_${raidType.toLowerCase()}`;
            const messageIds = config[messageKey];
            if (messageIds) {
              const parsedIds = Array.isArray(messageIds) ? messageIds : JSON.parse(messageIds);
              for (const msgId of parsedIds) {
                try {
                  const message = await channel.messages.fetch(msgId);
                  await message.delete();
                  logger.debug('Deleted schedule message', { guildId, raidType, messageId: msgId });
                } catch (err) {
                  logger.debug('Could not delete message', { messageId: msgId });
                }
              }
            }
          } catch (err) {
            logger.debug('Could not access channel', { channelId });
          }
        }
      }
    }

    await encryptedDb.deleteServerConfig(guildId);

    const successContainer = new ContainerBuilder();
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '✅ **Configuration Reset Complete**\n\n' +
        'All settings have been cleared. Run `/na-schedule` to set up the bot again.'
      )
    );

    await interaction.editReply({
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
    await interaction.editReply({
      components: [errorContainer],
      flags: 64 | 32768
    });
  }
}

async function showColorSettingsModal(interaction, services) {
  const guildId = interaction.guild.id;

  const config = await encryptedDb.getServerConfig(guildId) || {};
  
  logger.info('Color settings modal - raw config values', {
    guildId,
    ba: config.schedule_color_ba,
    ft: config.schedule_color_ft,
    drs: config.schedule_color_drs
  });
  
  const formatColorForInput = (colorValue) => {
    if (colorValue === null || colorValue === undefined) return '';
    const numValue = typeof colorValue === 'string' ? parseInt(colorValue, 10) : colorValue;
    if (numValue === -1) return '';
    if (typeof numValue === 'number' && numValue >= 0) {
      return '#' + numValue.toString(16).padStart(6, '0').toUpperCase();
    }
    return '';
  };
  
  const baColor = formatColorForInput(config.schedule_color_ba);
  const ftColor = formatColorForInput(config.schedule_color_ft);
  const drsColor = formatColorForInput(config.schedule_color_drs);
  
  logger.info('Color settings modal - formatted values', {
    guildId,
    baColor,
    ftColor,
    drsColor
  });

  const baInput = new TextInputBuilder()
    .setCustomId('color_ba')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('ex: #5865F2, 5865F2, none, or default')
    .setRequired(false)
    .setMaxLength(7)
    .setValue(baColor || '');

  const ftInput = new TextInputBuilder()
    .setCustomId('color_ft')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('ex: #57F287, 57F287, none, or default')
    .setRequired(false)
    .setMaxLength(7)
    .setValue(ftColor || '');

  const drsInput = new TextInputBuilder()
    .setCustomId('color_drs')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('ex: #ED4245, ED4245, none, or default')
    .setRequired(false)
    .setMaxLength(7)
    .setValue(drsColor || '');

  const baLabel = new LabelBuilder()
    .setLabel('BA Color (hex)')
    .setTextInputComponent(baInput);

  const ftLabel = new LabelBuilder()
    .setLabel('FT Color (hex)')
    .setTextInputComponent(ftInput);

  const drsLabel = new LabelBuilder()
    .setLabel('DRS Color (hex)')
    .setTextInputComponent(drsInput);

  const modal = new ModalBuilder()
    .setCustomId('config_color_modal')
    .setTitle('Schedule Accent Colors')
    .addLabelComponents(baLabel, drsLabel, ftLabel);

  await interaction.showModal(modal);
}

async function saveColorSettings(interaction, services) {
  const { pool, updateManager } = services;
  const guildId = interaction.guild.id;

  try {
    const currentConfig = await encryptedDb.getServerConfig(guildId) || {};
    
    const baColor = interaction.fields.getTextInputValue('color_ba').trim();    
    const drsColor = interaction.fields.getTextInputValue('color_drs').trim();
    const ftColor = interaction.fields.getTextInputValue('color_ft').trim();

    const errors = [];
    const updateData = {};
    const changedRaidTypes = [];
    const displayColors = { ba: baColor, ft: ftColor, drs: drsColor };

    if (baColor) {
      const parsed = parseHexColor(baColor);
      const lowerBA = baColor.toLowerCase();
      if (lowerBA !== 'none' && lowerBA !== 'default' && parsed === null) {
        errors.push('BA color is invalid');
      } else {
        const currentBA = typeof currentConfig.schedule_color_ba === 'string' 
          ? parseInt(currentConfig.schedule_color_ba, 10) 
          : currentConfig.schedule_color_ba;
        if (parsed !== currentBA) {
          updateData.schedule_color_ba = parsed;
          changedRaidTypes.push('BA');
        }
      }
    }
    
    if (ftColor) {
      const parsed = parseHexColor(ftColor);
      const lowerFT = ftColor.toLowerCase();
      if (lowerFT !== 'none' && lowerFT !== 'default' && parsed === null) {
        errors.push('FT color is invalid');
      } else {
        const currentFT = typeof currentConfig.schedule_color_ft === 'string' 
          ? parseInt(currentConfig.schedule_color_ft, 10) 
          : currentConfig.schedule_color_ft;
        if (parsed !== currentFT) {
          updateData.schedule_color_ft = parsed;
          changedRaidTypes.push('FT');
        }
      }
    }
    
    if (drsColor) {
      const parsed = parseHexColor(drsColor);
      const lowerDRS = drsColor.toLowerCase();
      if (lowerDRS !== 'none' && lowerDRS !== 'default' && parsed === null) {
        errors.push('DRS color is invalid');
      } else {
        const currentDRS = typeof currentConfig.schedule_color_drs === 'string' 
          ? parseInt(currentConfig.schedule_color_drs, 10) 
          : currentConfig.schedule_color_drs;
        if (parsed !== currentDRS) {
          updateData.schedule_color_drs = parsed;
          changedRaidTypes.push('DRS');
        }
      }
    }

    if (errors.length > 0) {
      await interaction.reply({
        content: `❌ **Invalid color format:**\n${errors.join('\n')}\n\nPlease use hex format: #RRGGBB or RRGGBB`,
        ephemeral: true
      });
      return;
    }

    if (Object.keys(updateData).length === 0) {
      await interaction.reply({
        content: '❌ No color changes provided.',
        ephemeral: true
      });
      return;
    }

    await encryptedDb.updateServerConfig(guildId, updateData);

    logger.info('Color settings updated', {
      guildId,
      colors: { ba: baColor, ft: ftColor, drs: drsColor }
    });

    const colorMessages = [];
    const showBA = baColor || baColor === '';
    const showFT = ftColor || ftColor === '';
    const showDRS = drsColor || drsColor === '';
    
    if (showBA) {
      colorMessages.push(`**BA:** ${baColor ? baColor : 'cleared'}`);
    }
    if (showFT) {
      colorMessages.push(`**FT:** ${ftColor ? ftColor : 'cleared'}`);
    }
    if (showDRS) {
      colorMessages.push(`**DRS:** ${drsColor ? drsColor : 'cleared'}`);
    }

    let successText = '✅ **Color settings saved!**\n\n';
    if (colorMessages.length > 0) {
      successText += colorMessages.join('\n') + '\n';
    } else {
      successText += 'All colors cleared (using default).\n';
    }
    successText += '\nSchedules are updating...';

    await interaction.reply({
      content: successText,
      ephemeral: true
    });

    try {
      if (changedRaidTypes.length > 0) {
        for (const raidType of changedRaidTypes) {
          await updateManager.regenerateSchedule(guildId, raidType);
        }
        
        await interaction.editReply({
          content: '✅ **Completed!** Schedules updated with new colors.'
        }).catch(() => {
        });
      } else {
        await interaction.editReply({
          content: '✅ **No changes detected.** Colors remain the same.'
        }).catch(() => {
        });
      }
      
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
  
  const lowerValue = hexColor.toLowerCase().trim();
  
  if (lowerValue === 'none') {
    return null;
  }
  
  if (lowerValue === 'default') {
    return -1;
  }
  
  let hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return null;
  }
  
  return parseInt(hex, 16);
}

module.exports = { handleConfigInteraction };
