const { ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const { RAID_TYPES, MAX_COMPONENTS_PER_CONTAINER, RUN_TYPE_PRIORITY } = require('../config/constants');
const { getServerIcon, getInviteLink, getChannelLink, getGuildStats } = require('../config/hostServers');
const { hashCodeSchedules } = require('../utils/hashCode');
const logger = require('../utils/logger');

class ScheduleContainerBuilder {
  constructor(client = null) {
    this.componentCount = 0;
    this.client = client;
  }

  buildOverviewContainer(raidType, customColor = null) {
    const container = new ContainerBuilder();
    const raidInfo = RAID_TYPES[raidType];
    
    container.setAccentColor(customColor || raidInfo.color);

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

    // Banner images - use attachment:// for local files
    // Only BA and DRS have banners currently, FT will use text title
    const bannerImages = {
      BA: 'attachment://ba_opening.avif',
      DRS: 'attachment://drs_opening.avif',
      // FT: 'attachment://ft_opening.avif'  // Uncomment when file is added
    };

    let headerContent = '';
    
    if (raidType === 'BA') {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(bannerImages.BA)
        )
      );
      headerContent = `### Multi-Server Baldesion Arsenal Schedule for North American and Materia Data Centers\n`;
    } else if (raidType === 'DRS') {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(bannerImages.DRS)
        )
      );
      headerContent = `### Multi-Server Delubrum Reginae Savage Schedule for North American and Materia Data Centers\n`;
    } else if (raidType === 'FT') {
      // FT uses text title until banner is added
      headerContent = `## ${raidInfo.emoji} ${raidInfo.name} Schedule\n### Multi-Server Forked Tower Schedule for North American and Materia Data Centers\n`;
    } else {
      headerContent = `## ${raidInfo.emoji} ${raidInfo.name} Schedule\n### Multi-Server ${raidInfo.name} Schedule for North American and Materia Data Centers\n`;
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

  async buildScheduleContainers(groupedRuns, raidType, customColor = null) {
    const containers = [];
    const raidInfo = RAID_TYPES[raidType];

    if (!groupedRuns || Object.keys(groupedRuns).length === 0) {
      containers.push(this.buildEmptyContainer(raidType, customColor));
      return containers;
    }

    let isFirst = true;
    for (const serverName in groupedRuns) {
      const runs = groupedRuns[serverName];
      const container = await this.buildServerContainer(serverName, runs, raidType, isFirst, customColor);
      containers.push(container);
      isFirst = false;
    }

    logger.info('Built schedule containers', {
      raidType,
      containerCount: containers.length,
      servers: Object.keys(groupedRuns).length
    });

    return containers;
  }

  async buildServerContainer(serverName, runs, raidType, isFirst = false, customColor = null) {
    const container = new ContainerBuilder();
    const raidInfo = RAID_TYPES[raidType];
    
    container.setAccentColor(customColor || raidInfo.color);

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

    const priorityOrder = RUN_TYPE_PRIORITY[raidType] || [];
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
        new MediaGalleryItemBuilder().setURL('https://i.imgur.com/ZfizSs7.png')
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

  buildEmptyContainer(raidType, customColor = null) {
    const container = new ContainerBuilder();
    const raidInfo = RAID_TYPES[raidType];
    
    container.setAccentColor(customColor || raidInfo.color);
    
    const emptyText = 
      `# ${raidInfo.emoji} ${raidInfo.name} Runs\n\n` +
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

  validateComponentCount(container) {
    return true;
  }
}

module.exports = ScheduleContainerBuilder;
