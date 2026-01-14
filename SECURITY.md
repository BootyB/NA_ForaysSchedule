# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of NA Schedule Bot seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **Email**: Contact the bot owner directly (Discord ID in environment variables)
2. **Private Discord Message**: Send a DM to the bot owner on Discord

Please include the following information:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies based on severity (critical issues prioritized)

### What to Expect

After submitting a vulnerability report:

1. We will acknowledge receipt of your report
2. We will investigate and determine the severity
3. We will develop and test a fix
4. We will release a security update
5. We will credit you for the discovery (unless you prefer to remain anonymous)

## Security Best Practices

When deploying this bot, follow these security guidelines:

### Environment Variables

- **Never commit `.env` files** to version control
- Use strong, unique passwords for database credentials
- Rotate Discord bot tokens periodically
- Limit database user permissions to minimum required

### Database Security

- Use dedicated database user for the bot
- Grant only necessary permissions:
  - `SELECT` on source schedule table
  - `SELECT`, `INSERT`, `UPDATE`, `DELETE` on bot configuration tables
- Enable SSL/TLS for database connections in production
- Keep MariaDB/MySQL updated

### Data Encryption

The bot implements AES-256-GCM encryption for sensitive data:

- **Encryption Key Management**:
  - Generate a secure 32-byte (64 hex character) encryption key
  - Store the key in `.env` file as `ENCRYPTION_KEY`
  - **NEVER commit the encryption key to version control**
  - Rotate encryption keys periodically (requires data re-encryption)
  - Use different keys for development and production environments

- **Generate Encryption Key**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- **Encrypted Data**:
  - Guild IDs and names
  - Channel IDs and message IDs
  - Host server selections
  - Other configuration data

- **Key Security**:
  - Keep encryption key secure and backed up safely
  - Losing the key means permanent data loss
  - Use secure key storage solutions in production (e.g., AWS Secrets Manager, HashiCorp Vault)
  - Limit access to encryption keys to authorized personnel only

- **Migration**: Use the provided migration scripts (If needed) to:
  - Expand database columns for encrypted data
  - Encrypt existing plaintext data
  - Verify encryption integrity

### Server Security

- Run the bot with a dedicated, non-privileged system user
- Use a process manager (PM2, systemd) for automatic restarts
- Enable firewall rules to restrict access
- Keep Node.js and dependencies updated regularly
- Review logs regularly for suspicious activity

### Discord Permissions

The bot requires minimal Discord permissions:

- **Required**: View Channels, Send Messages, Embed Links
- **Commands**: Manage Guild (for configuration commands only)

Avoid granting Administrator permission to the bot.

### Rate Limiting

The bot includes built-in rate limiting:

- Command cooldown: 3 seconds per user
- Interaction cooldown: 1 second per user
- Request limit: 30 requests per minute per user

Do not disable or modify these limits without careful consideration.

### Access Control Management

**Whitelist System** (Beta/Private Mode):

- Regularly review whitelisted guilds
- Remove inactive servers from whitelist
- Audit who has access to add servers to whitelist
- Use provided scripts in `scripts/` directory for management
- Monitor whitelist changes in logs

**Blacklist System** (Production Mode):

- Review blacklisted guilds regularly
- Document reasons for blacklisting
- Use `scripts/manage-blacklist.js` for secure management
- Encrypted guild identifiers protect privacy
- Set `is_active=0` to unblock guilds

### Health Monitoring

- **Health Check Endpoint**: Optional HTTP health check on port 3000 (configurable)
- **Database Connectivity**: Monitor database connection status
- **Process Management**: Use PM2 or systemd for automatic recovery
- **Log Monitoring**: Review logs regularly for errors and warnings
- **Uptime Monitoring**: Integrate with external monitoring services

### Encrypted State Management

The bot maintains encrypted schedule state:

- State file: `data/scheduleState.encrypted.json`
- Contains cached schedule data for change detection
- Encrypted using AES-256-GCM
- Automatically managed by the bot
- Backup state files securely if needed

