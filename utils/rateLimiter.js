// SPDX-FileCopyrightText: 2024-2026 BootyB
// SPDX-License-Identifier: GPL-3.0-or-later

const logger = require('./logger');
const { RATE_LIMITER } = require('../config/constants');
class RateLimiter {
  constructor() {
    // Track command usage per user
    this.userCommandCooldowns = new Map();
    // Track interaction usage per user
    this.userInteractionCooldowns = new Map();
    
    // Cooldown durations from constants
    this.COMMAND_COOLDOWN = RATE_LIMITER.COMMAND_COOLDOWN;
    this.INTERACTION_COOLDOWN = RATE_LIMITER.INTERACTION_COOLDOWN;
    
    // Maximum requests tracking
    this.userRequestCounts = new Map();
    this.REQUEST_WINDOW = RATE_LIMITER.REQUEST_WINDOW;
    this.MAX_REQUESTS_PER_WINDOW = RATE_LIMITER.MAX_REQUESTS_PER_WINDOW;
    
    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), RATE_LIMITER.CLEANUP_INTERVAL);
  }

  /**
   * Check if a user can execute a command
   * @param {string} userId - Discord user ID
   * @param {string} commandName - Name of the command
   * @returns {{allowed: boolean, timeLeft?: number}} - Whether the action is allowed and time remaining
   */
  checkCommandCooldown(userId, commandName) {
    const key = `${userId}:${commandName}`;
    const now = Date.now();
    
    // Check request count first
    const requestCheck = this.checkRequestLimit(userId);
    if (!requestCheck.allowed) {
      return requestCheck;
    }
    
    const lastUsed = this.userCommandCooldowns.get(key);
    
    if (lastUsed) {
      const timeSince = now - lastUsed;
      if (timeSince < this.COMMAND_COOLDOWN) {
        const timeLeft = Math.ceil((this.COMMAND_COOLDOWN - timeSince) / 1000);
        return { allowed: false, timeLeft };
      }
    }
    
    this.userCommandCooldowns.set(key, now);
    this.incrementRequestCount(userId);
    return { allowed: true };
  }

  /**
   * Check if a user can execute an interaction
   * @param {string} userId - Discord user ID
   * @param {string} interactionType - Type of interaction
   * @returns {{allowed: boolean, timeLeft?: number}} - Whether the action is allowed
   */
  checkInteractionCooldown(userId, interactionType) {
    const key = `${userId}:${interactionType}`;
    const now = Date.now();
    
    // Check request count first
    const requestCheck = this.checkRequestLimit(userId);
    if (!requestCheck.allowed) {
      return requestCheck;
    }
    
    const lastUsed = this.userInteractionCooldowns.get(key);
    
    if (lastUsed) {
      const timeSince = now - lastUsed;
      if (timeSince < this.INTERACTION_COOLDOWN) {
        return { allowed: false, timeLeft: 1 };
      }
    }
    
    this.userInteractionCooldowns.set(key, now);
    this.incrementRequestCount(userId);
    return { allowed: true };
  }

  /**
   * Check if user has exceeded request limit
   * @param {string} userId - Discord user ID
   * @returns {{allowed: boolean, timeLeft?: number}}
   */
  checkRequestLimit(userId) {
    const now = Date.now();
    const userData = this.userRequestCounts.get(userId);
    
    if (!userData) {
      return { allowed: true };
    }
    
    // Filter out requests outside the window
    const recentRequests = userData.requests.filter(time => now - time < this.REQUEST_WINDOW);
    
    if (recentRequests.length >= this.MAX_REQUESTS_PER_WINDOW) {
      const oldestRequest = Math.min(...recentRequests);
      const timeLeft = Math.ceil((this.REQUEST_WINDOW - (now - oldestRequest)) / 1000);
      
      logger.warn('Rate limit exceeded', {
        userId,
        requestCount: recentRequests.length,
        timeLeft
      });
      
      return { allowed: false, timeLeft };
    }
    
    return { allowed: true };
  }

  /**
   * Increment request count for a user
   * @param {string} userId - Discord user ID
   */
  incrementRequestCount(userId) {
    const now = Date.now();
    const userData = this.userRequestCounts.get(userId) || { requests: [] };
    
    // Add new request and filter old ones
    userData.requests.push(now);
    userData.requests = userData.requests.filter(time => now - time < this.REQUEST_WINDOW);
    
    this.userRequestCounts.set(userId, userData);
  }

  /**
   * Clear cooldown for a specific user/command combination
   * @param {string} userId - Discord user ID
   * @param {string} commandName - Name of the command
   */
  clearCommandCooldown(userId, commandName) {
    const key = `${userId}:${commandName}`;
    this.userCommandCooldowns.delete(key);
  }

  /**
   * Clear all cooldowns for a user (for admin override)
   * @param {string} userId - Discord user ID
   */
  clearUserCooldowns(userId) {
    // Clear command cooldowns
    for (const [key] of this.userCommandCooldowns) {
      if (key.startsWith(`${userId}:`)) {
        this.userCommandCooldowns.delete(key);
      }
    }
    
    // Clear interaction cooldowns
    for (const [key] of this.userInteractionCooldowns) {
      if (key.startsWith(`${userId}:`)) {
        this.userInteractionCooldowns.delete(key);
      }
    }
    
    // Clear request counts
    this.userRequestCounts.delete(userId);
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    
    // Clean command cooldowns
    for (const [key, timestamp] of this.userCommandCooldowns) {
      if (now - timestamp > this.COMMAND_COOLDOWN * 10) {
        this.userCommandCooldowns.delete(key);
      }
    }
    
    // Clean interaction cooldowns
    for (const [key, timestamp] of this.userInteractionCooldowns) {
      if (now - timestamp > this.INTERACTION_COOLDOWN * 10) {
        this.userInteractionCooldowns.delete(key);
      }
    }
    
    // Clean request counts
    for (const [userId, userData] of this.userRequestCounts) {
      userData.requests = userData.requests.filter(time => now - time < this.REQUEST_WINDOW);
      if (userData.requests.length === 0) {
        this.userRequestCounts.delete(userId);
      }
    }
    
    logger.debug('Rate limiter cleanup completed', {
      commandCooldowns: this.userCommandCooldowns.size,
      interactionCooldowns: this.userInteractionCooldowns.size,
      requestCounts: this.userRequestCounts.size
    });
  }

  /**
   * Get statistics about current rate limiting state
   * @returns {object} - Statistics object
   */
  getStats() {
    return {
      commandCooldowns: this.userCommandCooldowns.size,
      interactionCooldowns: this.userInteractionCooldowns.size,
      trackedUsers: this.userRequestCounts.size,
      totalRequests: Array.from(this.userRequestCounts.values())
        .reduce((sum, data) => sum + data.requests.length, 0)
    };
  }
}

module.exports = new RateLimiter();
