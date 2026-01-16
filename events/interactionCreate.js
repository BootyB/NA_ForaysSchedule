const { MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const { canConfigureBot } = require('../utils/permissions');
const { GOOGLE_CALENDAR_IDS } = require('../config/constants');
const rateLimiter = require('../utils/rateLimiter');

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
    // Rate limiting check
    const rateLimitCheck = rateLimiter.checkCommandCooldown(interaction.user.id, interaction.commandName);
    if (!rateLimitCheck.allowed) {
      await interaction.reply({
        content: `⏱️ Please wait ${rateLimitCheck.timeLeft} second(s) before using this command again.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

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
      user: interaction.user.tag,
      guild: interaction.guild?.name
    });

    let errorContent = '❌ There was an error executing this command.';
    
    // Provide more specific error messages based on error type
    if (error.message.includes('Missing Permissions')) {
      errorContent = '❌ The bot lacks the required permissions to perform this action. Please ensure the bot has **View Channel**, **Send Messages**, and **Embed Links** permissions.';
    } else if (error.message.includes('Unknown Channel')) {
      errorContent = '❌ The configured channel no longer exists. Please reconfigure using `/na-schedule`.';
    } else if (error.message.includes('Unknown Message')) {
      errorContent = '❌ The schedule message was deleted. The bot will recreate it on the next update.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      errorContent = '❌ Connection timeout. The bot is having trouble connecting to services. Please try again in a moment.';
    } else if (error.message.includes('database') || error.message.includes('Database')) {
      errorContent = '❌ Database error occurred. Please try again or contact the bot administrator if the issue persists.';
    }

    const errorMessage = {
      content: errorContent,
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
    // Rate limiting check
    const rateLimitCheck = rateLimiter.checkInteractionCooldown(interaction.user.id, 'button');
    if (!rateLimitCheck.allowed) {
      await interaction.reply({
        content: '⏱️ You\'re clicking too fast! Please slow down.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (customId.startsWith('setup_')) {
      const { handleSetupInteraction } = require('./setupInteractions');
      await handleSetupInteraction(interaction, services);
    }
    
    else if (customId.startsWith('config_')) {
      const { handleConfigInteraction } = require('./config');
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
      stack: error.stack,
      customId,
      userId: interaction.user.id
    });

    const errorContent = error.message.includes('Unknown interaction') 
      ? '❌ This interaction has expired. Please run the command again.'
      : '❌ An error occurred processing this button. Please try again.';

    await interaction.reply({
      content: errorContent,
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}

async function handleSelectMenuInteraction(interaction, services) {
  const customId = interaction.customId;

  try {
    // Rate limiting check
    const rateLimitCheck = rateLimiter.checkInteractionCooldown(interaction.user.id, 'selectmenu');
    if (!rateLimitCheck.allowed) {
      await interaction.reply({
        content: '⏱️ Please wait a moment before making another selection.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (customId.startsWith('setup_')) {
      const { handleSetupInteraction } = require('./setupInteractions');
      await handleSetupInteraction(interaction, services);
    }
    
    else if (customId.startsWith('config_')) {
      const { handleConfigInteraction } = require('./config');
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
      stack: error.stack,
      customId,
      userId: interaction.user.id
    });

    const errorContent = error.message.includes('Unknown interaction')
      ? '❌ This interaction has expired. Please run the command again.'
      : '❌ An error occurred processing this menu. Please try again.';

    await interaction.reply({
      content: errorContent,
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
    `-# Contact <@${process.env.BOT_OWNER_ID}> for any questions or corrections.`;

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
  
  const calendarId = GOOGLE_CALENDAR_IDS[raidType];
  if (!calendarId) {
    await interaction.reply({
      content: '❌ Calendar not available for this raid type.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  const calendarUrl = `https://calendar.google.com/calendar/embed?src=${calendarId}&ctz=${encodeURIComponent(selectedTimezone)}`;
  
  const timezoneOption = interaction.component.options.find(opt => opt.value === selectedTimezone);
  const timezoneName = timezoneOption?.label || selectedTimezone;
  
  await interaction.reply({
    content: `📅 **${raidType} Calendar - ${timezoneName}**\n\n[Click here to view the calendar](${calendarUrl})`,
    flags: MessageFlags.Ephemeral
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
      const { handleConfigInteraction } = require('./config');
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
