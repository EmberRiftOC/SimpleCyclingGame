/**
 * ArrowIndicator — pulsing downward arrow above the player sprite.
 *
 * Appears at race start, pulses for 3 seconds, then disappears.
 * Replaces the sprite-flash identification mechanic from task-018.
 *
 * Rendering is handled by the renderer (this class only manages state/timing).
 */

/** How long the arrow is visible (ms) */
const DURATION_MS = 3000;

/** Pulse cycle duration (ms) — one full sine wave */
const PULSE_CYCLE_MS = 600;

export class ArrowIndicator {
  /** Whether the arrow should be drawn this frame */
  visible = false;

  /** Time elapsed since arrow appeared (ms) */
  elapsed = 0;

  /** Start the arrow at race start */
  start(): void {
    this.visible = true;
    this.elapsed = 0;
  }

  /** Reset to idle (new race / Race Again) */
  reset(): void {
    this.visible = false;
    this.elapsed = 0;
  }

  /**
   * Advance arrow by deltaTime (ms).
   * Hides automatically after DURATION_MS.
   */
  update(deltaTime: number): void {
    if (!this.visible) return;

    this.elapsed += deltaTime;
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
