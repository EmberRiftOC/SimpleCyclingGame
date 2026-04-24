/**
 * Main entry point - game loop and initialization
 */

import type { GameConfig } from '../types';
import { loadConfigs, applyDifficulty, DIFFICULTY_PRESETS, type Difficulty } from './config.js';
import { RaceManager } from './race-manager.js';
import * as renderer from './renderer.js';
import { setPlayerFlashVisible, setCameraPosition, setArrowState } from './renderer.js';
import * as input from './input.js';
import { Countdown } from './countdown.js';
import { ArrowIndicator } from './arrow-indicator.js';
import { CameraController } from './camera.js';

const PHYSICS_STEP = 1000 / 60; // 60 physics updates per second
const ASPECT_RATIO = 2; // width:height = 2:1

// Debug mode — only active when ?debug=<token> is present in URL
const DEBUG_TOKEN = 'a3f9e2b1c84d7f0e6a5b2c1d9e8f7a4b';
const _debugParam = new URLSearchParams(window.location.search).get('debug');
const DEBUG_ENABLED = _debugParam === DEBUG_TOKEN;

let raceManager: RaceManager | null = null;
let configs: GameConfig;
let selectedDifficulty: Difficulty = 'medium';
let lastTime = 0;
let accumulator = 0;
let gameRunning = false;
let raceStarted = false; // Set true only after countdown finishes
let raceStartTime = 0;

// Countdown
const countdown = new Countdown();
let countdownOverlay: HTMLDivElement | null = null;

// Arrow indicator (identifies player sprite at race start)
const arrowIndicator = new ArrowIndicator();

// Camera controller (handles crash-pan smoothing)
const camera = new CameraController();
let prevPlayerCrashed = false; // edge-detect crash flag

/**
 * Calculate canvas dimensions to fill the viewport while maintaining aspect ratio
 */
function getCanvasDimensions(): { width: number; height: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let width = vw;
  let height = Math.round(width / ASPECT_RATIO);
  if (height > vh) {
    height = vh;
    width = Math.round(height * ASPECT_RATIO);
  }
  return { width, height };
}

/**
 * Initialize game assets and show splash screen
 */
async function init(): Promise<void> {
  try {
    console.log('Loading configs...');
    configs = await loadConfigs();

    console.log('Initializing renderer...');
    const { width, height } = getCanvasDimensions();
    renderer.initializeRenderer(width, height);

    window.addEventListener('resize', handleResize);
    input.setupKeyboardControls();

    // Populate debug state with pre-race sentinel so AC7 is testable before START
    if (DEBUG_ENABLED) {
      (window as any).gameDebug = {
        player: null,
        riders: [],
        race: {
          distanceCovered: 0,
          distanceRemaining: configs.race.distance.meters,
          totalDistance: configs.race.distance.meters,
          elapsedTime: 0,
          started: false,
          finished: false,
          primes: [],
        },
      };
    }

    showSplashScreen();
  } catch (error) {
    console.error('Failed to initialize game:', error);
    const message = error instanceof Error ? error.message : String(error);
    document.body.innerHTML = `
      <div style="color: white; padding: 20px; font-family: monospace;">
        <h1>Failed to load game</h1>
        <p>${message}</p>
      </div>
    `;
  }
}

/**
 * Show the Breakaway splash screen
 */
function showSplashScreen(): void {
  const splash = document.createElement('div');
  splash.id = 'splash-screen';
  splash.innerHTML = `
    <div class="splash-inner">
      <div class="splash-title">BREAKAWAY</div>

      <div class="splash-difficulty">
        <button class="diff-btn" data-diff="easy">EASY</button>
        <button class="diff-btn diff-btn--selected" data-diff="medium">MEDIUM</button>
        <button class="diff-btn" data-diff="hard">HARD</button>
      </div>

      <div class="splash-controls">
        <div>← → &nbsp; Speed</div>
        <div>↑ ↓ &nbsp; Change Lane</div>
        <div>Draft behind AI to conserve energy</div>
      </div>
      <button id="start-btn" class="splash-btn">START RACE</button>
    </div>
  `;
  document.body.appendChild(splash);

  // Difficulty button selection
  splash.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      splash.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('diff-btn--selected'));
      btn.classList.add('diff-btn--selected');
      selectedDifficulty = (btn as HTMLElement).dataset.diff as Difficulty;
    });
  });

  document.getElementById('start-btn')!.addEventListener('click', () => {
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.4s ease';
    setTimeout(() => {
      splash.remove();
      beginCountdown();
    }, 400);
  });
}

/**
 * Show countdown overlay, render cyclists at start, then start race
 */
