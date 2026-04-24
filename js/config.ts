/**
 * Configuration loader and manager
 */

import type { AIConfig, DraftingConfig, EnergyConfig, GameConfig, PrimeConfig, RaceConfig } from '../types';

const raceConfig: RaceConfig = {
  "distance": {
    "meters": 1000,
    "displayUnit": "meters"
  },
  "lanes": {
    "total": 5,
    "playerStartLane": 3,
    "widthMeters": 2
  },
  "riders": {
    "total": 5,
    "playerColor": "#FFD700",
    "aiColors": {
      "aggressive": "#FF4444",
      "balanced": "#4488FF",
      "defensive": "#44FF88"
    }
  },
  "defaultSpeed": {
    "mph": 25,
    "mps": 11.176
  },
  "unitToggle": {
    "options": ["mph", "kph"],
    "default": "mph"
  },
  "playerControls": {
    "maxSpeedMultiplier": 1.5,
    "minSpeedMultiplier": 0.3,
    "acceleration": 3.0
  },
  "viewport": {
    "rangeBikeLengths": 15,
    "playerPositionPercent": 0.4
  }
};

const energyConfig: EnergyConfig = {
  "startingEnergy": 100,
  "aiStartingEnergy": 150,
  "depletionFormula": {
    "baseRateReference": 0.1,      // Base rate for 10km race
    "referenceDistance": 10000,    // Reference distance in meters
    "speedMultiplier": "exponential",
    "exponent": 2.0
  },
  "zeroEnergyPenalty": {
    "speedMultiplier": 0.5,
    "description": "Player drops to 50% speed when energy = 0"
  },
  "energyBuffer": {
    "normalPaceUsage": 90,
    "description": "Normal pace should use ~90% energy over full race"
  }
};

const draftingConfig: DraftingConfig = {
  "draftZones": [
    {
      "minDistance": 0,
      "maxDistance": 1,
      "unit": "bikeLengths",
      "energyMultiplier": 0.3,
      "savingsPercent": 70,
      "riskLevel": "high",
      "description": "Optimal draft, high collision risk"
    },
    {
      "minDistance": 1,
      "maxDistance": 2,
      "unit": "bikeLengths",
      "energyMultiplier": 0.5,
      "savingsPercent": 50,
      "riskLevel": "medium"
    },
    {
      "minDistance": 2,
      "maxDistance": 3,
      "unit": "bikeLengths",
      "energyMultiplier": 0.7,
      "savingsPercent": 30,
      "riskLevel": "low"
    },
    {
      "minDistance": 3,
      "maxDistance": 999,
      "unit": "bikeLengths",
      "energyMultiplier": 1.0,
      "savingsPercent": 0,
      "riskLevel": "none",
      "description": "No drafting benefit"
    }
  ],
  "bikeLengthInMeters": 1.8,
  "collisionThreshold": 0.3,
  "collisionKnockback": {
    "min": 4,
    "max": 5,
    "unit": "bikeLengths"
  },
  "crashSpeedReduction": 0.5
};

const aiConfig: AIConfig = {
  "aggressive": {
    "pacing": {
      "normalSpeed": 2.0,
      "sprintSpeed": 2.6,
      "description": "Same base speed as player, poor energy management means burns out late"
    },
    "acceleration": 8.0,
    "primeStrategy": "always",
    "draftingPreference": "risky",
    "energyManagement": "poor",
    "visualIdentifier": {
      "bikeColor": "#FF6B35",
      "trailColor": "#FF0000"
    }
  },
  "balanced": {
    "pacing": {
      "normalSpeed": 1.7,
      "sprintSpeed": 2.1
    },
    "acceleration": 7.0,
    "primeStrategy": "opportunistic",
    "draftingPreference": "moderate",
    "energyManagement": "good",
    "visualIdentifier": {
      "bikeColor": "#4ECDC4",
      "trailColor": "#00FFFF"
    }
  },
  "defensive": {
    "pacing": {
      "normalSpeed": 1.5,
      "sprintSpeed": 1.8,
      "description": "Slower but highly energy-efficient, strong late-race"
    },
    "acceleration": 6.0,
    "primeStrategy": "ignore",
    "draftingPreference": "safe",
    "energyManagement": "excellent",
    "visualIdentifier": {
      "bikeColor": "#95E1D3",
      "trailColor": "#00FF00"
    }
  }
};

const primeConfig: PrimeConfig = {
  "count": 3,
  "randomization": true,
  "spawnRules": {
    "minDistanceFromStart": 0.1,  // 10% of race distance
    "minDistanceFromFinish": 0.1, // 10% of race distance
    "minSpacing": 0.2,             // 20% of race distance
    "unit": "percent"
  },
  "points": {
    "first": 3,
    "second": 2,
    "third": 1
  },
  "finishPoints": {
    "first": 15,
    "second": 10,
    "third": 6
  },
  "visualIndicator": {
    "minimapColor": "#FFD700",
    "advanceWarning": 50,
    "unit": "meters"
  }
};

// Difficulty presets - multipliers applied to AI speed/acceleration
export const DIFFICULTY_PRESETS = {
  easy: {
    label: 'EASY',
    normalSpeedMult: 0.55,
    sprintSpeedMult: 0.55,
    accelerationMult: 0.55,
    aiStartingEnergy: 100
  },
  medium: {
    label: 'MEDIUM',
    normalSpeedMult: 0.75,
    sprintSpeedMult: 0.75,
    accelerationMult: 0.75,
    aiStartingEnergy: 125
  },
  hard: {
    label: 'HARD',
    normalSpeedMult: 1.0,
    sprintSpeedMult: 1.0,
    accelerationMult: 1.0,
    aiStartingEnergy: 150
  }
} as const;

export type Difficulty = keyof typeof DIFFICULTY_PRESETS;

let configs: GameConfig = {
  race: raceConfig,
  energy: energyConfig,
  drafting: draftingConfig,
  ai: aiConfig,
  prime: primeConfig
};

/**
 * Load all configuration files (now just returns cached configs)
 */
export async function loadConfigs(): Promise<GameConfig> {
  return configs;
}

/**
 * Apply difficulty preset to a config - scales AI speed/acceleration
 */
export function applyDifficulty(baseConfig: GameConfig, difficulty: Difficulty): GameConfig {
  const preset = DIFFICULTY_PRESETS[difficulty];
  const { normalSpeedMult, sprintSpeedMult, accelerationMult } = preset;

  // Deep clone so we don't mutate the base config
  const cfg: GameConfig = JSON.parse(JSON.stringify(baseConfig));

  const types = ['aggressive', 'balanced', 'defensive'] as const;
  for (const type of types) {
    cfg.ai[type].pacing.normalSpeed *= normalSpeedMult;
    cfg.ai[type].pacing.sprintSpeed *= sprintSpeedMult;
    cfg.ai[type].acceleration *= accelerationMult;
  }

  // Set AI starting energy for this difficulty
  cfg.energy.aiStartingEnergy = preset.aiStartingEnergy;

  return cfg;
}

/**
 * Get a specific config
 */
export function getConfig<K extends keyof GameConfig>(name: K): GameConfig[K] {
  if (!configs[name]) {
    throw new Error(`Config '${name}' not loaded`);
  }
  return configs[name];
}

/**
 * Get all configs
 */
export function getAllConfigs(): GameConfig {
  return configs;
}
