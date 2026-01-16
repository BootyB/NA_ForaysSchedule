# Refactoring Guide

This document tracks areas of the codebase that could benefit from refactoring, including redundancies, dead code, and other improvements.

**Last Updated:** January 16, 2026  
**Analysis Performed:** January 16, 2026

---

## 🎯 Refactoring Priorities

### High Priority
- Items that affect performance, security, or stability
- Code that is actively causing bugs or maintenance issues

### Medium Priority
- Redundant code that increases maintenance burden
- Opportunities for better code organization

### Low Priority
- Code style improvements
- Minor optimizations

---

## 📋 Categories

### 1. Code Redundancy

**Description:** Duplicate or similar code that could be consolidated into shared utilities or services.

| Location | Description | Priority | Notes |
|----------|-------------|----------|-------|
| `encryptedDatabase.js` | Repeated pattern of fetching all configs, looping, and decrypting to find a match (lines 97-110, 172-188, 223-237, 243-260) | High | Create a generic `findEncryptedRecord()` helper function |
| `encryptedDatabase.js` | `encryptConfigFields()` and `decryptConfigFields()` have repetitive field handling for BA/FT/DRS | Medium | Use a loop over raid types array instead of hardcoded field names |
| `containerBuilder.js` | Calendar links object (lines 36-68) duplicates data from `GOOGLE_CALENDAR_IDS` in constants.js | Medium | Generate links dynamically from the constants |
| `setupInteractions.js` / `configInteractions.js` | Similar container building patterns for permission errors | Low | Extract to shared utility function |
| `containerBuilder.js` | Color setting logic (`if customColor === undefined/null/else`) repeated 3+ times | Low | Extract to helper function `setContainerColor(container, customColor, defaultColor)` |

---

### 2. Dead Code

**Description:** Unused functions, variables, imports, or files that can be safely removed.

| Location | Description | Priority | Notes |
|----------|-------------|----------|-------|
| `containerBuilder.js:336` | `validateComponentCount()` always returns `true` - appears unused | Medium | Verify if intended or remove |
| `scheduleManager.js` | `sortRunTypes()` method defined but sorting logic duplicated in `containerBuilder.js:238-252` | Medium | Use the ScheduleManager method instead of duplicating |
| `whitelistManager.js` | `isHostWhitelisted()` and `getAllWhitelistedHosts()` query `na_bot_whitelisted_hosts` table but fall back to `hostServers.js` - unclear if table is used | Medium | Clarify if DB whitelist is needed or remove |
| `config/constants.js` | `GOOGLE_CALENDAR_IDS` appears unused (calendar links hardcoded in containerBuilder.js) | Low | Either use the constant or remove it |
| `utils/rateLimiter.js` | Module exports singleton but imports may create multiple instances | Low | Verify singleton pattern is working |

---

### 3. Architectural Improvements

**Description:** Structural changes that would improve maintainability, scalability, or code organization.

| Area | Current State | Proposed Improvement | Priority | Notes |
|------|---------------|---------------------|----------|-------|
| Encryption Layer | `encryptedDatabase.js` is 324 lines with mixed concerns | Split into: encryption helpers, query builders, repository classes | High | Improves testability |
| Event Handlers | ~~`configInteractions.js` is 1090 lines~~, `setupInteractions.js` is 437 lines | Break into smaller, focused handlers per feature | ~~High~~ Medium | ✅ configInteractions.js split into `events/config/` modules |
| Host Server Config | `hostServers.js` has hardcoded server data | Consider moving to database or config file (JSON/YAML) | Medium | Easier updates without code changes |
| Services Initialization | Services passed as object through all event handlers | Consider dependency injection container or service locator pattern | Medium | Cleaner architecture |
| Raid Type Handling | Raid types (BA, FT, DRS) hardcoded throughout | Create a RaidType enum/class with associated methods | Medium | Reduces string comparisons |

---

### 4. Database & State Management

**Description:** Improvements to database queries, schema, or state management logic.

| Location | Issue | Improvement | Priority | Notes |
|----------|-------|-------------|----------|-------|
| `encryptedDatabase.js` | Every lookup requires `SELECT *` then loop through all records to decrypt and find match | High | Consider indexed lookup column or decrypt on DB side |
| `encryptedDatabase.js:97` | `getServerConfig()` fetches ALL configs just to find one | High | Add hashed guild_id column for indexing |
| `updateManager.js:287` | `forceUpdate()` deletes state then immediately calls `updateSchedule()` | Medium | Could be combined into single operation |
| `encryptedStateManager.js` | File-based state storage | Medium | Consider Redis/memory cache for better performance |
| `database.js` | Pool connection test on module load with `process.exit(1)` on failure | Medium | Let calling code handle connection failures gracefully |

---

### 5. Error Handling & Logging

**Description:** Areas where error handling could be improved or logging could be more consistent.

