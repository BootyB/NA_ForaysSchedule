# NA Schedule Bot

A Discord bot that displays FFXIV NA datacenter raid schedules (Baldesion Arsenal, Forked Tower, Delubrum Reginae Savage) using Discord's components_v2 containers.

## Features

- Real-time schedule display from multiple host servers
- Server-specific configuration (choose which host servers to display)
- Automatic updates every 60 seconds with hash-based change detection
- Multi-server deployment support
- Whitelist system for controlled deployment

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Fill in your Discord bot token and database credentials

3. **Database Setup**
   - Ensure you have read access to the `nameOfChoice` table
   - Create bot configuration tables (see documentation)

4. **Deploy Commands**
   ```bash
   npm run deploy
   ```

5. **Start Bot**
   ```bash
   npm start
   ```

## Commands

- `/na_schedule` - Initial server configuration wizard (requires Manage Server permission). Subsequent usage after setup opens configuration UI.

## Requirements

- Node.js 18+
- Discord.js 14.14+
- MariaDB/MySQL database with `nameOfChoice` table utilizing posted run aggregator

## License

ISC
