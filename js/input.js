/**
 * Input handling for player controls
 */

let inputState = {
  accelerate: false,
  brake: false,
  laneChange: null // 'left' | 'right' | null
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
      inputState.accelerate = true;
      event.preventDefault();
      break;
    case 'ArrowDown':
      inputState.brake = true;
      event.preventDefault();
      break;
    case 'ArrowLeft':
      inputState.laneChange = 'left';
      event.preventDefault();
      break;
    case 'ArrowRight':
      inputState.laneChange = 'right';
      event.preventDefault();
      break;
  }
}

function handleKeyUp(event) {
  switch (event.key) {
    case 'ArrowUp':
      inputState.accelerate = false;
      break;
    case 'ArrowDown':
      inputState.brake = false;
      break;
    case 'ArrowLeft':
    case 'ArrowRight':
      inputState.laneChange = null;
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
    laneChange: null
  };
}
