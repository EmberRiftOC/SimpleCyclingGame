/**
 * Game state management - single source of truth
 */

import type { GameConfig, GameState, Rider, RiderType } from '../types';

/**
 * Create initial game state
 */
export function createGameState(configs: GameConfig): GameState {
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
export function createRider(id: string, type: RiderType, lane: number, config: GameConfig): Rider {
  return {
    id,
    type, // 'player' | 'aggressive' | 'balanced' | 'defensive'
    lane,
    targetLane: lane, // For smooth lane transitions
    laneProgress: 0, // 0-1, progress toward targetLane
    position: 0,
    speed: config.race.defaultSpeed.mps,
    energy: config.energy.startingEnergy,
    energyDrainRate: 0,
    crashed: false,
    points: 0,
    finished: false,
    finishPosition: null,
    coasting: false,
    coastDistance: 0
  };
}

/**
 * Deep clone game state (for immutability)
 */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}
