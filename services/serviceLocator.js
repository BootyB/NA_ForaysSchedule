// SPDX-FileCopyrightText: 2024-2026 BootyB
// SPDX-License-Identifier: GPL-3.0-or-later

const logger = require('../utils/logger');

/**
 * Service Locator Pattern Implementation
 * 
 * Provides a centralized registry for application services, eliminating the need
 * to pass a services object through every function call.
 * 
 * Usage:
 *   // Register a service
 *   ServiceLocator.register('updateManager', updateManagerInstance);
 * 
 *   // Retrieve a service
 *   const updateManager = ServiceLocator.get('updateManager');
 * 
 *   // Check if a service exists
 *   if (ServiceLocator.has('timerService')) { ... }
 */
class ServiceLocator {
  static #instance = null;
  #services = new Map();
  #initialized = false;

  constructor() {
    if (ServiceLocator.#instance) {
      return ServiceLocator.#instance;
    }
    ServiceLocator.#instance = this;
  }

  /**
   * Get the singleton instance of ServiceLocator
   * @returns {ServiceLocator}
   */
  static getInstance() {
    if (!ServiceLocator.#instance) {
      ServiceLocator.#instance = new ServiceLocator();
    }
    return ServiceLocator.#instance;
  }

  /**
   * Register a service with the locator
   * @param {string} name - Service identifier
   * @param {any} service - Service instance
   * @returns {ServiceLocator} - Returns this for chaining
   */
  register(name, service) {
    if (this.#services.has(name)) {
      logger.warn(`Service '${name}' is being overwritten`);
    }
    this.#services.set(name, service);
    logger.debug(`Service registered: ${name}`);
    return this;
  }

  /**
   * Register multiple services at once
   * @param {Object} services - Object with service names as keys and instances as values
   * @returns {ServiceLocator} - Returns this for chaining
   */
  registerAll(services) {
    for (const [name, service] of Object.entries(services)) {
      if (service !== null && service !== undefined) {
        this.register(name, service);
      }
    }
    return this;
  }

  /**
   * Get a service by name
   * @param {string} name - Service identifier
   * @returns {any} - Service instance
   * @throws {Error} - If service is not found
   */
  get(name) {
    if (!this.#services.has(name)) {
      throw new Error(`Service '${name}' not found. Available services: ${this.listServices().join(', ')}`);
    }
    return this.#services.get(name);
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service identifier
   * @returns {boolean}
   */
  has(name) {
    return this.#services.has(name);
  }

  /**
   * Get multiple services at once
   * @param {...string} names - Service identifiers
   * @returns {Object} - Object with requested services
   */
  getMany(...names) {
    const result = {};
    for (const name of names) {
      result[name] = this.get(name);
    }
    return result;
  }

  /**
   * List all registered service names
   * @returns {string[]}
   */
  listServices() {
    return Array.from(this.#services.keys());
  }

  /**
   * Mark services as fully initialized
   */
  markInitialized() {
    this.#initialized = true;
    logger.info('ServiceLocator initialized', { services: this.listServices() });
  }

  /**
   * Check if services are initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.#initialized;
  }

  /**
   * Clear all services (useful for testing)
   */
  clear() {
    this.#services.clear();
    this.#initialized = false;
    logger.debug('ServiceLocator cleared');
  }
}

// Export singleton instance
module.exports = ServiceLocator.getInstance();
