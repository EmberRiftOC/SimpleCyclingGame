/**
 * Debug API — testing infrastructure
 *
 * Exposes window.gameDebug and window.debugTriggerCrash when the debug
 * token is present in the URL.  Only call installDebugApi() from inside
 * the game loop so `player` / `config` are live references.
 *
 * SECURITY NOTE: knockback is penalty-only.  Position is moved backwards
 * so this hook cannot be used to gain a position advantage.
 */

import type { Rider, GameConfig, GameState } from '../types';
import type { CameraController } from './camera.js';

// ─── Pure helpers (unit-testable) ─────────────────────────────────────────────

/**
 * Compute the new player position after a debug crash knockback.
 * Moves the player backwards by `knockbackMetres`, floored at 0.
 *
 * @param currentPosition - Player's current race position in metres
 * @param knockbackMetres - How far to knock the player back (must be >= 0)
 * @returns The new position (>= 0)
 */
export function computeKnockbackPosition(
  currentPosition: number,
  knockbackMetres: number,
): number {
  return Math.max(0, currentPosition - knockbackMetres);
}

/**
 * Compute the new player speed after a crash.
 * Applies the same `crashSpeedReduction` multiplier used by real collisions.
 *
 * @param currentSpeed  - Player's current speed in m/s
 * @param config        - Game config (reads drafting.crashSpeedReduction)
 * @returns The new (reduced) speed
 */
export function computeCrashSpeed(currentSpeed: number, config: GameConfig): number {
  const reduction = config.drafting.crashSpeedReduction ?? 0.5;
  return currentSpeed * reduction;
}

// ─── Side-effectful installer ──────────────────────────────────────────────────

export interface DebugApiOptions {
  player: Rider | undefined;
  config: GameConfig;
  gameState: GameState;
  camera: CameraController;
  raceStarted: boolean;
}

/**
 * Install (or refresh) window.gameDebug and window.debugTriggerCrash.
 * Call once per game-loop frame while DEBUG_ENABLED is true.
 *
 * @param opts - Live references from the game loop
 */
export function installDebugApi(opts: DebugApiOptions): void {
  const { player, config, gameState, camera, raceStarted } = opts;

  (window as any).debugTriggerCrash = (knockbackMetres: number = 4) => {
    if (!player || player.finished) return;
    player.position = computeKnockbackPosition(player.position, knockbackMetres);
    player.speed = computeCrashSpeed(player.speed, config);
    player.crashed = true;
    camera.onPlayerCrash(player.position);
    setTimeout(() => { player.crashed = false; }, 1000);
    console.debug('[debug] crash triggered — player at', player.position, 'speed now', player.speed);
  };

  (window as any).gameDebug = {
    player: player
      ? {
          lane: player.lane,
          x: player.position,
          energy: player.energy,
          speed: player.speed,
          isDrafting: player.isDrafting ?? false,
          drainRate: player.energyDrainRate,
        }
      : null,
    riders: gameState.riders.map(r => ({
      id: r.id,
      lane: r.lane,
      x: r.position,
      energy: r.energy,
      maxEnergy: r.maxEnergy,
      isPlayer: r.type === 'player',
      personality: r.type,
    })),
    race: {
      distanceCovered: player?.position ?? 0,
      distanceRemaining: gameState.race.totalDistance - (player?.position ?? 0),
      totalDistance: gameState.race.totalDistance,
      elapsedTime: gameState.time / 1000,
      started: raceStarted,
      finished: gameState.race.finished,
      primes: gameState.race.primes.map(p => ({
        position: p.location,
        crossed: p.claimed,
      })),
    },
  };
}
