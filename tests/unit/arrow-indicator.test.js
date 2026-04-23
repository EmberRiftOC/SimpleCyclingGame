import { describe, test, expect, beforeEach } from '@jest/globals';
import { ArrowIndicator } from '../../js/arrow-indicator.js';

describe('ArrowIndicator', () => {
  let arrow;

  beforeEach(() => {
    arrow = new ArrowIndicator();
  });

  describe('initial state', () => {
    test('is not visible by default', () => {
      expect(arrow.visible).toBe(false);
    });

    test('elapsed is 0', () => {
      expect(arrow.elapsed).toBe(0);
    });
  });

  describe('start()', () => {
    test('makes arrow visible', () => {
      arrow.start();
      expect(arrow.visible).toBe(true);
    });

    test('resets elapsed to 0', () => {
      arrow.start();
      arrow.update(1000);
      arrow.start();
      expect(arrow.elapsed).toBe(0);
    });
  });

  describe('update()', () => {
    test('does nothing when not visible', () => {
      arrow.update(1000);
      expect(arrow.elapsed).toBe(0);
      expect(arrow.visible).toBe(false);
    });

    test('accumulates elapsed time', () => {
      arrow.start();
      arrow.update(500);
      expect(arrow.elapsed).toBe(500);
    });

    test('hides after 3 seconds', () => {
      arrow.start();
      arrow.update(3000);
      expect(arrow.visible).toBe(false);
    });

    test('still visible just before 3 seconds', () => {
      arrow.start();
      arrow.update(2999);
      expect(arrow.visible).toBe(true);
    });

    test('accumulates time across multiple calls', () => {
      arrow.start();
      arrow.update(1000);
      arrow.update(1000);
      arrow.update(1000);
      expect(arrow.visible).toBe(false);
    });

    test('does not update elapsed after hiding', () => {
      arrow.start();
      arrow.update(3000);
      arrow.update(1000);
      expect(arrow.elapsed).toBe(3000);
    });
  });

  describe('getPulse()', () => {
    test('returns a value between 0 and 1', () => {
      arrow.start();
      const pulse = arrow.getPulse();
      expect(pulse).toBeGreaterThanOrEqual(0);
      expect(pulse).toBeLessThanOrEqual(1);
    });

    test('varies over time (not constant)', () => {
      arrow.start();
      const p1 = arrow.getPulse();
      arrow.update(250);
      const p2 = arrow.getPulse();
      // Should be different (sine wave changes)
      expect(p1).not.toBeCloseTo(p2, 5);
    });
  });

  describe('reset()', () => {
    test('hides arrow and resets state', () => {
      arrow.start();
      arrow.update(1000);
      arrow.reset();
      expect(arrow.visible).toBe(false);
      expect(arrow.elapsed).toBe(0);
    });
  });
});