## Security Audit Checklist

Regularly review these security measures:

- [ ] Encryption key is stored securely and not in version control
- [ ] Database credentials use strong, unique passwords
- [ ] Database connections use SSL/TLS in production
- [ ] Bot runs as non-privileged system user
- [ ] Firewall rules restrict database access
- [ ] Discord bot token is rotated periodically
- [ ] Node.js and dependencies are up to date
- [ ] Rate limiting is enabled and configured properly
- [ ] Logs are monitored for suspicious activity
- [ ] Whitelist/blacklist is reviewed monthly
- [ ] Backup strategy includes encrypted data
- [ ] Health monitoring is configured
- [ ] `.env` file has restricted permissions (600)

## Data Protection

### Backup and Recovery

- **Database Backups**: Include encrypted data in regular backups
- **Encryption Key Backup**: Store encryption key separately from database backups
- **Recovery Testing**: Periodically test restoration procedures
- **Key Rotation**: Have a documented process for key rotation

### Data Retention

- Configuration data is retained while bot is in server
- Schedule state is cached temporarily for change detection
- Logs are rotated and retained according to policy
- Deleted configurations should be removed from backups

### Monitoring

- Enable appropriate log levels (`info` for production)
- Set up log rotation to prevent disk space issues
- Monitor health check endpoints
- Set up alerts for critical errors
- Review error logs weekly

### Updates

- Subscribe to GitHub notifications for this repository
- Review changelogs before updating
- Test updates in a development environment first
- Keep all npm dependencies updated (`npm audit` regularly)

## Known Security Considerations

### Database Name in Queries

The bot requires `DB_NAME` and `DB_TABLE_NAME` environment variables. Ensure these are:

- Set by trusted administrators only
- Not exposed in logs or error messages
- Validated before use

### User Input Validation

All user inputs are validated before database operations:

- Color hex codes are validated via regex
- Guild IDs and channel IDs are validated
- Host server selections are checked against whitelist
- SQL injection is prevented via parameterized queries

### State File

The `scheduleState.encrypted.json` file contains:

- Encrypted schedule data
- Content hashes for change detection
- Guild and message associations

⚠️ **Important**: This file contains encrypted sensitive data and should:
- Be backed up securely
- Never be committed to version control
- Be protected with appropriate file permissions
- Only be accessible by the bot process

## Security Checklist for Deployment

Before deploying to production:

- [ ] All environment variables configured (including ENCRYPTION_KEY)
- [ ] Encryption key generated and stored securely
- [ ] Database migrations applied successfully
- [ ] Database user has minimal required permissions
- [ ] `.env` file is in `.gitignore`
- [ ] Bot token is kept secret and secure
- [ ] Server firewall is configured
- [ ] Process manager is configured for restarts
- [ ] Log rotation is enabled
- [ ] Health check endpoint is accessible (if needed)
- [ ] Whitelist/blacklist is properly configured
- [ ] Encrypted state directory exists with proper permissions
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Bot runs as non-root user
- [ ] SSL/TLS enabled for database connections (if remote)

## Vulnerability Disclosure Policy

We believe in responsible disclosure. If you discover a vulnerability:

1. Give us reasonable time to fix it before public disclosure
2. Do not exploit the vulnerability beyond what is necessary to prove it exists
3. Do not access, modify, or delete data that doesn't belong to you
4. Do not perform actions that could harm service availability

We will:

1. Respond to your report promptly
2. Keep you informed of our progress
3. Credit you for the discovery (if desired)
4. Not pursue legal action for good-faith security research

## Additional Resources

- [Discord Developer Documentation](https://discord.com/developers/docs)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contact

For security concerns, contact the bot owner through:

- Discord (see BOT_OWNER_ID in your environment configuration)
- GitHub Issues (for non-security bugs only)

Thank you for helping keep NA Schedule Bot and its users safe!
