/**
 * Input handling for player controls
 */

let inputState = {
  accelerate: false,
  brake: false,
  laneChange: null, // 'up' | 'down' | null
  speedChange: null // 'increase' | 'decrease' | null
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

function handleKeyDown(event) {
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

function handleKeyUp(event) {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
      inputState.laneChange = null;
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
 * Get current input state
 */
export function getPlayerInput() {
  return { ...inputState };
}

/**
 * Reset input state (useful for testing)
 */
export function resetInputState() {
  inputState = {
    accelerate: false,
    brake: false,
    laneChange: null,
    speedChange: null
  };
}
