/**
 * Race Manager - orchestrates all game systems
 */

import { createGameState, createRider } from './game-state.js';
import { generatePrimeLocations } from './utils.js';
import * as physics from './physics.js';
import * as ai from './ai.js';

export class RaceManager {
  constructor(config) {
    this.config = config;
    this.gameState = null;
    this.initialized = false;
  }
  
  /**
   * Initialize race with riders and primes
   */
  initializeRace() {
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
    const aiTypes = ['aggressive', 'balanced', 'defensive', 'balanced'];
    const lanes = [1, 2, 4, 5]; // Skip lane 3 (player)
    
    for (let i = 0; i < lanes.length; i++) {
      const type = aiTypes[i % aiTypes.length];
      const aiRider = createRider(`ai-${i}`, type, lanes[i], this.config);
      this.gameState.riders.push(aiRider);
    }
    
    this.initialized = true;
  }
  
  /**
   * Update race state for one physics step
   */
  updateRace(deltaTime) {
    if (!this.initialized) return;
    
    // Update each rider
    for (const rider of this.gameState.riders) {
      if (rider.finished) continue;
      
      // AI decision-making
      if (rider.type !== 'player') {
        const aiDecision = ai.updateAI(rider, this.gameState, this.config);
        rider.speed = ai.adjustSpeed(rider.speed, aiDecision.speed, deltaTime);
      }
      
      // Find draft target
      const draftTarget = physics.findDraftTarget(rider, this.gameState.riders);
      let draftMultiplier = 1.0;
      
      if (draftTarget) {
        const distance = draftTarget.position - rider.position;
        draftMultiplier = physics.calculateDraftMultiplier(distance, this.config);
      }
      
      // Update energy
      rider.energy = physics.calculateEnergyDrain(
        rider,
        this.config,
        draftMultiplier,
        deltaTime
      );
      
      // Apply zero energy penalty
      if (rider.energy === 0) {
        const normalSpeed = this.config.race.defaultSpeed.mps;
        rider.speed = normalSpeed * this.config.energy.zeroEnergyPenalty.speedMultiplier;
      }
      
      // Update position
      rider.position = physics.updatePosition(rider, deltaTime);
      
      // Check for finish
      if (rider.position >= this.gameState.race.totalDistance) {
        rider.finished = true;
        rider.finishPosition = this.gameState.race.finishOrder.length + 1;
        this.gameState.race.finishOrder.push(rider.id);
        
        // Award finish points
        if (rider.finishPosition <= 3) {
          const points = [
            this.config.prime.finishPoints.first,
            this.config.prime.finishPoints.second,
            this.config.prime.finishPoints.third
          ];
          rider.points += points[rider.finishPosition - 1];
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
  processPlayerInput(commands, deltaTime) {
    const player = this.gameState.riders.find(r => r.type === 'player');
    if (!player || player.finished) return;
    
    const normalSpeed = this.config.race.defaultSpeed.mps;
    const maxSpeed = normalSpeed * 1.5;
    const minSpeed = normalSpeed * 0.3;
    const acceleration = 3.0; // m/s per second
    
    // Smooth speed adjustment
    if (commands.speedChange === 'increase') {
      player.speed = Math.min(maxSpeed, player.speed + acceleration * (deltaTime / 1000));
    }
    if (commands.speedChange === 'decrease') {
      player.speed = Math.max(minSpeed, player.speed - acceleration * (deltaTime / 1000));
    }
    
    // Lane change (instant, triggered once per key press)
    if (commands.laneChange) {
      const newLane = commands.laneChange === 'up' 
        ? player.lane - 1 
        : player.lane + 1;
      
      if (newLane >= 1 && newLane <= this.config.race.lanes.total) {
        player.lane = newLane;
      }
    }
  }
  
  /**
   * Check for prime crossings
   */
  checkPrimeCrossings(rider) {
    for (const prime of this.gameState.race.primes) {
      if (prime.claimed) continue;
      
      // Check if rider just crossed the prime
      const crossed = rider.position >= prime.location && 
                     !prime.claimedBy.includes(rider.id);
      
      if (crossed) {
        prime.claimedBy.push(rider.id);
        
        // Award points (first 3 across)
        if (prime.claimedBy.length <= 3) {
          const points = [
            this.config.prime.points.first,
            this.config.prime.points.second,
            this.config.prime.points.third
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
  checkCollisions() {
    for (let i = 0; i < this.gameState.riders.length; i++) {
      for (let j = i + 1; j < this.gameState.riders.length; j++) {
        const riderA = this.gameState.riders[i];
        const riderB = this.gameState.riders[j];
        
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
  getState() {
    return this.gameState;
  }
  
  /**
   * Check if race is finished
   */
  isFinished() {
    return this.gameState?.race.finished || false;
  }
}
