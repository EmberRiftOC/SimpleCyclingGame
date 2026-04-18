/**
 * Utility functions for the cycling game
 */

/**
 * Calculate distance between two points (1D)
 */
export function distance(pointA, pointB) {
  return Math.abs(pointB - pointA);
}

/**
 * Constrain value to range [min, max]
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between a and b
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Generate random prime locations based on config rules
 */
export function generatePrimeLocations(config, totalDistance) {
  const { count, spawnRules } = config;
  const { minDistanceFromStart, minDistanceFromFinish, minSpacing, unit } = spawnRules;
  
  // Convert percentages to absolute distances if needed
  const startBuffer = unit === 'percent' ? totalDistance * minDistanceFromStart : minDistanceFromStart;
  const endBuffer = unit === 'percent' ? totalDistance * minDistanceFromFinish : minDistanceFromFinish;
  const spacing = unit === 'percent' ? totalDistance * minSpacing : minSpacing;
  
  const availableStart = startBuffer;
  const availableEnd = totalDistance - endBuffer;
  const availableRange = availableEnd - availableStart;
  
  // Check if there's enough space
  const minRequiredSpace = (count - 1) * spacing;
  if (availableRange < minRequiredSpace) {
    throw new Error('Not enough space to place primes with given constraints');
  }
  
  const primes = [];
  const segments = count + 1;
  const segmentSize = availableRange / segments;
  
  for (let i = 0; i < count; i++) {
    const segmentStart = availableStart + segmentSize * (i + 1);
    const segmentEnd = availableStart + segmentSize * (i + 2);
    const location = Math.floor(segmentStart + Math.random() * (segmentEnd - segmentStart - spacing));
    
    primes.push({
      location,
      claimed: false,
      claimedBy: []
    });
  }
  
  return primes.sort((a, b) => a.location - b.location);
}

/**
 * Sort riders by position (descending - furthest ahead first)
 */
export function sortRidersByPosition(riders) {
  return [...riders].sort((a, b) => b.position - a.position);
}

/**
 * Convert mph to meters per second
 */
export function mphToMps(mph) {
  return mph * 0.44704;
}

/**
 * Convert mph to kph
 */
export function mphToKph(mph) {
  return mph * 1.60934;
}
