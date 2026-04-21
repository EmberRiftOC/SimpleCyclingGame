/**
 * AI decision-making for computer-controlled riders
 */

import type { AIBehavior, AIDecision, GameConfig, GameState, Prime, Rider } from '../types';

// --- Dynamic pacing state (per rider, persisted across frames) ---
interface AIPacingState {
  currentModifier: number;    // Current speed modifier (-0.15 to +0.15)
  lastChangeTime: number;     // Elapsed race time (ms) of last modifier change
  nextChangeInterval: number; // How long until next change (ms)
}

const pacingStates = new Map<string, AIPacingState>();

/** Config per AI personality */
const PACING_CONFIG = {
  aggressive: { maxSwing: 0.15, minInterval: 3000, maxInterval: 5000 },
  balanced:   { maxSwing: 0.10, minInterval: 5000, maxInterval: 8000 },
  defensive:  { maxSwing: 0.05, minInterval: 8000, maxInterval: 12000 },
} as const;

/**
 * Update (or initialize) the dynamic pacing modifier for an AI rider.
 * Returns the current modifier to apply to base speed.
 */
function updatePacingModifier(
  rider: Rider,
  gameState: GameState,
  config: GameConfig,
  behavior: AIBehavior,
  elapsedMs: number
): number {
  const type = rider.type as keyof typeof PACING_CONFIG;
  const pConfig = PACING_CONFIG[type] ?? PACING_CONFIG.balanced;

  // Initialize state for new riders
  if (!pacingStates.has(rider.id)) {
    pacingStates.set(rider.id, {
      currentModifier: (Math.random() * 2 - 1) * pConfig.maxSwing,
      lastChangeTime: 0,
      nextChangeInterval: pConfig.minInterval + Math.random() * (pConfig.maxInterval - pConfig.minInterval),
    });
  }

  const state = pacingStates.get(rider.id)!;

  // Time to pick a new modifier?
  if (elapsedMs - state.lastChangeTime >= state.nextChangeInterval) {
    state.currentModifier = (Math.random() * 2 - 1) * pConfig.maxSwing;
    state.lastChangeTime = elapsedMs;
    state.nextChangeInterval =
      pConfig.minInterval + Math.random() * (pConfig.maxInterval - pConfig.minInterval);
  }

  // Contextual adjustments stacked on top
  let contextualAdj = 0;

  // Near a prime: surge
  const nextPrime = gameState.race.primes.find(p => !p.claimed && p.location > rider.position);
  if (nextPrime) {
    const distToPrime = nextPrime.location - rider.position;
    if (distToPrime < 100) contextualAdj += 0.12;
  }

  // Low energy: conserve
  const energyPct = (rider.energy / rider.maxEnergy) * 100;
  if (energyPct < 20) contextualAdj -= 0.10;

  // Race position context: compare position to median of all riders
  const positions = gameState.riders.map(r => r.position);
  const median = positions.sort((a, b) => a - b)[Math.floor(positions.length / 2)];
  if (rider.position < median * 0.8) {
    contextualAdj += 0.08; // falling behind — push harder
  } else if (rider.position > median * 1.2) {
    contextualAdj -= 0.05; // comfortably ahead — ease off
  }

  return state.currentModifier + contextualAdj;
}

/**
 * Clear pacing state (call when race resets)
 */
export function resetPacingStates(): void {
  pacingStates.clear();
}

/**
 * Update AI rider behavior
 */
export function updateAI(rider: Rider, gameState: GameState, config: GameConfig): AIDecision {
  const behavior = config.ai[rider.type as keyof typeof config.ai];
  if (!behavior) return { speed: rider.speed, targetLane: rider.lane };

  // Decide on speed adjustment based on energy-aware pacing
  const targetSpeed = calculateTargetSpeed(rider, gameState, config, behavior, gameState.time);

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
  behavior: AIBehavior,
  elapsedMs: number = 0
): number {
  const normalSpeed = config.race.defaultSpeed.mps;
  const jitter = rider.speedMultiplier ?? 1.0;
  const pacingModifier = updatePacingModifier(rider, gameState, config, behavior, elapsedMs);
  const baseSpeed = normalSpeed * behavior.pacing.normalSpeed * jitter * (1 + pacingModifier);

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
