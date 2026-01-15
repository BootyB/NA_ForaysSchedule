
const HOST_SERVERS = {
  'ABBA+': {
    guildId: '544997776992501761',
    icon: 'https://i.imgur.com/FkB1xxL.gif',
    inviteLink: 'https://discord.gg/abbaffxiv',
    emoji: { name: 'abba', id: '1461225954239053956' },
    channels: {
      'BA': '994728673133473812',
      'FT': '1377521610495361054',
      'DRS': '994802544662564904'
    },
    channelLinks: {
      'BA': 'https://discord.com/channels/544997776992501761/994728673133473812',
      'FT': 'https://discord.com/channels/544997776992501761/1377521610495361054',
      'DRS': 'https://discord.com/channels/544997776992501761/994802544662564904'
    }
  },
  'CAFE': {
    guildId: '750103971187654736',
    icon: 'https://i.gyazo.com/0857836cdbc89e27272fee33eaa77b43.webp',
    inviteLink: 'https://discord.gg/c-a-f-e',
    description: 'Join or host a Forays raid in Eureka, Bozja/Zadnor, or The Occult Crescent from FFXIV!',
    emoji: { name: 'cafe', id: '1461221312608469177' },
    channels: {
      'BA': '956367612659511406',
      'FT': '1377808695102279862',
      'DRS': '1167469922830536704'
    },
    channelLinks: {
      'BA': 'https://discord.com/channels/750103971187654736/956367612659511406',
      'FT': 'https://discord.com/channels/750103971187654736/1377808695102279862',
      'DRS': 'https://discord.com/channels/750103971187654736/1167469922830536704'
    }
  },
  'Field Op Enjoyers': {
    guildId: '1028110201968132116',
    icon: 'https://i.imgur.com/bDHWroZ.png',
    inviteLink: 'https://discord.gg/foexiv',
    emoji: { name: 'foe', id: '1461221556146409586' },
    channels: {
      'BA': '1029102392601497682',
      'FT': '1350184451979743362',
      'DRS': '1029102476156215307'
    },
    channelLinks: {
      'BA': 'https://discord.com/channels/1028110201968132116/1029102392601497682',
      'FT': 'https://discord.com/channels/1028110201968132116/1350184451979743362',
      'DRS': 'https://discord.com/channels/1028110201968132116/1029102476156215307'
    }
  },
  'The Help Lines': {
    guildId: '578708223092326430',
    icon: 'https://i.imgur.com/FLO7Kyw.png',
    inviteLink: 'https://discord.gg/thehelplines',
    emoji: { name: 'helplines', id: '1461221510390878309' },
    channels: {
      'BA': '958829775445721168',
      'FT': '1378164424254292030',
      'DRS': '1029196207278538842'
    },
    channelLinks: {
      'BA': 'https://discord.com/channels/578708223092326430/958829775445721168',
      'FT': 'https://discord.com/channels/578708223092326430/1378164424254292030',
      'DRS': 'https://discord.com/channels/578708223092326430/1029196207278538842'
    }
  },
  'Content Achievers': {
    guildId: '642628091205779466',
    icon: 'https://i.imgur.com/vQGujLG.png',
    inviteLink: 'https://discord.gg/FJFxr2U',
    emoji: { name: 'contentachivers', id: '1461221434876756020' },
    channels: {
      'BA': '940148143310385182',
      'DRS': '1002244518743117924'
    },
    channelLinks: {
      'BA': 'https://discord.com/channels/642628091205779466/940148143310385182',
      'DRS': 'https://discord.com/channels/642628091205779466/1002244518743117924'
    }
  },
  'Lego Steppers': {
    guildId: '818478021563908116',
    icon: 'https://i.imgur.com/i2TAf3t.png',
    inviteLink: 'https://discord.gg/YKP76AsMw8',
    emoji: { name: 'lego', id: '1461226465709391975' },
    channels: {
      'DRS': '819233418579017738'
    },
    channelLinks: {
      'DRS': 'https://discord.com/channels/818478021563908116/819233418579017738'
    }
  },
  'Dynamis Field Operations': {
    guildId: '1208039470486519818',
    icon: 'https://i.imgur.com/DLG3thV.png',
    inviteLink: 'https://discord.gg/vjwYEeubeN',
    emoji: { name: 'DFO', id: '1461221488123314438' },
    channels: {
      'BA': '1351065536041324637',
      'FT': '1208220062326984755',
      'DRS': '1208220062326984755'
    },
    channelLinks: {
      'BA': 'https://discord.com/channels/1208039470486519818/1208220062326984755',
      'FT': 'https://discord.com/channels/1208039470486519818/1208220062326984755',
      'DRS': 'https://discord.com/channels/1208039470486519818/1208220062326984755'
    }
  },
  'CEM': {
    guildId: '550702475112480769',
    icon: 'https://i.gyazo.com/351a842939675d6045232a2f8e96edf8.gif',
    inviteLink: 'https://discord.gg/cem',
    emoji: { name: 'cem', id: '1461221409484181555', animated: true },
    channels: {
      'FT': '1371469177860395039',
      'DRS': '803636640941342730'
    },
    channelLinks: {
      'FT': 'https://discord.com/channels/550702475112480769/1371469177860395039',
      'DRS': 'https://discord.com/channels/550702475112480769/803636640941342730'
    }
  }
};

function getServerIcon(serverName) {
  return HOST_SERVERS[serverName]?.icon || 'https://cdn.discordapp.com/embed/avatars/0.png';
}

function getInviteLink(serverName) {
  return HOST_SERVERS[serverName]?.inviteLink || '#';
}

function getChannelLink(serverName, raidType) {
  const link = HOST_SERVERS[serverName]?.channelLinks?.[raidType];
  return link ? `[${serverName}](${link})` : `**${serverName}**`;
}

function getAllHostServers() {
  return Object.keys(HOST_SERVERS);
}

function getServerEmoji(serverName) {
  return HOST_SERVERS[serverName]?.emoji || null;
}

function getGuildId(serverName) {
  return HOST_SERVERS[serverName]?.guildId || null;
}

async function getGuildStats(serverName, client) {
  const guildId = getGuildId(serverName);
  if (!guildId || !client) return null;
  
  const inviteLink = HOST_SERVERS[serverName]?.inviteLink;
  if (!inviteLink) return null;
  
  try {
    const inviteCode = inviteLink.split('/').pop();
    const invite = await client.fetchInvite(inviteCode, { withCounts: true, withExpiration: true });
    
    if (!invite.guild) return null;
    
    // Start with invite data (has description)
    const stats = {
      createdAt: invite.guild.createdAt || null,
      description: invite.guild.description || HOST_SERVERS[serverName]?.description || null,
      memberCount: invite.approximateMemberCount || null,
      fromInvite: true
    };
    
    // If bot is in the guild, use exact member count instead of approximate
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      stats.memberCount = guild.memberCount;
      stats.fromInvite = false;
    }
    
    return stats;
  } catch (error) {
    return null;
  }
}

function isWhitelistedHost(serverName) {
  return HOST_SERVERS.hasOwnProperty(serverName);
}

module.exports = {
  HOST_SERVERS,
  getServerIcon,
  getInviteLink,
  getChannelLink,
  getAllHostServers,
  getServerEmoji,
  isWhitelistedHost,
  getGuildId,
  getGuildStats
};
