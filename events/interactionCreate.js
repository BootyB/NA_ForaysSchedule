const { MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const { canConfigureBot } = require('../utils/permissions');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, services) {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction, services);
    }
    
    else if (interaction.isButton()) {
      await handleButtonInteraction(interaction, services);
    }
    
    else if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
      await handleSelectMenuInteraction(interaction, services);
    }
    
    else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction, services);
    }
  }
};

async function handleSlashCommand(interaction, services) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn('Unknown command', { commandName: interaction.commandName });
    return;
  }

  try {
    if (['setup', 'configure'].includes(interaction.commandName)) {
      if (!canConfigureBot(interaction.member)) {
        await interaction.reply({
          content: '❌ You need **Manage Server** permission to use this command.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    }

    await command.execute(interaction, services);

    logger.info('Command executed', {
      command: interaction.commandName,
      user: interaction.user.tag,
      guild: interaction.guild?.name
    });

  } catch (error) {
    logger.error('Error executing command', {
      error: error.message,
      stack: error.stack,
      command: interaction.commandName,
      user: interaction.user.tag
    });

    const errorMessage = {
      content: '❌ There was an error executing this command.',
      flags: MessageFlags.Ephemeral
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

/**
 * Handle button interactions
 */
async function handleButtonInteraction(interaction, services) {
  const customId = interaction.customId;

  try {
    if (customId.startsWith('setup_')) {
      const { handleSetupInteraction } = require('./setupInteractions');
      await handleSetupInteraction(interaction, services);
    }
    
    else if (customId.startsWith('config_')) {
      const { handleConfigInteraction } = require('./configInteractions');
      await handleConfigInteraction(interaction, services);
    }
    
    else if (customId.startsWith('schedule_info_')) {
      await handleScheduleInfoButton(interaction);
    }
    
    else if (customId.startsWith('timezone_select_')) {
      await handleTimezoneSelect(interaction);
    }
    
    else {
      logger.warn('Unknown button interaction', { customId });
      await interaction.reply({
        content: '❌ This button interaction is not recognized.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    logger.error('Error handling button', {
      error: error.message,
      customId
    });

    await interaction.reply({
      content: '❌ An error occurred processing this button.',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}

async function handleSelectMenuInteraction(interaction, services) {
  const customId = interaction.customId;

  try {
    if (customId.startsWith('setup_')) {
      const { handleSetupInteraction } = require('./setupInteractions');
      await handleSetupInteraction(interaction, services);
    }
    
    else if (customId.startsWith('config_')) {
      const { handleConfigInteraction } = require('./configInteractions');
      await handleConfigInteraction(interaction, services);
    }
    
    else if (customId.startsWith('timezone_select_')) {
      await handleTimezoneSelect(interaction);
    }
    
    else {
      logger.warn('Unknown select menu interaction', { customId });
      await interaction.reply({
        content: '❌ This menu interaction is not recognized.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    logger.error('Error handling select menu', {
      error: error.message,
      customId
    });

    await interaction.reply({
      content: '❌ An error occurred processing this menu.',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}

async function handleScheduleInfoButton(interaction) {
  const infoMessage = 
    '**About This Schedule**\n\n' +
    '• This schedule is generated automatically based on published announcements from participating Discord servers. Depending on a server\'s policies, some scheduled runs may not be visible.\n\n' +
    '• Cancellations are tracked via the original post being deleted.\n\n' +
    '• Edits to run details are tracked via the original post being edited.\n\n' +
    '• For the most accurate and up-to-date information, always verify the schedule with the host server.\n\n' +
    '• All times are displayed local to your device.\n\n' +
    '*Contact <@137711026673025025> (bootybuttcheeks) for any questions or corrections.*';

  await interaction.reply({
    content: infoMessage,
    flags: MessageFlags.Ephemeral
  });

  logger.debug('Displayed schedule info', { 
    user: interaction.user.tag,
    guild: interaction.guild?.name 
  });
}

async function handleTimezoneSelect(interaction) {
  const selectedTimezone = interaction.values[0];
  const raidType = interaction.customId.split('_')[2].toUpperCase();
  
  const calendarIds = {
    BA: 'da548ac3301f1a3652f668b98b53255e1cde7aa39001c71bcb2ad063bbb4958a%40group.calendar.google.com',
    FT: '00cbef49f62776b3905e37b154616b5a1025e944b9346c294c7c621df1e26e63%40group.calendar.google.com',
    DRS: '0df4417fcd1e22b355fdbee9873df5216e3e708d953777f08861cfd3688be39c%40group.calendar.google.com'
  };
  
  const calendarId = calendarIds[raidType];
  const calendarUrl = `https://calendar.google.com/calendar/embed?src=${calendarId}&ctz=${encodeURIComponent(selectedTimezone)}`;
  
  const timezoneOption = interaction.component.options.find(opt => opt.value === selectedTimezone);
  const timezoneName = timezoneOption?.label || selectedTimezone;
  
  await interaction.reply({
    content: `📅 **${raidType} Calendar - ${timezoneName}**\n\n[Click here to view the calendar](${calendarUrl})`,
    flags: MessageFlags.Ephemeral
  });

  await interaction.message.edit({
    components: interaction.message.components
  }).catch(() => {
  });

  logger.debug('Generated timezone calendar link', { 
    user: interaction.user.tag,
    raidType,
    timezone: selectedTimezone
  });
}

async function handleModalSubmit(interaction, services) {
  const customId = interaction.customId;

  if (!canConfigureBot(interaction.member)) {
    await interaction.reply({
      content: '❌ You need **Manage Server** permission to configure the bot.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    if (customId === 'config_color_modal') {
      const { handleConfigInteraction } = require('./configInteractions');
      await handleConfigInteraction(interaction, services);
    }
  } catch (error) {
    logger.error('Error handling modal submit', {
      error: error.message,
      stack: error.stack,
      customId,
      user: interaction.user.tag,
      guild: interaction.guild?.name
    });

    try {
      const response = {
        content: '❌ An error occurred processing your submission. Please try again.',
        flags: MessageFlags.Ephemeral
      };
      
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    } catch (replyError) {
      logger.error('Could not send error message', { error: replyError.message });
    }
  }
}
