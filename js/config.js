/**
 * Configuration loader and manager
 */

let configs = {};

/**
 * Load all configuration files
 */
export async function loadConfigs() {
  try {
    const [race, energy, drafting, ai, prime] = await Promise.all([
      fetch('config/race-config.json').then(r => r.json()),
      fetch('config/energy-config.json').then(r => r.json()),
      fetch('config/drafting-config.json').then(r => r.json()),
      fetch('config/ai-behaviors.json').then(r => r.json()),
      fetch('config/prime-config.json').then(r => r.json())
    ]);
    
    configs = { race, energy, drafting, ai, prime };
    return configs;
  } catch (error) {
    throw new Error(`Failed to load configs: ${error.message}`);
  }
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
