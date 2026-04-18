import { describe, test, expect } from '@jest/globals';
import { 
  distance, 
  clamp, 
  lerp, 
  generatePrimeLocations, 
  sortRidersByPosition,
  mphToMps,
  mphToKph
} from '../../js/utils.js';

describe('Utils - Basic Math', () => {
  test('distance calculates correctly between two 1D points', () => {
    expect(distance(0, 5)).toBe(5);
    expect(distance(10, 3)).toBe(7);
    expect(distance(-5, 5)).toBe(10);
  });

  test('clamp constrains value to range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  test('lerp interpolates correctly', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe('Utils - Unit Conversion', () => {
  test('mphToMps converts correctly', () => {
    expect(mphToMps(25)).toBeCloseTo(11.176, 2);
    expect(mphToMps(0)).toBe(0);
  });

  test('mphToKph converts correctly', () => {
    expect(mphToKph(25)).toBeCloseTo(40.234, 2);
    expect(mphToKph(0)).toBe(0);
  });
});

describe('Utils - Prime Generation', () => {
  test('generates correct number of primes', () => {
    const config = {
      count: 3,
      spawnRules: {
        minDistanceFromStart: 1000,
        minDistanceFromFinish: 1000,
        minSpacing: 2000
      }
    };
    const primes = generatePrimeLocations(config, 10000);
    expect(primes).toHaveLength(3);
  });

  test('primes respect minimum spacing', () => {
    const config = {
      count: 3,
      spawnRules: {
        minDistanceFromStart: 1000,
        minDistanceFromFinish: 1000,
        minSpacing: 2000
      }
    };
    const primes = generatePrimeLocations(config, 10000);
    
    for (let i = 1; i < primes.length; i++) {
      const spacing = primes[i].location - primes[i - 1].location;
      expect(spacing).toBeGreaterThanOrEqual(2000);
    }
  });

  test('primes respect distance from start and finish', () => {
    const config = {
      count: 3,
      spawnRules: {
        minDistanceFromStart: 1000,
        minDistanceFromFinish: 1000,
        minSpacing: 2000
      }
    };
    const primes = generatePrimeLocations(config, 10000);
    
    expect(primes[0].location).toBeGreaterThanOrEqual(1000);
    expect(primes[primes.length - 1].location).toBeLessThanOrEqual(9000);
  });
});

describe('Utils - Rider Sorting', () => {
  test('sorts riders by position descending', () => {
    const riders = [
      { id: 'a', position: 100 },
      { id: 'b', position: 200 },
      { id: 'c', position: 150 }
    ];
    const sorted = sortRidersByPosition(riders);
    expect(sorted[0].id).toBe('b');
    expect(sorted[1].id).toBe('c');
    expect(sorted[2].id).toBe('a');
  });
});
