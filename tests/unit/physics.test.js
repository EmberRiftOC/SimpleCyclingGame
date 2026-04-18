import { describe, test, expect } from '@jest/globals';
import { 
  calculateEnergyDrain,
  updatePosition,
  calculateDraftMultiplier,
  checkCollision,
  applyCollisionKnockback,
  findDraftTarget
} from '../../js/physics.js';

describe('Physics - Energy Drain', () => {
  test('energy drains based on speed and time', () => {
    const rider = {
      energy: 100,
      speed: 12.5, // 25mph in m/s (slightly faster than normal 11.176 m/s)
    };
    const config = {
      energy: {
        depletionFormula: {
          baseRate: 0.01,
          exponent: 2.0
        }
      },
      race: {
        defaultSpeed: {
          mps: 11.176
        }
      }
    };
    
    const newEnergy = calculateEnergyDrain(rider, config, 1.0, 1000); // 1 second
    
    expect(newEnergy).toBeLessThan(100);
    expect(newEnergy).toBeGreaterThan(99);
  });

  test('energy never goes below 0', () => {
    const rider = { energy: 0.5, speed: 20 };
    const config = {
      energy: {
        depletionFormula: {
          baseRate: 1.0,
          exponent: 2.0
        }
      },
      race: {
        defaultSpeed: {
          mps: 11.176
        }
      }
    };
    
    const newEnergy = calculateEnergyDrain(rider, config, 1.0, 10000);
    
    expect(newEnergy).toBe(0);
    expect(newEnergy).toBeGreaterThanOrEqual(0);
  });

  test('drafting reduces energy drain', () => {
    const rider = { energy: 100, speed: 12 };
    const config = {
      energy: {
        depletionFormula: {
          baseRate: 0.01,
          exponent: 2.0
        }
      },
      race: {
        defaultSpeed: {
          mps: 11.176
        }
      }
    };
    
    const noDraft = calculateEnergyDrain(rider, config, 1.0, 1000);
    const withDraft = calculateEnergyDrain(rider, config, 0.3, 1000);
    
    expect(withDraft).toBeGreaterThan(noDraft);
  });
});

describe('Physics - Movement', () => {
  test('position updates based on speed and time', () => {
    const rider = { position: 0, speed: 10 }; // 10 m/s
    
    const newPosition = updatePosition(rider, 1000); // 1 second
    
    expect(newPosition).toBe(10);
  });

  test('position increases over multiple updates', () => {
    const rider = { position: 100, speed: 5 };
    
    const newPosition = updatePosition(rider, 2000); // 2 seconds
    
    expect(newPosition).toBe(110);
  });
});

describe('Physics - Drafting', () => {
  test('returns correct multiplier for close drafting', () => {
    const config = {
      drafting: {
        draftZones: [
          { minDistance: 0, maxDistance: 1, energyMultiplier: 0.3 },
          { minDistance: 1, maxDistance: 2, energyMultiplier: 0.5 },
          { minDistance: 2, maxDistance: 3, energyMultiplier: 0.7 },
          { minDistance: 3, maxDistance: 999, energyMultiplier: 1.0 }
        ],
        bikeLengthInMeters: 1.8
      }
    };
    
    // 0.5 bike lengths = 0.9 meters
    expect(calculateDraftMultiplier(0.9, config)).toBe(0.3);
    
    // 1.5 bike lengths = 2.7 meters
    expect(calculateDraftMultiplier(2.7, config)).toBe(0.5);
    
    // 2.5 bike lengths = 4.5 meters
    expect(calculateDraftMultiplier(4.5, config)).toBe(0.7);
    
    // 4 bike lengths = 7.2 meters (no draft)
    expect(calculateDraftMultiplier(7.2, config)).toBe(1.0);
  });
});

describe('Physics - Collision Detection', () => {
  test('detects collision when riders are very close', () => {
    const riderA = { position: 100, lane: 2 };
    const riderB = { position: 100.2, lane: 2 };
    const config = {
      drafting: {
        collisionThreshold: 0.3,
        bikeLengthInMeters: 1.8
      }
    };
    
    expect(checkCollision(riderA, riderB, config)).toBe(true);
  });

  test('no collision when riders are in different lanes', () => {
    const riderA = { position: 100, lane: 2 };
    const riderB = { position: 100.2, lane: 3 };
    const config = {
      drafting: {
        collisionThreshold: 0.3,
        bikeLengthInMeters: 1.8
      }
    };
    
    expect(checkCollision(riderA, riderB, config)).toBe(false);
  });

  test('no collision when riders are far apart', () => {
    const riderA = { position: 100, lane: 2 };
    const riderB = { position: 102, lane: 2 };
    const config = {
      drafting: {
        collisionThreshold: 0.3,
        bikeLengthInMeters: 1.8
      }
    };
    
    expect(checkCollision(riderA, riderB, config)).toBe(false);
  });
});

describe('Physics - Collision Knockback', () => {
  test('applies knockback distance', () => {
    const rider = { position: 100 };
    const config = {
      drafting: {
        collisionKnockback: { min: 4, max: 5 },
        bikeLengthInMeters: 1.8
      }
    };
    
    const newPosition = applyCollisionKnockback(rider, config);
    
    expect(newPosition).toBeLessThan(100);
    expect(newPosition).toBeGreaterThanOrEqual(91); // 100 - (5 * 1.8)
    expect(newPosition).toBeLessThanOrEqual(92.8); // 100 - (4 * 1.8)
  });
});

describe('Physics - Draft Target Finding', () => {
  test('finds closest rider ahead in same lane', () => {
    const rider = { id: 'player', position: 100, lane: 2 };
    const riders = [
      { id: 'a', position: 105, lane: 2 },
      { id: 'b', position: 110, lane: 2 },
      { id: 'c', position: 103, lane: 3 }
    ];
    
    const target = findDraftTarget(rider, riders);
    
    expect(target.id).toBe('a');
  });

  test('returns null if no rider ahead in same lane', () => {
    const rider = { id: 'player', position: 100, lane: 2 };
    const riders = [
      { id: 'a', position: 95, lane: 2 },
      { id: 'b', position: 110, lane: 3 }
    ];
    
    const target = findDraftTarget(rider, riders);
    
    expect(target).toBeNull();
  });
});
