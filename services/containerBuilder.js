const { ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const { MAX_COMPONENTS_PER_CONTAINER, SPACER_IMAGE_URL } = require('../config/constants');
const { getServerIcon, getInviteLink, getChannelLink, getGuildStats } = require('../config/hostServers');
const { hashCodeSchedules } = require('../utils/hashCode');
const logger = require('../utils/logger');
const { 
  getRaidTypeName, 
  getRaidTypeColor, 
  getRaidTypeEmoji,
  getRunTypePriority,
  getBannerImage
} = require('../utils/raidTypes');

// Format emoji object to Discord string format
function formatEmoji(emoji) {
  if (typeof emoji === 'string') return emoji;
  if (emoji && emoji.id) {
    return emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
  }
  return '';
}

/**
 * Set container accent color with proper handling for custom, default, and null values
 * @param {ContainerBuilder} container - The container to set color on
 * @param {number|null|undefined} customColor - Custom color value
 * @param {number} defaultColor - Default color to use if customColor is undefined
 */
function setContainerColor(container, customColor, defaultColor) {
  if (customColor === undefined) {
    container.setAccentColor(defaultColor);
  } else if (customColor === null) {
    container.setAccentColor(null);
  } else {
    container.setAccentColor(customColor);
  }
}

class ScheduleContainerBuilder {
  constructor(client = null) {
    this.componentCount = 0;
    this.client = client;
  }

  buildOverviewContainer(raidType, customColor = undefined) {
    const container = new ContainerBuilder();
    
    // Use helper function for consistent color handling
    setContainerColor(container, customColor, getRaidTypeColor(raidType));

    const calendarLinks = {
      BA: {
        gcal: 'https://calendar.google.com/calendar/u/2?cid=ZGE1NDhhYzMzMDFmMWEzNjUyZjY2OGI5OGI1MzI1NWUxY2RlN2FhMzkwMDFjNzFiY2IyYWQwNjNiYmI0OTU4YUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t',
        ical: 'https://calendar.google.com/calendar/ical/da548ac3301f1a3652f668b98b53255e1cde7aa39001c71bcb2ad063bbb4958a%40group.calendar.google.com/public/basic.ics',
        utc: 'https://calendar.google.com/calendar/embed?src=da548ac3301f1a3652f668b98b53255e1cde7aa39001c71bcb2ad063bbb4958a%40group.calendar.google.com',
        eastern: 'https://calendar.google.com/calendar/embed?src=da548ac3301f1a3652f668b98b53255e1cde7aa39001c71bcb2ad063bbb4958a%40group.calendar.google.com&ctz=America%2FNew_York',
        pacific: 'https://calendar.google.com/calendar/embed?src=da548ac3301f1a3652f668b98b53255e1cde7aa39001c71bcb2ad063bbb4958a%40group.calendar.google.com&ctz=America%2FLos_Angeles',
        australia: 'https://calendar.google.com/calendar/embed?src=da548ac3301f1a3652f668b98b53255e1cde7aa39001c71bcb2ad063bbb4958a%40group.calendar.google.com&ctz=Antarctica%2FMacquarie'
      },
      FT: {
        gcal: 'https://calendar.google.com/calendar/u/2?cid=MDBjYmVmNDlmNjI3NzZiMzkwNWUzN2IxNTQ2MTZiNWExMDI1ZTk0NGI5MzQ2YzI5NGM3YzYyMWRmMWUyNmU2M0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t',
        ical: 'https://calendar.google.com/calendar/ical/00cbef49f62776b3905e37b154616b5a1025e944b9346c294c7c621df1e26e63%40group.calendar.google.com/public/basic.ics',
        utc: 'https://calendar.google.com/calendar/u/2/embed?src=00cbef49f62776b3905e37b154616b5a1025e944b9346c294c7c621df1e26e63@group.calendar.google.com',
        eastern: 'https://calendar.google.com/calendar/embed?src=00cbef49f62776b3905e37b154616b5a1025e944b9346c294c7c621df1e26e63%40group.calendar.google.com&ctz=America%2FNew_York',
        pacific: 'https://calendar.google.com/calendar/embed?src=00cbef49f62776b3905e37b154616b5a1025e944b9346c294c7c621df1e26e63%40group.calendar.google.com&ctz=America%2FLos_Angeles',
        australia: 'https://calendar.google.com/calendar/embed?src=00cbef49f62776b3905e37b154616b5a1025e944b9346c294c7c621df1e26e63%40group.calendar.google.com&ctz=Antarctica%2FMacquarie'
      },
      DRS: {
        gcal: 'https://calendar.google.com/calendar/u/2?cid=MGRmNDQxN2ZjZDFlMjJiMzU1ZmRiZWU5ODczZGY1MjE2ZTNlNzA4ZDk1Mzc3N2YwODg2MWNmZDM2ODhiZTM5Y0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t',
        ical: 'https://calendar.google.com/calendar/ical/0df4417fcd1e22b355fdbee9873df5216e3e708d953777f08861cfd3688be39c%40group.calendar.google.com/public/basic.ics',
        utc: 'https://calendar.google.com/calendar/embed?src=0df4417fcd1e22b355fdbee9873df5216e3e708d953777f08861cfd3688be39c%40group.calendar.google.com',
        eastern: 'https://calendar.google.com/calendar/embed?src=0df4417fcd1e22b355fdbee9873df5216e3e708d953777f08861cfd3688be39c%40group.calendar.google.com&ctz=America%2FNew_York',
        pacific: 'https://calendar.google.com/calendar/embed?src=0df4417fcd1e22b355fdbee9873df5216e3e708d953777f08861cfd3688be39c%40group.calendar.google.com&ctz=America%2FLos_Angeles',
        australia: 'https://calendar.google.com/calendar/embed?src=0df4417fcd1e22b355fdbee9873df5216e3e708d953777f08861cfd3688be39c%40group.calendar.google.com&ctz=Antarctica%2FMacquarie'
      }
    };

    const links = calendarLinks[raidType];

    // Add banner image if available for this raid type
    const bannerImage = getBannerImage(raidType);
    if (bannerImage) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(bannerImage)
        )
      );
    }
    
    // Build header content using raid type info
    const raidName = getRaidTypeName(raidType);
    let headerContent = '';
    if (bannerImage) {
      headerContent = `### Multi-Server *${raidName}* Schedule for North American and Materia Data Centers\n`;
    } else {
      const emoji = getRaidTypeEmoji(raidType);
      headerContent = `## ${formatEmoji(emoji)} ${raidName} Schedule\n### Multi-Server ${raidName} Schedule for North American and Materia Data Centers\n`;
    }
    
    const calendarSection = 
      `[Add to Google Calendar](${links.gcal}) | [iCal](${links.ical})`;

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(headerContent + calendarSection)
    );

    const timezoneSelect = new StringSelectMenuBuilder()
      .setCustomId(`timezone_select_${raidType.toLowerCase()}`)
      .setPlaceholder('View calendar in your timezone')
      .addOptions([
        { label: '🌍 UTC', value: 'UTC', description: 'Coordinated Universal Time' },
        { label: '🇺🇸 US Eastern', value: 'America/New_York', description: 'Eastern Time (US & Canada)' },
        { label: '🇺🇸 US Central', value: 'America/Chicago', description: 'Central Time (US & Canada)' },
        { label: '🇺🇸 US Mountain', value: 'America/Denver', description: 'Mountain Time (US & Canada)' },
        { label: '🇺🇸 US Pacific', value: 'America/Los_Angeles', description: 'Pacific Time (US & Canada)' },
        { label: '🇺🇸 US Alaska', value: 'America/Anchorage', description: 'Alaska Time' },
        { label: '🇺🇸 US Hawaii', value: 'Pacific/Honolulu', description: 'Hawaii Time' },
        { label: '🇬🇧 UK/Ireland', value: 'Europe/London', description: 'London, Dublin' },
        { label: '🇪🇺 Central Europe', value: 'Europe/Paris', description: 'Paris, Berlin, Rome' },
        { label: '🇯🇵 Japan', value: 'Asia/Tokyo', description: 'Japan Standard Time' },
        { label: '🇦🇺 Australia Eastern', value: 'Australia/Sydney', description: 'Sydney, Melbourne' },
        { label: '🇦🇺 Australia Central', value: 'Australia/Adelaide', description: 'Adelaide' },
        { label: '🇦🇺 Australia Western', value: 'Australia/Perth', description: 'Perth' },
        { label: '🇳🇿 New Zealand', value: 'Pacific/Auckland', description: 'Auckland' },
        { label: '🇨🇦 Eastern Canada', value: 'America/Toronto', description: 'Toronto, Montreal' },
        { label: '🇨🇦 Western Canada', value: 'America/Vancouver', description: 'Vancouver' },
        { label: '🇧🇷 Brazil', value: 'America/Sao_Paulo', description: 'São Paulo, Rio de Janeiro' },
        { label: '🇲🇽 Mexico City', value: 'America/Mexico_City', description: 'Mexico City' },
        { label: '🇸🇬 Singapore', value: 'Asia/Singapore', description: 'Singapore, Malaysia' },
        { label: '🇰🇷 South Korea', value: 'Asia/Seoul', description: 'Korea Standard Time' },
        { label: '🇨🇳 China', value: 'Asia/Shanghai', description: 'China Standard Time' },
        { label: '🇮🇳 India', value: 'Asia/Kolkata', description: 'India Standard Time' },
        { label: '🇿🇦 South Africa', value: 'Africa/Johannesburg', description: 'South Africa Standard Time' },
        { label: '🇦🇪 UAE', value: 'Asia/Dubai', description: 'Dubai, Abu Dhabi' },
        { label: '🇷🇺 Moscow', value: 'Europe/Moscow', description: 'Moscow Standard Time' }
      ]);

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(timezoneSelect)
    );

    const infoButton = new ButtonBuilder()
      .setCustomId(`schedule_info_${raidType.toLowerCase()}`)
      .setLabel('ℹ️ About This Schedule')
      .setStyle(ButtonStyle.Primary);

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(infoButton)
    );

    logger.debug('Built overview container', { raidType });
    return container;
  }

  async buildScheduleContainers(groupedRuns, raidType, customColor = undefined) {
    const containers = [];

    if (!groupedRuns || Object.keys(groupedRuns).length === 0) {
      containers.push({
        container: this.buildEmptyContainer(raidType, customColor),
        serverName: '__empty__',
        hash: this.generateServerHash('__empty__', [])
      });
      return containers;
    }

    let isFirst = true;
    for (const serverName in groupedRuns) {
      const runs = groupedRuns[serverName];
      const container = await this.buildServerContainer(serverName, runs, raidType, isFirst, customColor);
      const hash = this.generateServerHash(serverName, runs);
      containers.push({
        container,
        serverName,
        hash
      });
      isFirst = false;
    }

    logger.debug('Built schedule containers', {
      raidType,
      containerCount: containers.length,
      servers: Object.keys(groupedRuns).length
    });

    return containers;
  }

  async buildServerContainer(serverName, runs, raidType, isFirst = false, customColor = undefined) {
    const container = new ContainerBuilder();
    
    // Use helper function for consistent color handling
    setContainerColor(container, customColor, getRaidTypeColor(raidType));

    const serverIcon = getServerIcon(serverName);
    let headerContent = `## ${getChannelLink(serverName, raidType)}\n`;
    
    const guildStats = await getGuildStats(serverName, this.client);
    if (guildStats) {
      if (guildStats.description) {
        headerContent += `-# *${guildStats.description}*\n`;
      }
      if (guildStats.memberCount) {
        const memberText = guildStats.fromInvite 
          ? `~${guildStats.memberCount.toLocaleString()} members` 
          : `${guildStats.memberCount.toLocaleString()} members`;
        headerContent += `-# 👥 ${memberText}`;
      }
      if (guildStats.createdAt) {
        const createdTimestamp = Math.round(guildStats.createdAt.getTime() / 1000);
        headerContent += `\n-# • Created <t:${createdTimestamp}:D>`;
      }
    }

    const serverHeaderSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(headerContent)
      )
      .setThumbnailAccessory(
        new ThumbnailBuilder()
          .setURL(serverIcon)
          .setDescription(`${serverName} icon`)
      );

    container.addSectionComponents(serverHeaderSection);

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const runsByType = {};
    for (const run of runs) {
      const runType = run.Type || 'Unknown';
      if (!runsByType[runType]) {
        runsByType[runType] = [];
      }
      runsByType[runType].push(run);
    }

    const priorityOrder = getRunTypePriority(raidType);
    const sortedRunTypes = Object.keys(runsByType).sort((a, b) => {
      const indexA = priorityOrder.indexOf(a);
      const indexB = priorityOrder.indexOf(b);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      return a.localeCompare(b);
    });

    for (const runType of sortedRunTypes) {
      const typeRuns = runsByType[runType];
      const runText = this.formatRunGroup(runType, typeRuns);
      
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(runText)
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const inviteLink = getInviteLink(serverName);
    if (inviteLink !== '#') {
      const inviteButton = new ButtonBuilder()
        .setLabel(`Join ${serverName}`)
        .setURL(inviteLink)
        .setStyle(ButtonStyle.Link);
      
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(inviteButton)
      );
    }

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(SPACER_IMAGE_URL)
      )
    );

    return container;
  }

  formatRunGroup(runType, runs) {
    let text = `### ${runType}\n`;
    
    for (const run of runs) {
      const timestamp = Math.round(run.Start / 1000);
      const timeStr = `<t:${timestamp}:F>\n`;
      
      text += `● ${timeStr}`;
      
      if (run.RunDC) {
        text += ` Data Center: ${run.RunDC}\n`;
      }
      
      if (run.referenceLink) {
        text += `[Run Info](${run.referenceLink})`;
      }
      
      text += '\n';
    }
    
    return text;
  }

  buildEmptyContainer(raidType, customColor = undefined) {
    const container = new ContainerBuilder();
    
    // Use helper function for consistent color handling
    setContainerColor(container, customColor, getRaidTypeColor(raidType));
    
    const emoji = getRaidTypeEmoji(raidType);
    const raidName = getRaidTypeName(raidType);
    const emptyText = 
      `# ${formatEmoji(emoji)} ${raidName} Runs\n\n` +
      `No runs currently scheduled for the next 3 months.\n\n` +
      `*This schedule updates automatically every 60 seconds.*`;
    
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(emptyText)
    );
    
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('https://i.imgur.com/ZfizSs7.png')
      )
    );
    
    return container;
  }

  generateContentHash(groupedRuns, raidType) {
    let contentString = `${raidType}|`;
    
    for (const serverName in groupedRuns) {
      contentString += `${serverName}:`;
      const runs = groupedRuns[serverName];
      
      for (const run of runs) {
        contentString += `${run.ID}|${run.Type}|${run.Start}|`;
      }
    }
    
    return hashCodeSchedules(contentString);
  }

  /**
   * Generate a hash for a single server's runs
   * Used for per-container change detection
   */
  generateServerHash(serverName, runs) {
    let contentString = `${serverName}:`;
    for (const run of runs) {
      contentString += `${run.ID}|${run.Type}|${run.Start}|`;
    }
    return hashCodeSchedules(contentString);
  }

  validateComponentCount(container) {
    return true;
  }
}

module.exports = ScheduleContainerBuilder;
