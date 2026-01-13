const { ContainerBuilder, TextDisplayBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { getAllHostServers } = require('../config/hostServers');

const setupState = new Map();

async function handleSetupInteraction(interaction, services) {
  const customId = interaction.customId;

  if (customId === 'setup_select_raids') {
    await handleRaidTypeSelection(interaction, services);
  } else if (customId.startsWith('setup_select_channel_')) {
    const raidType = customId.split('_').pop().toUpperCase();
    await handleChannelSelection(interaction, services, raidType);
  } else if (customId.startsWith('setup_select_hosts_')) {
    const raidType = customId.split('_').pop().toUpperCase();
    await handleHostSelection(interaction, services, raidType);
  } else if (customId === 'setup_confirm') {
    await handleSetupConfirmation(interaction, services);
  } else if (customId === 'setup_cancel') {
    setupState.delete(interaction.user.id);
    
    const cancelContainer = new ContainerBuilder();
    
    cancelContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('❌ Setup cancelled.')
    );
    
    await interaction.update({
      components: [cancelContainer],
      flags: 64 | 32768
    });
  }
}

async function handleRaidTypeSelection(interaction, services) {
  const selectedTypes = interaction.values;
  
  const state = setupState.get(interaction.user.id) || {};
  state.selectedRaidTypes = selectedTypes;
  state.channels = {};
  state.hosts = {};
  setupState.set(interaction.user.id, state);

  await showChannelSelection(interaction, services, selectedTypes[0], selectedTypes);
}

async function showChannelSelection(interaction, services, currentRaidType, allRaidTypes) {
  const container = new ContainerBuilder();

  const headerText = 
    `## Setup: Select Channel for ${currentRaidType}\n\n` +
    `Choose the channel where ${currentRaidType} schedules will be posted.`;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(headerText)
  );

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`setup_select_channel_${currentRaidType.toLowerCase()}`)
    .setPlaceholder(`Select channel for ${currentRaidType} schedules`)
    .addChannelTypes(ChannelType.GuildText);

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(channelSelect)
  );

  await interaction.update({
    components: [container],
    flags: 64 | 32768
  });
}

async function handleChannelSelection(interaction, services, raidType) {
  const channelId = interaction.values[0];
  const state = setupState.get(interaction.user.id) || {};
  
  if (!state.channels) state.channels = {};
  state.channels[raidType] = channelId;
  setupState.set(interaction.user.id, state);

  await showHostSelection(interaction, services, raidType);
}

async function showHostSelection(interaction, services, raidType) {
  const hostServers = getAllHostServers();
  
  const container = new ContainerBuilder();

  const headerText = 
    `## Setup: Select Host Servers for ${raidType}\n\n` +
    `Choose which host servers' schedules to display.\n` +
    `You can select multiple servers.`;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(headerText)
  );

  const hostSelect = new StringSelectMenuBuilder()
    .setCustomId(`setup_select_hosts_${raidType.toLowerCase()}`)
    .setPlaceholder('Select host servers')
    .setMinValues(1)
    .setMaxValues(hostServers.length)
    .addOptions(
      hostServers.map(server => ({
        label: server,
        value: server,
        default: false
      }))
    );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(hostSelect)
  );

  await interaction.update({
    components: [container],
    flags: 64 | 32768
  });
}

async function handleHostSelection(interaction, services, raidType) {
  const selectedHosts = interaction.values;
  const state = setupState.get(interaction.user.id) || {};
  
  if (!state.hosts) state.hosts = {};
  state.hosts[raidType] = selectedHosts;
  setupState.set(interaction.user.id, state);

  const currentIndex = state.selectedRaidTypes.indexOf(raidType);
  const nextRaidType = state.selectedRaidTypes[currentIndex + 1];

  if (nextRaidType) {
    await showChannelSelection(interaction, services, nextRaidType, state.selectedRaidTypes);
  } else {
    await showSetupConfirmation(interaction, services);
  }
}

async function showSetupConfirmation(interaction, services) {
  const state = setupState.get(interaction.user.id) || {};
  
  const container = new ContainerBuilder();

  let confirmText = `## ✅ Setup Complete!\n\n**Configuration Summary:**\n\n`;
  
  for (const raidType of state.selectedRaidTypes) {
    const channel = interaction.guild.channels.cache.get(state.channels[raidType]);
    const hosts = state.hosts[raidType] || [];
    
    confirmText += `**${raidType}:**\n`;
    confirmText += `Channel: ${channel ? channel.toString() : 'Unknown'}\n`;
    confirmText += `Host Servers: ${hosts.join(', ')}\n\n`;
  }

  confirmText += `Schedules will automatically update every 60 seconds.`;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(confirmText)
  );

  const confirmButton = new ButtonBuilder()
    .setCustomId('setup_confirm')
    .setLabel('Save Configuration')
    .setStyle(ButtonStyle.Success);

  const cancelButton = new ButtonBuilder()
    .setCustomId('setup_cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(confirmButton, cancelButton)
  );

  await interaction.update({
    content: '',
    components: [container],
    flags: 64 | 32768
  });
}

async function handleSetupConfirmation(interaction, services) {
  const state = setupState.get(interaction.user.id);
  if (!state) {
    const container = new ContainerBuilder();
    
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('❌ Setup session expired. Please run `/setup` again.')
    );
    
    await interaction.update({
      components: [container],
      flags: 64 | 32768
    });
    return;
  }

  try {
    const { pool } = services;
    const guildId = interaction.guild.id;

    const configData = {
      guild_id: guildId,
      guild_name: interaction.guild.name,
      setup_complete: 1,
      auto_update: 1
    };

    for (const raidType of state.selectedRaidTypes) {
      const channelKey = `schedule_channel_${raidType.toLowerCase()}`;
      const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
      
      configData[channelKey] = state.channels[raidType];
      configData[hostsKey] = JSON.stringify(state.hosts[raidType]);
    }

    const fields = Object.keys(configData);
    const values = Object.values(configData);
    const placeholders = fields.map(() => '?').join(', ');
    const updates = fields.map(f => `${f} = ?`).join(', ');

    await pool.query(
      `INSERT INTO na_bot_server_configs (${fields.join(', ')}) 
       VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates}`,
      [...values, ...values]
    );

    await services.updateManager.forceUpdate(guildId);

    setupState.delete(interaction.user.id);

    const successContainer = new ContainerBuilder();
    
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('✅ **Setup complete!** Schedules are now being displayed and will update automatically every 60 seconds.')
    );
    
    await interaction.update({
      components: [successContainer],
      flags: 64 | 32768
    });

    logger.info('Setup completed', {
      guildId,
      raidTypes: state.selectedRaidTypes
    });

  } catch (error) {
    logger.error('Error saving setup', {
      error: error.message,
      guildId: interaction.guild.id
    });

    const errorContainer = new ContainerBuilder();
    
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('❌ An error occurred saving your configuration. Please try again.')
    );
    
    await interaction.update({
      components: [errorContainer],
      flags: 64 | 32768
    });
  }
}

module.exports = { handleSetupInteraction };
