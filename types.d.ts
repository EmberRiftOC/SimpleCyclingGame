/**
 * Type definitions for cycling game
 */

// Rider types
export type RiderType = 'player' | 'aggressive' | 'balanced' | 'defensive';

export interface Rider {
  id: string;
  type: RiderType;
  lane: number;
  position: number;
  speed: number;
  energy: number;
  maxEnergy: number;
  energyDrainRate: number;
  crashed: boolean;
  points: number;
  finished: boolean;
  finishPosition: number | null;
  coasting: boolean;
  coastDistance: number;
  speedMultiplier?: number; // Per-rider speed jitter for variability
  isDrafting?: boolean;       // True when actively in a draft zone
}

// Prime sprint
export interface Prime {
  location: number;
  claimed: boolean;
  claimedBy: string[];
}

// Game state
export interface GameState {
  riders: Rider[];
  race: {
    totalDistance: number;
    primes: Prime[];
    finished: boolean;
    finishOrder: string[];
  };
  time: number;
}

// Config types
export interface RaceConfig {
  distance: {
    meters: number;
    displayUnit: string;
  };
  lanes: {
    total: number;
    playerStartLane: number;
    widthMeters: number;
  };
  riders: {
    total: number;
    playerColor: string;
    aiColors: {
      aggressive: string;
      balanced: string;
      defensive: string;
    };
  };
  defaultSpeed: {
    mph: number;
    mps: number;
  };
  unitToggle: {
    options: string[];
    default: string;
  };
  playerControls: {
    maxSpeedMultiplier: number;
    minSpeedMultiplier: number;
    acceleration: number;
  };
  viewport: {
    rangeBikeLengths: number;
    playerPositionPercent: number;
  };
}

export interface EnergyConfig {
  startingEnergy: number;
  aiStartingEnergy: number;
  depletionFormula: {
    baseRateReference: number;
    referenceDistance: number;
    speedMultiplier: string;
    exponent: number;
  };
  zeroEnergyPenalty: {
    speedMultiplier: number;
    description: string;
  };
  energyBuffer: {
    normalPaceUsage: number;
    description: string;
  };
}

export interface DraftZone {
  minDistance: number;
  maxDistance: number;
  unit: string;
  energyMultiplier: number;
  savingsPercent: number;
  riskLevel: string;
  description?: string;
}

export interface DraftingConfig {
  draftZones: DraftZone[];
  bikeLengthInMeters: number;
  collisionThreshold: number;
  collisionKnockback: {
    min: number;
    max: number;
    unit: string;
  };
}

export interface AIBehavior {
  pacing: {
    normalSpeed: number;
    sprintSpeed: number;
    description?: string;
  };
  acceleration: number;
  primeStrategy: string;
  draftingPreference: string;
  energyManagement: string;
  visualIdentifier: {
    bikeColor: string;
    trailColor: string;
  };
}

export interface AIConfig {
  aggressive: AIBehavior;
  balanced: AIBehavior;
  defensive: AIBehavior;
}

export interface PrimeConfig {
  count: number;
  randomization: boolean;
  spawnRules: {
    minDistanceFromStart: number;
    minDistanceFromFinish: number;
    minSpacing: number;
    unit: string;
  };
  points: {
    first: number;
    second: number;
    third: number;
  };
  finishPoints: {
    first: number;
    second: number;
    third: number;
  };
  visualIndicator: {
    minimapColor: string;
    advanceWarning: number;
    unit: string;
  };
}

export interface GameConfig {
  race: RaceConfig;
  energy: EnergyConfig;
  drafting: DraftingConfig;
  ai: AIConfig;
  prime: PrimeConfig;
}

// Input types
export interface PlayerInput {
  accelerate: boolean;
  brake: boolean;
  laneChange: 'up' | 'down' | null;
  speedChange: 'increase' | 'decrease' | null;
}

// AI decision
export interface AIDecision {
  speed: number;
  targetLane: number;
}