| Location | Current State | Improvement | Priority | Notes |
|----------|---------------|-------------|----------|-------|
| `encryptedDatabase.js` | Silent `continue` in catch blocks when decryption fails | High | Log decryption failures for debugging |
| `database.js` | Uses `console.log/error` instead of logger | Medium | Use winston logger for consistency |
| `encryption.js:67` | `decryptJSON` catches error but only logs partial data | Medium | Add more context to error logs |
| `hostServers.js:168` | `getGuildStats()` silently returns null on error | Low | Consider logging errors |
| Multiple files | Inconsistent error message formats | Low | Standardize error message structure |

---

### 6. Configuration & Constants

**Description:** Hardcoded values, configuration that could be centralized, or environment-specific settings.

| Location | Issue | Improvement | Priority | Notes |
|----------|-------|-------------|----------|-------|
| `containerBuilder.js:72-76` | Banner image filenames hardcoded | Medium | Move to constants.js |
| `containerBuilder.js:279` | Spacer image URL hardcoded (`https://i.imgur.com/ZfizSs7.png`) | Medium | Move to constants or config |
| `updateManager.js:304` | Concurrency limit (3) hardcoded | Low | Move to constants/env var |
| `rateLimiter.js` | Cooldown values hardcoded (3000ms, 1000ms, etc.) | Low | Move to constants |
| `healthCheck.js:9` | Default port 3000 hardcoded | Low | Already uses env var, just document default |

---

### 7. Performance Optimizations

**Description:** Code that could be optimized for better performance.

| Location | Issue | Optimization | Priority | Impact |
|----------|-------|--------------|----------|--------|
| `encryptedDatabase.js` | O(n) lookup for every guild operation | Add indexed/hashed lookup column | High | Major improvement for large datasets |
| `hostServers.js:152-180` | `getGuildStats()` makes API call for every server container | Cache results with TTL | Medium | Reduces Discord API calls |
| `updateManager.js:88-92` | Duplicate null checks for `enabledHosts` | Combine conditions | Low | Minor cleanup |
| `containerBuilder.js` | Multiple object spreads and iterations | Pre-compute where possible | Low | Minimal impact |

---

### 8. Code Complexity

**Description:** Functions or modules that are too complex and could be broken down or simplified.

| Location | Complexity Issue | Proposed Solution | Priority | Notes |
|----------|------------------|-------------------|----------|-------|
| ~~`configInteractions.js`~~ | ~~1090 lines, 15+ functions~~ | ~~Split into ConfigRaidHandler, ConfigHostHandler, ConfigColorHandler, etc.~~ | ~~High~~ | ✅ **DONE** - Split into `events/config/` with 5 focused modules |
| `updateManager.js:61-198` | `updateSchedule()` is ~140 lines with deep nesting | Extract: `createOverviewMessage()`, `updateContainerMessages()`, `cleanupOldMessages()` | Medium | Improve readability |
| `setupInteractions.js:88-176` | `handleChannelSelection()` has complex permission checking | Extract permission check to `utils/permissions.js` | Medium | Reusable logic |
| `encryptedDatabase.js:27-59` | `encryptConfigFields()` repetitive field mapping | Use Object.entries() with field type mapping | Medium | Reduce repetition |

---

### 9. Dependencies & Imports

**Description:** Unused dependencies, outdated packages, or import organization issues.

| Package/Import | Issue | Action | Priority | Notes |
|----------------|-------|--------|----------|-------|
| `luxon` | Imported in scheduleManager but Discord timestamps used instead | Low | Verify if luxon is needed anywhere |
| `containerBuilder.js` | Large destructuring from discord.js (11 imports) | Low | Consider if all are used |
| ~~`LabelBuilder`~~ | ~~Imported in configInteractions.js but not used~~ | ~~Low~~ | ✅ Actually used in colorHandlers.js for modal |

---

### 10. Testing Gaps

**Description:** Areas of code that lack proper testing or could benefit from better test coverage.

| Component | Current Coverage | Needed Tests | Priority | Notes |
|-----------|------------------|--------------|----------|-------|
| All | No test files found | Add test framework (Jest/Mocha) | High | Critical for maintainability |
| `encryption.js` | None | Unit tests for encrypt/decrypt edge cases | High | Security-critical code |
| `encryptedDatabase.js` | None | Integration tests for DB operations | High | Core functionality |
| `scheduleManager.js` | None | Unit tests for query building, data grouping | Medium | Business logic |
| `validators.js` | None | Unit tests for validation functions | Medium | Easy to test, high value |
| `rateLimiter.js` | None | Unit tests for cooldown logic | Medium | Edge cases important |

---

## 🔍 Analysis Checklist

Use this checklist when reviewing code for refactoring opportunities:

### General Code Quality
- [x] Check for duplicate code patterns *(Found significant duplication in encryptedDatabase.js)*
- [x] Identify unused variables and functions *(Found validateComponentCount(), sortRunTypes duplication)*
- [x] Look for overly complex functions (>50 lines) *(configInteractions.js, updateSchedule())*
- [ ] Review comment quality and necessity
- [x] Check for inconsistent naming conventions *(Generally consistent)*

### Architecture & Structure
- [x] Review file organization and module boundaries *(Event handlers need splitting)*
- [ ] Check for circular dependencies
- [x] Identify tightly coupled components *(encryption tied to database layer)*
- [x] Look for missing abstractions *(Raid type abstraction needed)*
- [x] Review separation of concerns *(encryptedDatabase.js mixes concerns)*

