/**
 * ArrowIndicator — pulsing downward arrow above the player sprite.
 *
 * Appears at race start, pulses for 3 seconds, then disappears.
 * Replaces the sprite-flash identification mechanic from task-018.
 *
 * Timing is driven by the caller passing the authoritative game clock
 * (gameState.time) via setGameTime() each frame, rather than accumulating
 * a local delta. This avoids any drift between render-frame deltas and the
 * physics clock.
 */

/** How long the arrow is visible (ms of game time) */
export const DURATION_MS = 3000;

/** Pulse cycle duration (ms) — one full sine wave */
export const PULSE_CYCLE_MS = 600;

export class ArrowIndicator {
  /** Whether the arrow should be drawn this frame */
  visible = false;

  /** Game-clock time when arrow was started (ms) — set by start() */
  private startTime = 0;

  /** Current game-clock elapsed since start (ms) */
  elapsed = 0;

  /**
   * Start the arrow. Call once when the race begins.
   * @param gameTime  Current gameState.time (ms)
   */
  start(gameTime = 0): void {
    this.visible = true;
    this.startTime = gameTime;
    this.elapsed = 0;
  }

  /** Reset to idle (new race / Race Again) */
  reset(): void {
    this.visible = false;
    this.startTime = 0;
    this.elapsed = 0;
  }

  /**
   * Update arrow state from the authoritative game clock.
   * Call once per frame while the race is running.
   * @param gameTime  Current gameState.time (ms)
   */
  update(gameTime: number): void {
    if (!this.visible) return;

    this.elapsed = gameTime - this.startTime;
    if (this.elapsed >= DURATION_MS) {
      this.elapsed = DURATION_MS; // clamp
      this.visible = false;
    }
  }

  /**
   * Returns pulse value in [0, 1].
   * 0 = minimum (smaller/dimmer), 1 = maximum (larger/brighter).
   * Driven by a sine wave at PULSE_CYCLE_MS frequency.
   */
  getPulse(): number {
    const t = (this.elapsed % PULSE_CYCLE_MS) / PULSE_CYCLE_MS;
    return 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  }
}
