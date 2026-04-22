/**
 * PlayerFlash — manages the race-start "which sprite is you?" flash effect.
 *
 * Flashes the player sprite 3 times (hidden/visible, 200ms each toggle)
 * immediately after GO!, then stays visible permanently.
 *
 * Usage:
 *   const flash = new PlayerFlash();
 *   flash.start();                  // call when race begins
 *   flash.update(deltaTimeMs);      // call each frame
 *   if (flash.isVisible) { draw(); }
 */

/** How long each on/off toggle lasts (ms) */
const TOGGLE_MS = 200;

/** Total number of on/off toggles: 3 flashes × 2 states = 6 */
const TOTAL_TOGGLES = 6;

export class PlayerFlash {
  /** Whether the flash sequence is running */
  isActive = false;

  /** Whether the player sprite should be drawn this frame */
  isVisible = true;

  /** Time elapsed in the current toggle phase (ms) */
  private elapsed = 0;

  /** How many toggles have occurred so far */
  private toggleCount = 0;

  /** Trigger flash sequence — call at race start */
  start(): void {
    this.isActive = true;
    this.isVisible = false; // Begin hidden (first flash = appear)
    this.elapsed = 0;
    this.toggleCount = 0;
  }

  /** Reset to idle state */
  reset(): void {
    this.isActive = false;
    this.isVisible = true;
    this.elapsed = 0;
    this.toggleCount = 0;
  }

  /**
   * Advance flash by deltaTime (ms).
   * No-op when not active.
   */
  update(deltaTime: number): void {
    if (!this.isActive) return;

    this.elapsed += deltaTime;

    while (this.elapsed >= TOGGLE_MS) {
      this.elapsed -= TOGGLE_MS;
      this.isVisible = !this.isVisible;
      this.toggleCount++;

      if (this.toggleCount >= TOTAL_TOGGLES) {
        // Sequence complete — ensure player is always visible after
        this.isVisible = true;
        this.isActive = false;
        break;
      }
    }
  }
}