function beginCountdown(): void {
  // Initialize race manager and render the starting grid — but don't advance physics yet
  const difficultyConfigs = applyDifficulty(configs, selectedDifficulty);
  raceManager = new RaceManager(difficultyConfigs);
  raceManager.initializeRace();

  // Render one frame so cyclists are visible at start line
  const gameState = raceManager.getState();
  const renderConfigs = {
    race: raceManager.config.race,
    prime: raceManager.config.prime,
    drafting: raceManager.config.drafting,
  };
  renderer.render(gameState, renderConfigs);

  // Build countdown overlay
  countdownOverlay = document.createElement('div');
  countdownOverlay.id = 'countdown-overlay';
  countdownOverlay.setAttribute('aria-live', 'assertive');
  countdownOverlay.setAttribute('aria-atomic', 'true');
  updateCountdownOverlay();
  document.body.appendChild(countdownOverlay);

  // Block input during countdown
  input.resetInputState();
  // Ensure camera isn't influencing renderer during countdown
  setCameraPosition(null);

  // Kick off countdown loop
  countdown.start();
  lastTime = performance.now();
  requestAnimationFrame(countdownLoop);
}

/** Update the countdown overlay text */
function updateCountdownOverlay(): void {
  if (!countdownOverlay) return;
  const text = countdown.getText();
  const isGo = text === 'GO!';
  countdownOverlay.textContent = text;
  countdownOverlay.className = isGo ? 'countdown-go' : '';
}

/**
 * Animation loop that runs only during countdown phase
 */
function countdownLoop(currentTime: number): void {
  const deltaTime = Math.min(currentTime - lastTime, 100);
  lastTime = currentTime;

  countdown.update(deltaTime);
  updateCountdownOverlay();

  if (countdown.isFinished) {
    // Remove overlay and start race
    if (countdownOverlay) {
      countdownOverlay.remove();
      countdownOverlay = null;
    }
    startRace();
    return;
  }

  requestAnimationFrame(countdownLoop);
}

/**
 * Start a new race
 */
function startRace(): void {
  raceStarted = true; // Guard: confirms countdown has finished
  // raceManager is already initialized in beginCountdown() — just start the loop
  if (!raceManager) {
    // Fallback: shouldn't normally happen, but guard against it
    const difficultyConfigs = applyDifficulty(configs, selectedDifficulty);
    raceManager = new RaceManager(difficultyConfigs);
    raceManager.initializeRace();
  }
  lastTime = performance.now(); // Must match rAF clock to avoid catch-up burst
  accumulator = 0;
  raceStartTime = performance.now();
  gameRunning = true;

  // Show pulsing arrow above player for first 3 seconds of game time
  // Pass gameState.time=0 at race start (clock is reset by initializeRace)
  arrowIndicator.start(0);

  // Reset camera to player's starting position
  if (raceManager) {
    const initState = raceManager.getState();
    const initPlayer = initState.riders.find(r => r.type === 'player');
    camera.reset(initPlayer?.position ?? 0);
  }
  prevPlayerCrashed = false;

  requestAnimationFrame(gameLoop);
}

/**
 * Handle window resize - reinitialize renderer at new dimensions
 */
function handleResize(): void {
  const { width, height } = getCanvasDimensions();
  renderer.initializeRenderer(width, height);
}

/**
 * Main game loop - fixed timestep physics + variable rendering
 * Only runs after startRace() is called (not during splash screen)
 */
