const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const encryptedDb = require('../../config/encryptedDatabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('na-schedule')
    .setDescription('Manage NA datacenter raid schedule configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(interaction, services) {
    const { whitelistManager } = services;
    const guildId = interaction.guild.id;

    const isWhitelisted = await whitelistManager.isGuildWhitelisted(guildId);
    
    if (!isWhitelisted) {
      await interaction.reply({
        content: 
          '❌ **This server is not whitelisted.**\n\n' +
          'This bot is currently in private beta. Please contact the bot owner to request access.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const existingConfig = await encryptedDb.getServerConfig(guildId);

    if (!existingConfig || !existingConfig.setup_complete) {
      await showSetupWizard(interaction, services);
    } else {
      await showConfigurationMenu(interaction, services, existingConfig);
    }
  }
};

async function showSetupWizard(interaction, services) {
  const container = new ContainerBuilder();

  const headerText = 
    `## 🎉 Welcome to NA Schedule Bot Setup!\n\n` +
    `This wizard will help you configure schedule displays for your server.\n\n` +
    `**Step 1: Select Raid Types**\n` +
    `Choose which raid schedules you want to display:\n` +
    `● **BA** - Baldesion Arsenal\n` +
    `● **FT** - Forked Tower\n` +
    `● **DRS** - Delubrum Reginae Savage\n\n` +
    `You can select one or more raid types.`;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(headerText)
  );

  const raidSelect = new StringSelectMenuBuilder()
    .setCustomId('setup_select_raids')
    .setPlaceholder('Select raid types to display')
    .setMinValues(1)
    .setMaxValues(3)
    .addOptions([
      {
        label: 'Baldesion Arsenal (BA)',
        description: 'Display BA schedules',
        value: 'BA',
        emoji: '🏛️'
      },
      {
        label: 'Forked Tower (FT)',
        description: 'Display FT schedules',
        value: 'FT',
        emoji: '🗼'
      },
      {
        label: 'Delubrum Reginae Savage (DRS)',
        description: 'Display DRS schedules',
        value: 'DRS',
        emoji: '⚔️'
      }
    ]);

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(raidSelect)
  );

  await interaction.reply({
    components: [container],
    flags: 64 | 32768
  });

  logger.info('Setup wizard started', {
    guildId: interaction.guild.id,
    user: interaction.user.tag
  });
}

async function showConfigurationMenu(interaction, services, config) {
  const container = new ContainerBuilder();

  let statusText = `## ⚙️ Server Configuration\n\n`;
  
  const configuredRaids = [];
  for (const raidType of ['BA', 'FT', 'DRS']) {
    const channelKey = `schedule_channel_${raidType.toLowerCase()}`;
    const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
    
    if (config[channelKey] && config[hostsKey]) {
      configuredRaids.push(raidType);
      const channel = interaction.guild.channels.cache.get(config[channelKey]);
      const hosts = config[hostsKey]; // Already decrypted and parsed by encryptedDb
      
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

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(toggleButton, refreshButton)
  );

  const colorButton = new ButtonBuilder()
    .setCustomId('config_color_settings')
    .setLabel('🎨 Color Settings')
    .setStyle(ButtonStyle.Secondary);

  const resetButton = new ButtonBuilder()
    .setCustomId('config_reset_confirmation')
    .setLabel('🗑️ Reset Config')
    .setStyle(ButtonStyle.Danger);

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(colorButton, resetButton)
  );

  await interaction.reply({
    components: [container],
    flags: 64 | 32768
  });

  logger.info('Configuration menu opened', {
    guildId: interaction.guild.id,
    user: interaction.user.tag
  });
}
