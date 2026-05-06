/**
 * Unit tests for debug-api.ts
 *
 * Tests cover the pure helper functions (computeKnockbackPosition,
 * computeCrashSpeed) and the side-effectful installDebugApi() that
 * wires up window.gameDebug and window.debugTriggerCrash.
 *
 * Environment: jsdom (set in package.json → jest.testEnvironment)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  computeKnockbackPosition,
  computeCrashSpeed,
  installDebugApi,
} from '../../js/debug-api.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeConfig(crashSpeedReduction = 0.5) {
  return {
    drafting: { crashSpeedReduction },
  };
}

function makePlayer(overrides = {}) {
  return {
    id: 'player-1',
    type: 'player',
    lane: 1,
    position: 100,
    speed: 12,
    energy: 80,
    maxEnergy: 100,
    energyDrainRate: 0.1,
    crashed: false,
    finished: false,
    points: 0,
    coasting: false,
    coastDistance: 0,
    isDrafting: false,
    ...overrides,
  };
}

function makeGameState(player, extra = {}) {
  return {
    riders: [player],
    race: {
      totalDistance: 10000,
      primes: [],
      finished: false,
      finishOrder: [],
    },
    time: 5000,
    ...extra,
  };
}

function makeCamera() {
  const calls = [];
  return {
    onPlayerCrash: (pos) => calls.push(pos),
    _calls: calls,
  };
}

// ─── computeKnockbackPosition ─────────────────────────────────────────────────

describe('computeKnockbackPosition', () => {
  test('moves player back by the specified distance', () => {
    expect(computeKnockbackPosition(100, 4)).toBe(96);
  });

  test('handles non-integer knockback', () => {
    expect(computeKnockbackPosition(100, 2.5)).toBeCloseTo(97.5);
  });

  test('floors at 0 — never returns negative position', () => {
    expect(computeKnockbackPosition(3, 10)).toBe(0);
    expect(computeKnockbackPosition(0, 4)).toBe(0);
  });

  test('returns exact 0 when knockback equals position', () => {
    expect(computeKnockbackPosition(4, 4)).toBe(0);
  });

  test('default knockback of 4m works correctly', () => {
    // mirrors the API default: debugTriggerCrash(knockbackMetres = 4)
    expect(computeKnockbackPosition(50, 4)).toBe(46);
  });
});

// ─── computeCrashSpeed ────────────────────────────────────────────────────────

describe('computeCrashSpeed', () => {
  test('applies 50% speed reduction by default', () => {
    expect(computeCrashSpeed(12, makeConfig(0.5))).toBe(6);
  });

  test('applies custom crashSpeedReduction from config', () => {
    expect(computeCrashSpeed(10, makeConfig(0.7))).toBeCloseTo(7);
  });

  test('falls back to 0.5 when crashSpeedReduction is missing', () => {
    const configWithout = { drafting: {} };
    expect(computeCrashSpeed(20, configWithout)).toBe(10);
  });

  test('returns 0 for a stationary player', () => {
    expect(computeCrashSpeed(0, makeConfig(0.5))).toBe(0);
  });
});

// ─── installDebugApi — window.debugTriggerCrash ───────────────────────────────

describe('installDebugApi — window.debugTriggerCrash', () => {
  let player, camera, gameState, config;

  beforeEach(() => {
    player = makePlayer();
    camera = makeCamera();
    config = makeConfig(0.5);
    gameState = makeGameState(player);

    installDebugApi({ player, config, gameState, camera, raceStarted: true });
  });

  afterEach(() => {
    delete window.debugTriggerCrash;
    delete window.gameDebug;
  });

  test('window.debugTriggerCrash is defined after installDebugApi', () => {
    expect(typeof window.debugTriggerCrash).toBe('function');
  });

  test('default 4m knockback moves player back 4 metres', () => {
    window.debugTriggerCrash();
    expect(player.position).toBe(96);
  });

  test('custom knockback distance is applied', () => {
    window.debugTriggerCrash(8);
    expect(player.position).toBe(92);
  });

  test('player speed is halved on crash (crashSpeedReduction = 0.5)', () => {
    window.debugTriggerCrash();
    expect(player.speed).toBe(6);
  });

  test('player.crashed is set to true', () => {
    window.debugTriggerCrash();
    expect(player.crashed).toBe(true);
  });

  test('camera.onPlayerCrash is called with the new (knocked-back) position', () => {
    window.debugTriggerCrash(4);
    expect(camera._calls).toHaveLength(1);
    expect(camera._calls[0]).toBe(96);
  });

  test('does nothing when player.finished is true', () => {
    player.finished = true;
    const originalPosition = player.position;
    window.debugTriggerCrash();
    expect(player.position).toBe(originalPosition);
    expect(camera._calls).toHaveLength(0);
  });

  test('does nothing when player is undefined (race not started)', () => {
    installDebugApi({ player: undefined, config, gameState, camera, raceStarted: false });
    expect(() => window.debugTriggerCrash()).not.toThrow();
  });

  test('position never goes below 0 even with huge knockback', () => {
    player.position = 2;
    window.debugTriggerCrash(100);
    expect(player.position).toBe(0);
  });

  test('window.gameDebug.player.x reflects the new position after crash', () => {
    window.debugTriggerCrash(4);
    // Re-install so gameDebug.player reflects updated state (mirrors game loop refresh)
    installDebugApi({ player, config, gameState, camera, raceStarted: true });
    expect(window.gameDebug.player.x).toBe(96);
  });
});

// ─── installDebugApi — window.gameDebug ──────────────────────────────────────

describe('installDebugApi — window.gameDebug', () => {
  let player, camera, gameState, config;

  beforeEach(() => {
    player = makePlayer({ position: 250, energy: 75, speed: 11, lane: 2 });
    camera = makeCamera();
    config = makeConfig(0.5);
    gameState = makeGameState(player);
    installDebugApi({ player, config, gameState, camera, raceStarted: true });
  });

  afterEach(() => {
    delete window.debugTriggerCrash;
    delete window.gameDebug;
  });

  test('window.gameDebug is defined after installDebugApi', () => {
    expect(window.gameDebug).toBeDefined();
  });

  test('gameDebug.player.x matches current player position', () => {
    expect(window.gameDebug.player.x).toBe(250);
  });

  test('gameDebug.player.energy matches player energy', () => {
    expect(window.gameDebug.player.energy).toBe(75);
  });

  test('gameDebug.player.speed matches player speed', () => {
    expect(window.gameDebug.player.speed).toBe(11);
  });

  test('gameDebug.player.lane matches player lane', () => {
    expect(window.gameDebug.player.lane).toBe(2);
  });

  test('gameDebug.race.totalDistance matches config', () => {
    expect(window.gameDebug.race.totalDistance).toBe(10000);
  });

  test('gameDebug.race.distanceCovered matches player.position', () => {
    expect(window.gameDebug.race.distanceCovered).toBe(250);
  });

  test('gameDebug.race.distanceRemaining = totalDistance - player.position', () => {
    expect(window.gameDebug.race.distanceRemaining).toBe(9750);
  });

  test('gameDebug.race.started reflects raceStarted flag', () => {
    expect(window.gameDebug.race.started).toBe(true);
  });

  test('gameDebug.player is null when no player found', () => {
    installDebugApi({ player: undefined, config, gameState, camera, raceStarted: false });
    expect(window.gameDebug.player).toBeNull();
  });

  test('gameDebug.riders contains all riders with correct shape', () => {
    expect(window.gameDebug.riders).toHaveLength(1);
    const r = window.gameDebug.riders[0];
    expect(r).toMatchObject({
      id: 'player-1',
      lane: 2,
      x: 250,
      isPlayer: true,
    });
  });
});

// ─── Token gate (integration note) ───────────────────────────────────────────

describe('debug token gate (main.ts integration)', () => {
  test('pure helpers are accessible even without the URL token', () => {
    // These functions are exported and callable directly — the token gate
    // only controls installDebugApi() being called from the game loop.
    expect(computeKnockbackPosition(50, 4)).toBe(46);
    expect(computeCrashSpeed(10, makeConfig(0.5))).toBe(5);
  });
});
