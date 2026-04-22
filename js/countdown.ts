/**
 * Race start countdown (3-2-1-GO!)
 *
 * Tracks countdown state independently of the game loop.
 * Callers are responsible for rendering; this class only manages timing.
 */

/** Duration each countdown step is displayed (ms) */
const STEP_DURATION_MS = 1000;

/** Duration the "GO!" text is shown before the countdown finishes (ms) */
const GO_DISPLAY_MS = 800;

export class Countdown {
  /** Current step: 3 → 2 → 1 → 0 (GO!) */
  currentStep = 3;

  /** Whether the countdown is actively ticking */
  isActive = false;

  /** Whether the countdown has fully completed (GO! has faded) */
  isFinished = false;

  /** Time elapsed in the current step (ms) */
  private elapsed = 0;

  /** Start (or restart) the countdown */
  start(): void {
    this.currentStep = 3;
    this.elapsed = 0;
    this.isActive = true;
    this.isFinished = false;
  }

  /** Reset to idle state */
  reset(): void {
    this.currentStep = 3;
    this.elapsed = 0;
    this.isActive = false;
    this.isFinished = false;
  }

  /** Returns the display string for the current step */
  getText(): string {
    return this.currentStep > 0 ? String(this.currentStep) : 'GO!';
  }

  /**
   * Advance countdown by deltaTime (ms).
   * Call once per frame while isActive && !isFinished.
   */
  update(deltaTime: number): void {
    if (!this.isActive || this.isFinished) return;

    this.elapsed += deltaTime;

    const threshold = this.currentStep > 0 ? STEP_DURATION_MS : GO_DISPLAY_MS;

    if (this.elapsed >= threshold) {
      this.elapsed -= threshold;
      if (this.currentStep > 0) {
        this.currentStep--;
      } else {
        // GO! display time is up
        this.isActive = false;
        this.isFinished = true;
      }
    }
  }
}
