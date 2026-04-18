/**
 * Configuration loader and manager
 */

const raceConfig = {
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
    "playerColor": "#FF3366",
    "aiColors": {
      "aggressive": "#FF6B35",
      "balanced": "#4ECDC4",
      "defensive": "#95E1D3"
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

const energyConfig = {
  "startingEnergy": 100,
  "depletionFormula": {
    "baseRate": 0.1,
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

const draftingConfig = {
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
  }
};

const aiConfig = {
  "aggressive": {
    "pacing": {
      "normalSpeed": 1.1,
      "sprintSpeed": 1.3,
      "description": "Rides 10% faster than normal, sprints hard"
    },
    "acceleration": 2.5,
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
      "normalSpeed": 1.0,
      "sprintSpeed": 1.2
    },
    "acceleration": 2.0,
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
      "normalSpeed": 0.9,
      "sprintSpeed": 1.1,
      "description": "Rides 10% slower, conserves energy"
    },
    "acceleration": 1.5,
    "primeStrategy": "ignore",
    "draftingPreference": "safe",
    "energyManagement": "excellent",
    "visualIdentifier": {
      "bikeColor": "#95E1D3",
      "trailColor": "#00FF00"
    }
  }
};

const primeConfig = {
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
