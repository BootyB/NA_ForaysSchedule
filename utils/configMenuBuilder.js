const { ContainerBuilder, TextDisplayBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

function buildConfigMenu(config, guild) {
  const container = new ContainerBuilder();

  let statusText = `## ⚙️ Server Configuration\n\n`;
  
  const configuredRaids = [];
  for (const raidType of ['BA', 'DRS', 'FT']) {
    const channelKey = `schedule_channel_${raidType.toLowerCase()}`;
    const hostsKey = `enabled_hosts_${raidType.toLowerCase()}`;
    
    if (config[channelKey] && config[hostsKey]) {
      configuredRaids.push(raidType);
      const channel = guild.channels.cache.get(config[channelKey]);
      const hosts = config[hostsKey];
      
      statusText += `**${raidType}:**\n`;
      statusText += `Channel: ${channel ? channel.toString() : 'Not found'}\n`;
      statusText += `Servers: ${hosts.join(', ')}\n\n`;
    } else {
      statusText += `**${raidType}:** ❌ Not configured\n\n`;
    }
  }

  statusText += `**Auto-Update:** ${config.auto_update ? '✅ Enabled' : '❌ Disabled'}\n\n`;
  
  const formatColor = (colorValue) => {
    if (colorValue === null) return 'None';
    if (colorValue === undefined) return 'Default (Red)';
    
    const numValue = typeof colorValue === 'string' ? parseInt(colorValue, 10) : colorValue;
    
    if (numValue === -1) return 'Default (Red)';
    
    if (typeof numValue === 'number' && !isNaN(numValue) && numValue >= 0) {
      return '#' + numValue.toString(16).padStart(6, '0').toUpperCase();
    }
    
    return 'Unknown';
  };
  
  statusText += `**Colors:** BA: ${formatColor(config.schedule_color_ba)} | FT: ${formatColor(config.schedule_color_ft)} | DRS: ${formatColor(config.schedule_color_drs)}\n\n`;
  statusText += `Select a raid type below to add or modify its settings.`;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(statusText)
  );

  const allRaidTypes = ['BA', 'DRS', 'FT'];
  const raidEmojiMap = {
    'BA': { id: '1460936708538499202', name: 'ozma' },
    'FT': { id: '1460937119559192647', name: 'demoncube' },
    'DRS': { id: '1460943074724155599', name: 'frame_000_delay0' }
  };
  
  const raidSelect = new StringSelectMenuBuilder()
    .setCustomId('config_select_raid')
    .setPlaceholder('Select raid type to configure')
    .addOptions(
      allRaidTypes.map(raidType => ({
        label: `${raidType}${configuredRaids.includes(raidType) ? ' ✓' : ''}`,
        description: configuredRaids.includes(raidType) ? 'Currently configured' : 'Not yet configured',
        value: raidType,
        emoji: raidEmojiMap[raidType]
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

  return container;
}

module.exports = { buildConfigMenu };
