/**
 * Configuration loader and manager
 */

import raceConfig from '../config/race-config.json';
import energyConfig from '../config/energy-config.json';
import draftingConfig from '../config/drafting-config.json';
import aiConfig from '../config/ai-behaviors.json';
import primeConfig from '../config/prime-config.json';

let configs = {
  race: raceConfig,
  energy: energyConfig,
  drafting: draftingConfig,
  ai: aiConfig,
  prime: primeConfig
};

/**
 * Load all configuration files (now just returns cached configs)
 */
export async function loadConfigs() {
  return configs;
}

/**
 * Get a specific config
 */
export function getConfig(name) {
  if (!configs[name]) {
    throw new Error(`Config '${name}' not loaded`);
  }
  return configs[name];
}

/**
 * Get all configs
 */
export function getAllConfigs() {
  return configs;
}
