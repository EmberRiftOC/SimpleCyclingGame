/**
 * AI decision-making for computer-controlled riders
 */

import type { AIBehavior, AIDecision, GameConfig, GameState, Prime, Rider } from '../types';

/**
 * Update AI rider behavior
 */
export function updateAI(rider: Rider, gameState: GameState, config: GameConfig): AIDecision {
  const behavior = config.ai[rider.type as keyof typeof config.ai];
  if (!behavior) return { speed: rider.speed, targetLane: rider.lane };

  // Decide on speed adjustment based on energy-aware pacing
  const targetSpeed = calculateTargetSpeed(rider, gameState, config, behavior);

  return {
    speed: targetSpeed,
    targetLane: rider.lane, // AI doesn't change lanes per spec
  };
}

/**
 * Calculate target speed based on AI behavior, race conditions, and energy level
 */
function calculateTargetSpeed(
  rider: Rider,
  gameState: GameState,
  config: GameConfig,
  behavior: AIBehavior
): number {
  const normalSpeed = config.race.defaultSpeed.mps;
  const baseSpeed = normalSpeed * behavior.pacing.normalSpeed;

  // At 0% energy: hard cap at 50% of normal speed (same rule as player)
  if (rider.energy <= 0) {
    return normalSpeed * config.energy.zeroEnergyPenalty.speedMultiplier;
  }

  // Calculate race progress (0 = start, 1 = finish)
  const raceProgress = rider.position / gameState.race.totalDistance;

  // Projected energy at finish based on current drain rate
  // This lets AI anticipate running out and conserve early
  const distanceRemaining = gameState.race.totalDistance - rider.position;
  const timeRemaining = distanceRemaining / (rider.speed || normalSpeed); // seconds
  const projectedEnergy = rider.energy - rider.energyDrainRate * timeRemaining;

  // Energy-aware pacing - combines current energy AND projection
  // Use the lower of actual vs projected to be conservative
  const effectiveEnergy = Math.min(rider.energy, Math.max(0, projectedEnergy));
  const energyFactor = getEnergySpeedFactor(effectiveEnergy, behavior.energyManagement);
  const energyAdjustedBase = baseSpeed * energyFactor;

  // Check if there's an upcoming prime to sprint for
  if (shouldSprintForPrime(rider, gameState, config, behavior)) {
    // Only sprint if projected to have enough energy
    const energyThreshold = behavior.energyManagement === 'poor' ? 10 : 25;
    if (effectiveEnergy > energyThreshold) {
      return normalSpeed * behavior.pacing.sprintSpeed * energyFactor;
    }
  }

  // Late-race surge: if energy to spare near finish, go hard
  if (raceProgress > 0.85 && effectiveEnergy > 15) {
    return Math.min(normalSpeed * behavior.pacing.sprintSpeed, baseSpeed * 1.05);
  }

  return energyAdjustedBase;
}

/**
 * Get speed multiplier based on energy level and AI energy management style.
 * Each AI type responds differently to low energy.
 *
 * - 'excellent' (defensive): Starts conserving early, smooth taper
 * - 'good' (balanced): Conserves in mid-range, more aggressive drop at low energy
 * - 'poor' (aggressive): Ignores energy until critically low, then crashes hard
 */
function getEnergySpeedFactor(energy: number, management: string): number {
  switch (management) {
    case 'excellent':
      // Starts tapering gently from 60% energy down
      if (energy > 60) return 1.0;
      if (energy > 40) return 0.97; // Slight conservation
      if (energy > 20) return 0.92;
      if (energy > 10) return 0.85;
      return 0.75; // Nearly depleted - significant slowdown

    case 'good':
      // Holds pace well until ~30%, then drops off
      if (energy > 30) return 1.0;
      if (energy > 20) return 0.95;
      if (energy > 10) return 0.87;
      return 0.78;

    case 'poor':
    default:
      // Hammers at full speed until the tank is almost empty
      if (energy > 15) return 1.0;
      if (energy > 5) return 0.88; // Sudden drop
      return 0.72; // Blowing up
  }
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
    behavior = config.ai[rider.type as keyof typeof config.ai];
  }

  const upcomingPrime = getNextUnclaimedPrime(rider, gameState);
  if (!upcomingPrime) return false;

  const distanceToPrime = upcomingPrime.location - rider.position;

  switch (behavior.primeStrategy) {
    case 'always':
      return distanceToPrime > 0 && distanceToPrime < 100;

    case 'opportunistic':
      // Only go for it if reasonably close and has energy
      return distanceToPrime > 0 && distanceToPrime < 50 && rider.energy > 30;

    case 'ignore':
      return false;

    default:
      return false;
  }
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
