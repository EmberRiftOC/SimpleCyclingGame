/**
 * Race Manager - orchestrates all game systems
 */

import type { GameConfig, GameState, PlayerInput, Rider } from '../types';
import { createGameState, createRider } from './game-state.js';
import { generatePrimeLocations } from './utils.js';
import * as physics from './physics.js';
import * as ai from './ai.js';

interface ExtendedRider extends Rider {
  targetLane?: number;
  laneProgress?: number;
}

export class RaceManager {
  config: GameConfig;
  gameState: GameState | null;
  initialized: boolean;

  constructor(config: GameConfig) {
    this.config = config;
    this.gameState = null;
    this.initialized = false;
  }

  /**
   * Initialize race with riders and primes
   */
  initializeRace(): void {
    this.gameState = createGameState(this.config);

    // Generate prime locations
    this.gameState.race.primes = generatePrimeLocations(
      this.config.prime,
      this.config.race.distance.meters
    );

    // Create player
    const player = createRider(
      'player',
      'player',
      this.config.race.lanes.playerStartLane,
      this.config
    );
    this.gameState.riders.push(player);

    // Create AI riders (one per lane except player's lane)
    const aiTypes: Array<'aggressive' | 'balanced' | 'defensive'> = [
      'aggressive',
      'balanced',
      'defensive',
      'balanced',
    ];
    const lanes = [1, 2, 4, 5]; // Skip lane 3 (player)

    for (let i = 0; i < lanes.length; i++) {
      const type = aiTypes[i % aiTypes.length];
      const aiRider = createRider(`ai-${i}`, type, lanes[i], this.config);
      
      // Apply per-rider speed randomization (+/- 5% of normal speed)
      const jitter = (Math.random() * 0.1) - 0.05;
      aiRider.speedMultiplier = 1.0 + jitter;
      
      this.gameState.riders.push(aiRider);
    }

    this.initialized = true;
  }

  /**
   * Update race state for one physics step
   */
  updateRace(deltaTime: number): void {
    if (!this.initialized || !this.gameState) return;

    // Update each rider
    for (const rider of this.gameState.riders) {
      // Skip riders who have finished coasting
      if (rider.finished && !rider.coasting) continue;

      // AI decision-making
      if (rider.type !== 'player') {
        const aiDecision = ai.updateAI(rider, this.gameState, this.config);
        const aiAcceleration = this.config.ai[rider.type as keyof typeof this.config.ai].acceleration;
        rider.speed = ai.adjustSpeed(rider.speed, aiDecision.speed, deltaTime, aiAcceleration);
      }

      // Find draft target
      const draftTarget = physics.findDraftTarget(rider, this.gameState.riders);
      let draftMultiplier = 1.0;

      if (draftTarget) {
        const distance = draftTarget.position - rider.position;
        draftMultiplier = physics.calculateDraftMultiplier(distance, this.config);
      }

      // Track previous energy for drain rate calculation
      const previousEnergy = rider.energy;

      // Update energy
      rider.energy = physics.calculateEnergyDrain(
        rider,
        this.config,
        draftMultiplier,
        deltaTime
      );

      // Calculate drain rate (% per second)
      const energyLost = previousEnergy - rider.energy;
      rider.energyDrainRate = energyLost / (deltaTime / 1000);

      // Apply zero energy penalty
      if (rider.energy === 0) {
        const normalSpeed = this.config.race.defaultSpeed.mps;
        rider.speed = normalSpeed * this.config.energy.zeroEnergyPenalty.speedMultiplier;
      }

      // Update position
      rider.position = physics.updatePosition(rider, deltaTime);

      // Check for finish
      if (rider.position >= this.gameState.race.totalDistance && !rider.finished) {
        rider.finished = true;
        rider.coasting = true;
        rider.coastDistance = 0;
        rider.finishPosition = this.gameState.race.finishOrder.length + 1;
        this.gameState.race.finishOrder.push(rider.id);

        // Award finish points
        if (rider.finishPosition <= 3) {
          const points = [
            this.config.prime.finishPoints.first,
            this.config.prime.finishPoints.second,
            this.config.prime.finishPoints.third,
          ];
          rider.points += points[rider.finishPosition - 1];
        }
      }

      // Handle coasting after finish
      if (rider.coasting) {
        const bikeLengthMeters = this.config.drafting.bikeLengthInMeters;
        const coastLimit = 4 * bikeLengthMeters;

        if (rider.coastDistance >= coastLimit) {
          rider.coasting = false;
          rider.speed = 0;
        } else {
          // Decelerate while coasting
          const deceleration = 2.0; // m/s²
          rider.speed = Math.max(0, rider.speed - deceleration * (deltaTime / 1000));

          // Track coast distance
          const coastThisFrame = rider.speed * (deltaTime / 1000);
          rider.coastDistance += coastThisFrame;
        }
      }

      // Check for prime crossings
      this.checkPrimeCrossings(rider);
    }

    // Check for collisions
    this.checkCollisions();

    // Update time
    this.gameState.time += deltaTime;

    // Check if race is finished
    if (this.gameState.riders.every(r => r.finished)) {
      this.gameState.race.finished = true;
    }
  }

