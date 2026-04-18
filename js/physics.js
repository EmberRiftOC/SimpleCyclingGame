/**
 * Physics engine - movement, energy drain, collisions
 */

/**
 * Calculate energy drain for a rider based on speed and drafting
 */
export function calculateEnergyDrain(rider, config, draftMultiplier, deltaTime) {
  if (rider.energy <= 0) return 0;
  
  const { baseRate, exponent } = config.energy.depletionFormula;
  const normalSpeed = config.race.defaultSpeed.mps;
  
  const speedRatio = rider.speed / normalSpeed;
  const drainRate = baseRate * Math.pow(speedRatio, exponent);
  const drain = drainRate * draftMultiplier * (deltaTime / 1000);
  
  return Math.max(0, rider.energy - drain);
}

/**
 * Update rider position based on speed
 */
export function updatePosition(rider, deltaTime) {
  const distance = rider.speed * (deltaTime / 1000);
  return rider.position + distance;
}

/**
 * Calculate drafting energy multiplier based on distance to target
 */
export function calculateDraftMultiplier(distance, config) {
  const { draftZones, bikeLengthInMeters } = config.drafting;
  const bikeLengths = distance / bikeLengthInMeters;
  
  for (const zone of draftZones) {
    if (bikeLengths >= zone.minDistance && bikeLengths < zone.maxDistance) {
      return zone.energyMultiplier;
    }
  }
  
  return 1.0;
}

/**
 * Check if two riders are colliding
 */
export function checkCollision(riderA, riderB, config) {
  if (riderA.lane !== riderB.lane) return false;
  
  const distance = Math.abs(riderA.position - riderB.position);
  const { collisionThreshold, bikeLengthInMeters } = config.drafting;
  const collisionDistance = collisionThreshold * bikeLengthInMeters;
  
  return distance < collisionDistance;
}

/**
 * Apply collision knockback to rear rider
 */
export function applyCollisionKnockback(rider, config) {
  const { collisionKnockback, bikeLengthInMeters } = config.drafting;
  const knockbackBikeLengths = collisionKnockback.min + 
    Math.random() * (collisionKnockback.max - collisionKnockback.min);
  const knockbackDistance = knockbackBikeLengths * bikeLengthInMeters;
  
  return Math.max(0, rider.position - knockbackDistance);
}

/**
 * Find the closest rider ahead in the same lane
 */
export function findDraftTarget(rider, riders) {
  let closest = null;
  let minDistance = Infinity;
  
  for (const other of riders) {
    if (other.id === rider.id) continue;
    if (other.lane !== rider.lane) continue;
    if (other.position <= rider.position) continue;
    
    const distance = other.position - rider.position;
    if (distance < minDistance) {
      minDistance = distance;
      closest = other;
    }
  }
  
  return closest;
}