function gameLoop(currentTime: number): void {
  if (!gameRunning || !raceStarted || !raceManager) return;
  const rm = raceManager; // narrow type for TS

  const rawDelta = currentTime - lastTime;
  lastTime = currentTime;
  // Cap delta at 100ms to prevent physics burst after tab switch or long splash wait
  const deltaTime = Math.min(rawDelta, 100);
  accumulator += deltaTime;

  // Fixed-rate physics updates (deterministic)
  while (accumulator >= PHYSICS_STEP) {
    const playerCommands = input.getPlayerInput();
    rm.processPlayerInput(playerCommands, PHYSICS_STEP);
    rm.updateRace(PHYSICS_STEP);
    accumulator -= PHYSICS_STEP;
  }

  // Variable-rate rendering (smooth at any refresh rate)
  const gameState = rm.getState();

  // Expose debug state (only when debug token is present in URL)
  if (DEBUG_ENABLED) {
    const player = gameState.riders.find(r => r.type === 'player');

    /**
     * window.debugTriggerCrash(knockbackMetres = 4)
     * Instantly knock the player back, simulating a collision.
     * Triggers the crash-camera pan so it can be observed/tested.
     * NOTE: knockback only (penalty), no position advantage possible.
     */
    (window as any).debugTriggerCrash = (knockbackMetres: number = 4) => {
      if (!player || player.finished) return;
      player.position = Math.max(0, player.position - knockbackMetres);
      // Apply same speed reduction as a real crash
      player.speed = player.speed * (rm.config.drafting.crashSpeedReduction ?? 0.5);
      player.crashed = true;
      camera.onPlayerCrash(player.position);
      setTimeout(() => { player.crashed = false; }, 1000);
      console.debug('[debug] crash triggered — player at', player.position, 'speed now', player.speed);
    };

    (window as any).gameDebug = {
      player: player ? {
        lane: player.lane,
        x: player.position,
        energy: player.energy,
        speed: player.speed,
        isDrafting: player.isDrafting ?? false,
        drainRate: player.energyDrainRate,
      } : null,
      riders: gameState.riders.map(r => ({
        id: r.id,
        lane: r.lane,
        x: r.position,
        energy: r.energy,           // absolute value (player: 0-100, AI: 0-150)
        maxEnergy: r.maxEnergy,     // ceiling for this rider
        isPlayer: r.type === 'player',
        personality: r.type,        // 'player' | 'aggressive' | 'balanced' | 'defensive'
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

  // Tick arrow indicator off the authoritative game clock
  arrowIndicator.update(gameState.time);
  setArrowState({ visible: arrowIndicator.visible, pulse: arrowIndicator.getPulse() });
  // Player sprite always fully visible (no flash)
  setPlayerFlashVisible(true);

  // Camera: detect crash edge and tick
  const player = gameState.riders.find(r => r.type === 'player');
  if (player) {
    const justCrashed = player.crashed && !prevPlayerCrashed;
    if (justCrashed) {
      camera.onPlayerCrash(player.position);
    }
    prevPlayerCrashed = player.crashed;
    camera.update(deltaTime, player.position);
    setCameraPosition(camera.position);
  }

  const renderConfigs = {
    race: rm.config.race,
    prime: rm.config.prime,
    drafting: rm.config.drafting,
  };
  renderer.render(gameState, renderConfigs);

  // Check for race end
  if (rm.isFinished()) {
    gameRunning = false;
    const raceTimeMs = currentTime - raceStartTime;
    setTimeout(() => handleRaceEnd(raceTimeMs), 1500);
    return;
  }

  requestAnimationFrame(gameLoop);
}

/**
 * Format milliseconds into MM:SS.ss
 */
function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Get ordinal suffix for placement
 */
function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

/**
 * Get placement color class
 */
function placementColor(pos: number): string {
  if (pos === 1) return '#FFD700'; // Gold
  if (pos === 2) return '#C0C0C0'; // Silver
  if (pos === 3) return '#CD7F32'; // Bronze
  return '#ffffff';
}

/**
 * Show finish screen with race results
 */
function handleRaceEnd(raceTimeMs: number): void {
  if (!raceManager) return;
  const gameState = raceManager.getState();
  const player = gameState.riders.find(r => r.type === 'player');
  if (!player) return;

  const pos = player.finishPosition ?? gameState.riders.length;
  const total = gameState.riders.length;
  const color = placementColor(pos);
  const podium = pos <= 3;

  const finish = document.createElement('div');
  finish.id = 'finish-screen';
  finish.innerHTML = `
    <div class="finish-inner">
      <div class="finish-label">RACE COMPLETE</div>
      <div class="finish-placement" style="color: ${color}">
        ${ordinal(pos).toUpperCase()}
        ${podium ? '<span class="finish-trophy">' + (pos === 1 ? '🏆' : pos === 2 ? '🥈' : '🥉') + '</span>' : ''}
      </div>
      <div class="finish-subtext">of ${total} riders</div>
      <div class="finish-stats">
        <div class="stat"><span class="stat-label">POINTS</span><span class="stat-value">${player.points}</span></div>
        <div class="stat"><span class="stat-label">TIME</span><span class="stat-value">${formatTime(raceTimeMs)}</span></div>
        <div class="stat"><span class="stat-label">ENERGY</span><span class="stat-value">${Math.round(player.energy)}%</span></div>
      </div>
      <button id="race-again-btn" class="splash-btn">RACE AGAIN</button>
    </div>
  `;
  document.body.appendChild(finish);

  document.getElementById('race-again-btn')!.addEventListener('click', () => {
    finish.remove();
    raceStarted = false;
    gameRunning = false;
    raceManager = null;
    countdown.reset();
    arrowIndicator.reset();
    setArrowState({ visible: false, pulse: 0 });
    setPlayerFlashVisible(true);
    camera.reset();
    setCameraPosition(null);
    prevPlayerCrashed = false;
    beginCountdown();
  });
}

// Start on page load
window.addEventListener('load', init);
