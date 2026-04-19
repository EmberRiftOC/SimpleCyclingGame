/**
 * AI decision-making for computer-controlled riders
 */

import type { AIBehavior, AIDecision, GameConfig, GameState, Prime, Rider } from '../types';

/**
 * Update AI rider behavior
 */
export function updateAI(rider: Rider, gameState: GameState, config: GameConfig): AIDecision {
  const behavior = config.ai[rider.type];
  if (!behavior) return { speed: rider.speed, targetLane: rider.lane };
  
  // Decide on speed adjustment
  const targetSpeed = calculateTargetSpeed(rider, gameState, config, behavior);
  
  return {
    speed: targetSpeed,
    targetLane: rider.lane // AI doesn't change lanes per spec
  };
}

/**
 * Calculate target speed based on AI behavior and race conditions
 */
function calculateTargetSpeed(
  rider: Rider,
  gameState: GameState,
  config: GameConfig,
  behavior: AIBehavior
): number {
  const normalSpeed = config.race.defaultSpeed.mps;
  const baseSpeed = normalSpeed * behavior.pacing.normalSpeed;
  
  // Check if there's an upcoming prime to sprint for
  if (shouldSprintForPrime(rider, gameState, config, behavior)) {
    return normalSpeed * behavior.pacing.sprintSpeed;
  }
  
  // Energy management
  if (rider.energy < 20 && behavior.energyManagement === 'excellent') {
    return baseSpeed * 0.8; // Slow down to conserve
  }
  
  if (rider.energy < 10) {
    return baseSpeed * 0.7; // Emergency conservation
  }
  
  return baseSpeed;
}

/**
 * Determine if AI should sprint for upcoming prime
 */
export function shouldSprintForPrime(
  rider: Rider,
  gameState: GameState,
  config: GameConfig,
  behavior?: AIBehavior
): boolean {
  if (!behavior) {
    behavior = config.ai[rider.type];
  }
  
  const upcomingPrime = getNextUnclaimedPrime(rider, gameState);
  if (!upcomingPrime) return false;
  
  const distanceToPrime = upcomingPrime.location - rider.position;
  
  // Different strategies based on AI type
  if (behavior.primeStrategy === 'always') {
    return distanceToPrime > 0 && distanceToPrime < 100;
  }
  
  if (behavior.primeStrategy === 'opportunistic') {
    return distanceToPrime > 0 && distanceToPrime < 50 && rider.energy > 30;
  }
  
  if (behavior.primeStrategy === 'ignore') {
    return false;
  }
  
  return false;
}

/**
 * Find the next unclaimed prime ahead of the rider
 */
function getNextUnclaimedPrime(rider: Rider, gameState: GameState): Prime | null {
  for (const prime of gameState.race.primes) {
    if (prime.location > rider.position && !prime.claimed) {
      return prime;
    }
  }
  return null;
}

/**
 * Smooth speed adjustment (acceleration/braking)
 */
export function adjustSpeed(
  currentSpeed: number,
  targetSpeed: number,
  deltaTime: number,
  acceleration: number = 2.0
): number {
  const maxChange = acceleration * (deltaTime / 1000);
  
  const diff = targetSpeed - currentSpeed;
  
  if (Math.abs(diff) <= maxChange) {
    return targetSpeed;
  }
  
  return currentSpeed + Math.sign(diff) * maxChange;
}