  /**
   * Process player input commands
   */
  processPlayerInput(commands: PlayerInput, deltaTime: number): void {
    if (!this.gameState) return;
    const player = this.gameState.riders.find(r => r.type === 'player') as ExtendedRider | undefined;
    if (!player || player.finished) return;

    const normalSpeed = this.config.race.defaultSpeed.mps;
    const maxSpeed = normalSpeed * this.config.race.playerControls.maxSpeedMultiplier;
    const minSpeed = normalSpeed * this.config.race.playerControls.minSpeedMultiplier;
    const acceleration = this.config.race.playerControls.acceleration;

    // Smooth speed adjustment
    if (commands.speedChange === 'increase') {
      player.speed = Math.min(maxSpeed, player.speed + acceleration * (deltaTime / 1000));
    }
    if (commands.speedChange === 'decrease') {
      player.speed = Math.max(minSpeed, player.speed - acceleration * (deltaTime / 1000));
    }

    // Lane change (smooth transition, triggered once per key press)
    if (commands.laneChange) {
      const targetLane =
        commands.laneChange === 'up' ? player.lane - 1 : player.lane + 1;

      if (targetLane >= 1 && targetLane <= this.config.race.lanes.total) {
        player.targetLane = targetLane;
        player.laneProgress = 0; // Start transition
      }
    }

    // Smooth lane transition animation
    if (player.targetLane !== undefined && player.targetLane !== player.lane) {
      const transitionSpeed = 5.0; // Lanes per second
      player.laneProgress = (player.laneProgress ?? 0) + (transitionSpeed * deltaTime) / 1000;

      if (player.laneProgress >= 1.0) {
        // Transition complete
        player.lane = player.targetLane;
        player.laneProgress = 0;
        player.targetLane = player.lane;
      }
    }
  }

  /**
   * Check for prime crossings
   */
  checkPrimeCrossings(rider: Rider): void {
    if (!this.gameState) return;
    for (const prime of this.gameState.race.primes) {
      if (prime.claimed) continue;

      // Check if rider just crossed the prime
      const crossed =
        rider.position >= prime.location && !prime.claimedBy.includes(rider.id);

      if (crossed) {
        prime.claimedBy.push(rider.id);

        // Award points (first 3 across)
        if (prime.claimedBy.length <= 3) {
          const points = [
            this.config.prime.points.first,
            this.config.prime.points.second,
            this.config.prime.points.third,
          ];
          rider.points += points[prime.claimedBy.length - 1];
        }

        // Mark as fully claimed after 3 riders
        if (prime.claimedBy.length >= 3) {
          prime.claimed = true;
        }
      }
    }
  }

  /**
   * Check for collisions between riders
   */
  checkCollisions(): void {
    if (!this.gameState) return;
    const { riders } = this.gameState;
    const finishLine = this.gameState.race.totalDistance;

    for (let i = 0; i < riders.length; i++) {
      for (let j = i + 1; j < riders.length; j++) {
        const riderA = riders[i];
        const riderB = riders[j];

        // No collisions once either rider has crossed the finish line
        if (riderA.position >= finishLine || riderB.position >= finishLine) continue;

        if (physics.checkCollision(riderA, riderB, this.config)) {
          // Determine rear rider
          const rearRider = riderA.position < riderB.position ? riderA : riderB;

          // Apply knockback
          rearRider.position = physics.applyCollisionKnockback(rearRider, this.config);
          rearRider.crashed = true;

          // Reset crash flag after a moment
          setTimeout(() => {
            rearRider.crashed = false;
          }, 1000);
        }
      }
    }
  }

  /**
   * Get current game state (read-only)
   */
  getState(): GameState {
    if (!this.gameState) throw new Error('Race not initialized');
    return this.gameState;
  }

  /**
   * Check if race is finished
   */
  isFinished(): boolean {
    return this.gameState?.race.finished ?? false;
  }
}
