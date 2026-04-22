/**
 * CameraController — manages the camera (viewport origin) position.
 *
 * Normally the camera tracks the player directly. After a collision knockback
 * it enters a two-phase crash-pan mode:
 *
 *   1. CRASH_DELAY (300 ms) — camera freezes at current position so the player
 *      "falls back" through the viewport, communicating the penalty visually.
 *
 *   2. CRASH_PAN (~1 s, ease-out) — camera accelerates toward the player then
 *      decelerates as it approaches, landing smoothly without a snap.
 *
 * Player input is NOT locked during either phase.
 * A second crash during CRASH_PAN re-starts the ease-out toward the new target.
 */

const DELAY_MS = 300;           // Freeze duration after crash (ms)
const PAN_DURATION_MS = 1000;   // Target pan duration (ms)
const CATCH_THRESHOLD = 0.5;    // Metres — close enough to snap and return to NORMAL

const enum State {
  NORMAL,
  CRASH_DELAY,
  CRASH_PAN,
}

export class CameraController {
  /** Current camera position (metres along course) */
  position = 0;

  private state: State = State.NORMAL;

  // ── CRASH_DELAY state ──────────────────────────────────────────────
  private delayElapsed = 0;
  private frozenPosition = 0;

  // ── CRASH_PAN state ────────────────────────────────────────────────
  private panElapsed = 0;
  private panStartPosition = 0;
  private panStartDistance = 0; // distance to player when pan began

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Call once per game-loop frame.
   * @param deltaMs    Frame delta time (ms)
   * @param playerPos  Player's current position (metres)
   */
  update(deltaMs: number, playerPos: number): void {
    switch (this.state) {
      case State.NORMAL:
        this.position = playerPos;
        break;

      case State.CRASH_DELAY:
        this.delayElapsed += deltaMs;
        if (this.delayElapsed >= DELAY_MS) {
          this._startPan(playerPos);
        }
        // Camera stays frozen during delay
        break;

      case State.CRASH_PAN:
        this._updatePan(deltaMs, playerPos);
        break;
    }
  }

  /**
   * Notify the camera that the player just crashed and was knocked back.
   * @param newPlayerPos  Player position after knockback (metres)
   */
  onPlayerCrash(newPlayerPos: number): void {
    if (this.state === State.CRASH_PAN) {
      // Already panning — skip delay, accelerate toward new target immediately.
      this._startPan(newPlayerPos);
    } else {
      // Begin delay phase, freeze at current position.
      this.frozenPosition = this.position;
      this.delayElapsed = 0;
      this.state = State.CRASH_DELAY;
    }
  }

  /**
   * Reset camera (e.g. new race). Camera snaps directly to position.
   * @param pos  Starting position (metres)
   */
  reset(pos = 0): void {
    this.position = pos;
    this.state = State.NORMAL;
    this.delayElapsed = 0;
    this.panElapsed = 0;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _startPan(playerPos: number): void {
    this.panStartPosition = this.position;
    this.panStartDistance = Math.abs(playerPos - this.position);
    this.panElapsed = 0;
    this.state = State.CRASH_PAN;
  }

  private _updatePan(deltaMs: number, playerPos: number): void {
    this.panElapsed += deltaMs;

    const distance = playerPos - this.position; // negative: player is behind camera

    // If close enough, snap and return to normal
    if (Math.abs(distance) <= CATCH_THRESHOLD) {
      this.position = playerPos;
      this.state = State.NORMAL;
      return;
    }

    // Quadratic ease-out: velocity starts at peak and slows as t → 1
    // t goes 0→1 over PAN_DURATION_MS.  We clamp so we never overshoot.
    const t = Math.min(1, this.panElapsed / PAN_DURATION_MS);
    const velocityFactor = 1 - t;          // 1 at start, 0 at end
    const remainingDist = Math.abs(distance);

    // Peak velocity: cover panStartDistance in PAN_DURATION_MS at constant speed.
    // Using twice that as peak so ease-out averages to the right timing.
    const peakVelocity = (2 * this.panStartDistance) / (PAN_DURATION_MS / 1000);

    // Current velocity (m/s), directed toward player
    const speed = peakVelocity * velocityFactor;
    const step = speed * (deltaMs / 1000);

    // Clamp to remaining distance so we never overshoot
    const actualStep = Math.min(step, remainingDist);
    this.position += Math.sign(distance) * actualStep;

    // If pan duration has fully elapsed without catching up, use a slow fallback
    // approach so we always converge even if player is moving away.
    if (t >= 1 && Math.abs(playerPos - this.position) > CATCH_THRESHOLD) {
      // Fallback: close 20% of remaining gap per frame (exponential approach)
      const fallbackStep = Math.abs(playerPos - this.position) * 0.1 * (deltaMs / 16);
      this.position += Math.sign(playerPos - this.position) * Math.min(fallbackStep, Math.abs(playerPos - this.position));
    }
  }
}
