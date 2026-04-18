/**
 * Main entry point - game loop and initialization
 */

import { loadConfigs } from './config.js';
import { RaceManager } from './race-manager.js';
import * as renderer from './renderer.js';
import * as input from './input.js';

const PHYSICS_STEP = 1000 / 60; // 60 physics updates per second
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;

let raceManager;
let lastTime = 0;
let accumulator = 0;
let gameRunning = false;

/**
 * Initialize game
 */
async function init() {
  try {
    console.log('Loading configs...');
    const configs = await loadConfigs();
    
    console.log('Initializing renderer...');
    renderer.initializeRenderer(CANVAS_WIDTH, CANVAS_HEIGHT);
    
    console.log('Setting up input...');
    input.setupKeyboardControls();
    
    console.log('Initializing race...');
    raceManager = new RaceManager(configs);
    raceManager.initializeRace();
    
    console.log('Starting game loop...');
    gameRunning = true;
    requestAnimationFrame(gameLoop);
    
    console.log('Game initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize game:', error);
    document.body.innerHTML = `
      <div style="color: white; padding: 20px;">
        <h1>Failed to load game</h1>
        <p>${error.message}</p>
      </div>
    `;
  }
}

/**
 * Main game loop - fixed timestep physics + variable rendering
 */
function gameLoop(currentTime) {
  if (!gameRunning) return;
  
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  accumulator += deltaTime;
  
  // Fixed-rate physics updates (deterministic)
  while (accumulator >= PHYSICS_STEP) {
    const playerCommands = input.getPlayerInput();
    raceManager.processPlayerInput(playerCommands, PHYSICS_STEP);
    raceManager.updateRace(PHYSICS_STEP);
    accumulator -= PHYSICS_STEP;
  }
  
  // Variable-rate rendering (smooth at any refresh rate)
  const gameState = raceManager.getState();
  const configs = { 
    race: raceManager.config.race,
    prime: raceManager.config.prime,
    drafting: raceManager.config.drafting
  };
  renderer.render(gameState, configs);
  
  // Check for race end
  if (raceManager.isFinished()) {
    handleRaceEnd(gameState);
    return;
  }
  
  requestAnimationFrame(gameLoop);
}

/**
 * Handle race end
 */
function handleRaceEnd(gameState) {
  gameRunning = false;
  
  const player = gameState.riders.find(r => r.type === 'player');
  const message = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 40px;
      border-radius: 10px;
      text-align: center;
      font-family: monospace;
    ">
      <h1>Race Finished!</h1>
      <p style="font-size: 24px; margin: 20px 0;">
        Position: ${player.finishPosition} / ${gameState.riders.length}
      </p>
      <p style="font-size: 20px;">
        Points: ${player.points}<br>
        Energy remaining: ${Math.round(player.energy)}%
      </p>
      <button onclick="location.reload()" style="
        margin-top: 20px;
        padding: 10px 20px;
        font-size: 18px;
        cursor: pointer;
      ">
        Race Again
      </button>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', message);
}

// Start game on page load
window.addEventListener('load', init);
