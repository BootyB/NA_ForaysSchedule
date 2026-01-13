
const RAID_TYPES = {
  BA: {
    name: 'Baldesion Arsenal',
    emoji: '🏛️',
    color: 0x2add77,
    runTypes: ['Standard', 'Fresh', 'Learning', 'Reclear', 'Meme', 'Normal', 'Frag']
  },
  FT: {
    name: 'Forked Tower',
    emoji: '🗼',
    color: 0xfd0061,
    runTypes: ['Fresh/AnyProg', 'Dead Stars', 'Bridges', 'Marble Dragon', 'Magitaur', 'Clear', 'Reclear']
  },
  DRS: {
    name: 'Delubrum Reginae Savage',
    emoji: '⚔️',
    color: 0x8B0000,
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

const MAX_COMPONENTS_PER_CONTAINER = 40;
const MAX_TEXT_LENGTH = 4000;

module.exports = {
  RAID_TYPES,
  RUN_TYPE_PRIORITY,
  UPDATE_INTERVAL,
  SCHEDULE_DAYS_AHEAD,
  MAX_COMPONENTS_PER_CONTAINER,
  MAX_TEXT_LENGTH
};