### Performance
- [x] Identify N+1 query problems *(encryptedDatabase.js full-table scans)*
- [x] Check for unnecessary database calls *(Every lookup fetches all records)*
- [ ] Look for memory leaks or inefficient data structures
- [x] Review async/await usage *(Generally good)*
- [ ] Check for blocking operations

### Security & Best Practices
- [x] Review error handling patterns *(Silent failures in encryption)*
- [x] Check for exposed secrets or credentials *(Properly using env vars)*
- [x] Review input validation *(validators.js exists but could have more coverage)*
- [x] Check encryption/decryption usage *(Working but error logging needed)*
- [x] Review permission checks *(Implemented in permissions.js)*

### Dependencies
- [ ] Check package.json for unused dependencies *(Run `npm prune`)*
- [ ] Review dependency versions for updates
- [x] Look for duplicate functionality across packages *(luxon may be unused)*
- [ ] Check for security vulnerabilities *(Run `npm audit`)*

---

## 📝 Refactoring Workflow

1. **Identify** - Document the issue in the appropriate category above
2. **Prioritize** - Assign priority based on impact and effort
3. **Plan** - Create a task/issue for the refactoring work
4. **Test** - Ensure adequate test coverage before refactoring
5. **Implement** - Make the changes incrementally
6. **Review** - Code review and testing
7. **Document** - Update relevant documentation
8. **Close** - Mark as complete and remove from this guide

---

## 🚀 Quick Wins

Track small refactoring tasks that can be completed quickly (< 1 hour):

- [x] ~~Remove unused `LabelBuilder` import from configInteractions.js~~ (Actually used)
- [ ] Replace `console.log/error` in database.js with logger
- [ ] Add logging to silent catch blocks in encryptedDatabase.js
- [ ] Move hardcoded spacer image URL to constants.js
- [ ] Remove or implement `validateComponentCount()` in containerBuilder.js
- [ ] Combine duplicate enabledHosts null checks in updateManager.js (lines 88-92)
- [ ] Extract color-setting logic to helper function in containerBuilder.js 

---

## 📊 Metrics to Track

- Total number of refactoring items identified: **38**
- High Priority items: **11** → **9** (2 completed)
- Medium Priority items: **18** → **19** (1 moved from High)
- Low Priority items: **9** → **8** (1 was incorrect)
- Number of items completed per category: **2**
- Code coverage improvement: N/A (no tests yet)
- Lines of code reduced: ~200 (refactored, not reduced - but better organized)
- Number of dependencies removed: TBD

---

## Notes & References

### Key Files by Size (Complexity Indicator)

| File | Lines | Notes |
|------|-------|-------|
| ~~configInteractions.js~~ | ~~1090~~ | ✅ **Split into events/config/** (index: 103, menu: 125, host: 125, schedule: 218, reset: 118, color: 197) |
| updateManager.js | 478 | Consider extracting methods |
| setupInteractions.js | 437 | Consider splitting |
| containerBuilder.js | 357 | Moderate complexity |
| encryptedDatabase.js | 324 | **Needs refactoring** |
| interactionCreate.js | 311 | Router pattern, acceptable |
| rateLimiter.js | 215 | Well-structured |
| hostServers.js | 200 | Data file, consider JSON |

### Useful Commands

```bash
# Find unused dependencies
npm prune

# Check for outdated packages
npm outdated

# Security audit
npm audit

# Find large files (PowerShell)
Get-ChildItem -Recurse -Include *.js | Where-Object {$_.Length -gt 10KB} | Sort-Object Length -Descending | Select-Object Name, @{N='KB';E={[math]::Round($_.Length/1KB,1)}}

# Find TODO/FIXME comments
Select-String -Path "*.js" -Pattern "TODO|FIXME" -Recurse

# Count lines per file
Get-ChildItem -Recurse -Include *.js | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; [PSCustomObject]@{Name=$_.Name; Lines=$lines} } | Sort-Object Lines -Descending
```

### Recommended Refactoring Order

1. **Phase 1 - Quick Wins** (1-2 hours)
   - Fix logging issues
   - Remove dead code
   - Clean up imports

2. **Phase 2 - Database Layer** (4-8 hours)
   - Add indexed lookup for encrypted records
   - Extract findEncryptedRecord() helper
   - Add proper error logging

3. **Phase 3 - Split Large Files** (8-16 hours)
   - Split configInteractions.js into focused modules
   - Extract updateSchedule() sub-methods
   - Create RaidType abstraction

4. **Phase 4 - Testing** (Ongoing)
   - Set up test framework
   - Add unit tests for encryption
   - Add integration tests for database

### External Resources

- [Refactoring Guru](https://refactoring.guru/)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- [Discord.js Best Practices](https://discordjs.guide/additional-info/changes-in-v14.html)

---

## Completed Refactorings

Track completed work here to maintain a history of improvements.

| Date | Category | Description | Impact |
|------|----------|-------------|--------|
| 2026-01-16 | Code Complexity | Split configInteractions.js (1090 lines) into 6 focused modules under events/config/ | Improved maintainability, each module <220 lines |
