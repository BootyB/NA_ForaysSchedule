// SPDX-FileCopyrightText: 2024-2026 BootyB
// SPDX-License-Identifier: GPL-3.0-or-later

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const encryptedDb = require('../../config/encryptedDatabase');
const { buildConfigMenu } = require('../../utils/configMenuBuilder');
const serviceLocator = require('../../services/serviceLocator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('na-schedule')
    .setDescription('Manage NA datacenter raid schedule configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(interaction) {
    const whitelistManager = serviceLocator.get('whitelistManager');
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
      await showSetupWizard(interaction);
    } else {
      await showConfigurationMenu(interaction, existingConfig);
    }
  }
};

async function showSetupWizard(interaction) {
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
        emoji: { id: '1460936708538499202', name: 'ozma' }
      },
      {
        label: 'Delubrum Reginae Savage (DRS)',
        description: 'Display DRS schedules',
        value: 'DRS',
        emoji: { id: '1460943074724155599', name: 'queen' }
      },
      {
        label: 'Forked Tower (FT)',
        description: 'Display FT schedules',
        value: 'FT',
        emoji: { id: '1460937119559192647', name: 'demoncube' }
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

async function showConfigurationMenu(interaction, config) {
  const container = buildConfigMenu(config, interaction.guild);

  await interaction.reply({
    components: [container],
    flags: 64 | 32768
  });

  logger.info('Configuration menu opened', {
    guildId: interaction.guild.id,
    user: interaction.user.tag
  });
}
