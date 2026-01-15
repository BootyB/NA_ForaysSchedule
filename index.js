const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = require('./config/database');
const logger = require('./utils/logger');

const ScheduleManager = require('./services/scheduleManager');
const ScheduleContainerBuilder = require('./services/containerBuilder');
const UpdateManager = require('./services/updateManager');
const WhitelistManager = require('./services/whitelistManager');
const TimerService = require('./services/timerService');
const HealthCheck = require('./services/healthCheck');

const requiredEnvVars = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'BOT_OWNER_ID',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    logger.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ],
  presence: {
    status: 'invisible'
  },
  rest: {
    timeout: 15000,
    retries: 3
  }
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands', 'slash');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    logger.info(`Loaded command: ${command.data.name}`);
  } else {
    logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`);
  }
}

let services = {
  pool: pool,
  scheduleManager: null,
  containerBuilder: null,
  updateManager: null,
  whitelistManager: null,
  timerService: null,
  healthCheck: null
};

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (!event.name) {
    continue;
  }
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, services));
  } else {
    client.on(event.name, (...args) => event.execute(...args, services));
  }
  
  logger.info(`Loaded event: ${event.name}`);
}

client.once('clientReady', async (client) => {
  services.scheduleManager = new ScheduleManager(pool);
  services.containerBuilder = new ScheduleContainerBuilder();
  services.whitelistManager = new WhitelistManager(pool);
  services.updateManager = new UpdateManager(pool, client);
  services.timerService = new TimerService(services.updateManager);
  services.healthCheck = new HealthCheck(client, pool);
  
  if (process.env.HEALTH_PORT) {
    services.healthCheck.start();
  }
  
  logger.info('All services initialized');
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection', {
    error: error.message,
    stack: error.stack
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  if (error.message && error.message.includes('Opening handshake has timed out')) {
    logger.warn('WebSocket timeout detected - discord.js will attempt to reconnect');
    return;
  }
  
  logger.error('Fatal error - shutting down in 5 seconds');
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});

client.on('error', (error) => {
  logger.error('Discord client error', {
    error: error.message,
    stack: error.stack
  });
});

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  
  if (services.timerService) {
    services.timerService.stop();
  }
  
  if (services.healthCheck) {
    services.healthCheck.stop();
  }
  
  if (services.updateManager) {
    await services.updateManager.saveState();
  }
  
  try {
    await pool.end();
    logger.info('Database connection pool closed');
  } catch (err) {
    logger.error('Error closing database pool', { error: err.message });
  }
  
  client.destroy();
  logger.info('Bot shutdown complete');
  
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
