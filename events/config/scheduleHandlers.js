const { ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const encryptedDb = require('../../config/encryptedDatabase');
const { buildConfigMenu } = require('../../utils/configMenuBuilder');
const { buildRaidConfigContainer } = require('./menuHandlers');
const serviceLocator = require('../../services/serviceLocator');

/**
 * Toggle auto-update setting
 */
async function toggleAutoUpdate(interaction) {
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

/**
 * Manually refresh all schedules for a guild
 */
async function refreshSchedules(interaction) {
  const guildId = interaction.guild.id;
  const updateManager = serviceLocator.get('updateManager');
  
  try {
    await interaction.deferUpdate();
    
    await updateManager.forceUpdate(guildId);
    
    const successContainer = new ContainerBuilder();
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('✅ Schedules refreshed successfully!')
    );
    
    await interaction.followUp({
      components: [successContainer],
      flags: 64 | 32768
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
      flags: 64 | 32768
    });
  }
}

/**
 * Regenerate schedule messages for a specific raid type
 */
async function regenerateRaidSchedule(interaction, raidType) {
  const guildId = interaction.guild.id;
  const updateManager = serviceLocator.get('updateManager');
  
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
    const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
    const scheduleChannelId = config[channelKey];
    const enabledHosts = config[hostsKey] || [];
    const isSameChannel = interaction.channelId === scheduleChannelId;

    if (isSameChannel) {
      await handleSameChannelRegenerate(interaction, updateManager, guildId, raidType, enabledHosts);
    } else {
      await handleDifferentChannelRegenerate(interaction, updateManager, guildId, raidType, enabledHosts);
    }

  } catch (error) {
    logger.error('Error regenerating raid schedule', {
      error: error.message,
      stack: error.stack,
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

/**
 * Handle regeneration when config menu is in the same channel as schedule
 * Since regenerating will delete/recreate messages in this channel, we need
 * to handle the interaction carefully to avoid editing deleted messages.
 */
async function handleSameChannelRegenerate(interaction, updateManager, guildId, raidType, enabledHosts) {
  // Use deferReply instead of deferUpdate since the original message might get deleted
  await interaction.deferReply({ flags: 64 });
  
  const result = await updateManager.regenerateSchedule(guildId, raidType);
  
  if (result.success) {
    logger.info('Raid schedule regenerated', {
      guildId,
      raidType,
      user: interaction.user.tag
    });

    // Show success then transition to config
    await interaction.editReply({
      content: `✅ ${raidType} schedule regenerated successfully!`
    });

    // After delay, show raid config container
    setTimeout(async () => {
      try {
        const container = buildRaidConfigContainer(raidType, enabledHosts);
        await interaction.editReply({
          content: null,
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
    await interaction.editReply({
      content: `❌ Error regenerating ${raidType} schedule: ${result.error}`
    });
  }
}

/**
 * Handle regeneration when config menu is in a different channel
 */
async function handleDifferentChannelRegenerate(interaction, updateManager, guildId, raidType, enabledHosts) {
  await interaction.deferUpdate();

  // Show building status
  const buildingContainer = buildRaidConfigContainer(raidType, enabledHosts, '*Building...*');
  await interaction.editReply({
    components: [buildingContainer]
  });

  const result = await updateManager.regenerateSchedule(guildId, raidType);

  if (result.success) {
    const successContainer = buildRaidConfigContainer(raidType, enabledHosts, '*✅ Success*');
    await interaction.editReply({
      components: [successContainer]
    });

    logger.info('Raid schedule regenerated', {
      guildId,
      raidType,
      user: interaction.user.tag
    });

    // Remove status after delay
    setTimeout(async () => {
      try {
        const finalContainer = buildRaidConfigContainer(raidType, enabledHosts);
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
    const errorContainer = buildRaidConfigContainer(raidType, enabledHosts, `*❌ Error: ${result.error}*`);
    await interaction.editReply({
      components: [errorContainer]
    });

    // Remove error status after delay
    setTimeout(async () => {
      try {
        const finalContainer = buildRaidConfigContainer(raidType, enabledHosts);
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

module.exports = {
  toggleAutoUpdate,
  refreshSchedules,
  regenerateRaidSchedule
};
