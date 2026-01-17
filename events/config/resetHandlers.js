const { ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const encryptedDb = require('../../config/encryptedDatabase');
const serviceLocator = require('../../services/serviceLocator');

/**
 * Show reset confirmation dialog
 */
async function showResetConfirmation(interaction) {
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

/**
 * Execute configuration reset - deletes all messages and config
 */
async function resetConfiguration(interaction) {
  const guildId = interaction.guild.id;

  try {
    await interaction.deferUpdate();
    
    const config = await encryptedDb.getServerConfig(guildId);

    if (config) {
      await deleteAllScheduleMessages(interaction.guild, config);
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

/**
 * Delete all schedule messages for all raid types
 */
async function deleteAllScheduleMessages(guild, config) {
  for (const raidType of ['BA', 'DRS', 'FT']) {
    const channelKey = `schedule_channel_${raidType.toLowerCase()}`;
    const channelId = config[channelKey];
    
    if (!channelId) continue;

    try {
      const channel = await guild.channels.fetch(channelId);
      
      // Delete overview message
      const overviewKey = `schedule_overview_${raidType.toLowerCase()}`;
      const overviewId = config[overviewKey];
      if (overviewId) {
        await deleteMessage(channel, overviewId, 'overview', raidType, guild.id);
      }
      
      // Delete schedule messages
      const messageKey = `schedule_message_${raidType.toLowerCase()}`;
      const messageIds = config[messageKey];
      if (messageIds) {
        const parsedIds = Array.isArray(messageIds) ? messageIds : JSON.parse(messageIds);
        for (const msgId of parsedIds) {
          await deleteMessage(channel, msgId, 'schedule', raidType, guild.id);
        }
      }
    } catch (err) {
      logger.debug('Could not access channel', { channelId });
    }
  }
}

/**
 * Delete a single message with logging
 */
async function deleteMessage(channel, messageId, messageType, raidType, guildId) {
  try {
    const message = await channel.messages.fetch(messageId);
    await message.delete();
    logger.debug(`Deleted ${messageType} message`, { guildId, raidType, messageId });
  } catch (err) {
    logger.debug(`Could not delete ${messageType} message`, { messageId });
  }
}

module.exports = {
  showResetConfirmation,
  resetConfiguration
};
