
const RAID_TYPES = {
  BA: {
    name: 'Baldesion Arsenal',
    emoji: { id: '1460936708538499202', name: 'ozma' },
    color: 0xED4245,
    runTypes: ['Standard', 'Fresh', 'Learning', 'Reclear', 'Meme', 'Normal', 'Frag']
  },
  FT: {
    name: 'Forked Tower',
    emoji: { id: '1460937119559192647', name: 'demoncube' },
    color: 0xED4245,
    runTypes: ['Fresh/AnyProg', 'Dead Stars', 'Bridges', 'Marble Dragon', 'Magitaur', 'Clear', 'Reclear']
  },
  DRS: {
    name: 'Delubrum Reginae Savage',
    emoji: { id: '1460943074724155599', name: 'queen' },
    color: 0xED4245,
    runTypes: ['Fresh Clear', 'Trinity Seeker', 'The Queen', 'Reclear']
  }
};

const RUN_TYPE_PRIORITY = {
  'BA': [
    'Fresh',
    'Learning',
    'Standard',
    'Normal',
    'Reclear',
    'Non-Standard',
    'Frag',
    'Meme'
  ],
  'FT': [
    'Fresh/AnyProg',
    'Dead Stars',
    'Bridges',
    'Marble Dragon',
    'Magitaur',
    'Clear',
    'Reclear'
  ],
  'DRS': [
    'Fresh Clear',
    'Trinity Seeker',
    'The Queen',
    'Reclear'
  ]
};

const UPDATE_INTERVAL = 60000;

const SCHEDULE_DAYS_AHEAD = 90;

const GOOGLE_CALENDAR_IDS = {
  'BA': 'da548ac3301f1a3652f668b98b53255e1cde7aa39001c71bcb2ad063bbb4958a%40group.calendar.google.com',
  'FT': '00cbef49f62776b3905e37b154616b5a1025e944b9346c294c7c621df1e26e63%40group.calendar.google.com',
  'DRS': '0df4417fcd1e22b355fdbee9873df5216e3e708d953777f08861cfd3688be39c%40group.calendar.google.com'
};

const MAX_COMPONENTS_PER_CONTAINER = 40;
const MAX_TEXT_LENGTH = 4000;

// Banner images for raid type headers
const BANNER_IMAGES = {
  BA: 'attachment://ba_opening.avif',
  DRS: 'attachment://drs_opening.avif',
  FT: 'attachment://ft_opening.avif'
};

// Spacer image URL for container sections
const SPACER_IMAGE_URL = 'https://i.imgur.com/ZfizSs7.png';

// Concurrency limit for batch updates
const CONCURRENCY_LIMIT = parseInt(process.env.CONCURRENCY_LIMIT) || 3;

// Rate limiter configuration
const RATE_LIMITER = {
  COMMAND_COOLDOWN: 3000,       // 3 seconds between commands
  INTERACTION_COOLDOWN: 1000,   // 1 second between interactions
  REQUEST_WINDOW: 60000,        // 1 minute window
  MAX_REQUESTS_PER_WINDOW: 30,  // Max 30 requests per minute
  CLEANUP_INTERVAL: 300000      // Cleanup every 5 minutes
};

// Default health check port (can be overridden via HEALTH_PORT env var)
const DEFAULT_HEALTH_PORT = 3000;

module.exports = {
  RAID_TYPES,
  RUN_TYPE_PRIORITY,
  UPDATE_INTERVAL,
  SCHEDULE_DAYS_AHEAD,
  GOOGLE_CALENDAR_IDS,
  MAX_COMPONENTS_PER_CONTAINER,
  MAX_TEXT_LENGTH,
  BANNER_IMAGES,
  SPACER_IMAGE_URL,
  CONCURRENCY_LIMIT,
  RATE_LIMITER,
  DEFAULT_HEALTH_PORT
};
