/**
 * Input handling for player controls
 */

import type { PlayerInput } from '../types';

let inputState: PlayerInput = {
  accelerate: false,
  brake: false,
  laneChange: null, // 'up' | 'down' | null (one-shot, cleared after read)
  speedChange: null // 'increase' | 'decrease' | null (continuous)
};

/**
 * Setup keyboard controls
 */
export function setupKeyboardControls() {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
}

/**
 * Cleanup keyboard controls
 */
export function removeKeyboardControls() {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
}

function handleKeyDown(event: KeyboardEvent): void {
  // Ignore key repeats (holding key down)
  if (event.repeat) return;
  
  switch (event.key) {
    case 'ArrowUp':
      inputState.laneChange = 'up';
      event.preventDefault();
      break;
    case 'ArrowDown':
      inputState.laneChange = 'down';
      event.preventDefault();
      break;
    case 'ArrowLeft':
      inputState.speedChange = 'decrease';
      event.preventDefault();
      break;
    case 'ArrowRight':
      inputState.speedChange = 'increase';
      event.preventDefault();
      break;
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
      // Lane change is one-shot, cleared after processing
      // No action needed on keyup
      break;
    case 'ArrowLeft':
    case 'ArrowRight':
      inputState.speedChange = null;
      break;
  }
}

/**
 * Setup touch controls (for mobile)
 */
export function setupTouchControls() {
  // TODO: Implement touch controls
  console.log('Touch controls not yet implemented');
}

/**
 * Get current input state and clear one-shot events
 */
export function getPlayerInput(): PlayerInput {
  const input = { ...inputState };
  
  // Clear one-shot lane change after read
  inputState.laneChange = null;
  
  return input;
}

/**
 * Reset input state (useful for testing)
 */
export function resetInputState(): void {
  inputState = {
    accelerate: false,
    brake: false,
    laneChange: null,
    speedChange: null
  };
}
