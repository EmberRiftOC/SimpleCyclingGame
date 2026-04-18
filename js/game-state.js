/**
 * Game state management - single source of truth
 */

/**
 * Create initial game state
 */
export function createGameState(configs) {
  const { race, energy, prime } = configs;
  
  return {
    riders: [],
    race: {
      totalDistance: race.distance.meters,
      primes: [],
      finished: false,
      finishOrder: []
    },
    time: 0
  };
}

/**
 * Create a rider object
 */
export function createRider(id, type, lane, config) {
  return {
    id,
    type, // 'player' | 'aggressive' | 'balanced' | 'defensive'
    lane,
    position: 0,
    speed: config.race.defaultSpeed.mps,
    energy: config.energy.startingEnergy,
    energyDrainRate: 0,
    crashed: false,
    points: 0,
    finished: false,
    finishPosition: null
  };
}

/**
 * Deep clone game state (for immutability)
 */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
