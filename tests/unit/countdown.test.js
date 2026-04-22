import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Countdown } from '../../js/countdown.js';

describe('Countdown', () => {
  let countdown;

  beforeEach(() => {
    countdown = new Countdown();
  });

  describe('initial state', () => {
    test('starts at step 3', () => {
      expect(countdown.currentStep).toBe(3);
    });

    test('is not active by default', () => {
      expect(countdown.isActive).toBe(false);
    });

    test('is not finished by default', () => {
      expect(countdown.isFinished).toBe(false);
    });
  });

  describe('start()', () => {
    test('activates countdown', () => {
      countdown.start();
      expect(countdown.isActive).toBe(true);
    });

    test('resets to step 3', () => {
      countdown.start();
      expect(countdown.currentStep).toBe(3);
    });

    test('is not finished after start', () => {
      countdown.start();
      expect(countdown.isFinished).toBe(false);
    });
  });

  describe('getText()', () => {
    test('returns "3" at step 3', () => {
      countdown.start();
      expect(countdown.getText()).toBe('3');
    });

    test('returns "2" at step 2', () => {
      countdown.currentStep = 2;
      expect(countdown.getText()).toBe('2');
    });

    test('returns "1" at step 1', () => {
      countdown.currentStep = 1;
      expect(countdown.getText()).toBe('1');
    });

    test('returns "GO!" at step 0', () => {
      countdown.currentStep = 0;
      expect(countdown.getText()).toBe('GO!');
    });
  });

  describe('update()', () => {
    test('advances step after 1 second', () => {
      countdown.start();
      countdown.update(1000); // 1 second
      expect(countdown.currentStep).toBe(2);
    });

    test('does not advance before 1 second', () => {
      countdown.start();
      countdown.update(500);
      expect(countdown.currentStep).toBe(3);
    });

    test('advances through all steps', () => {
      countdown.start();
      countdown.update(1000); // 3 → 2
      countdown.update(1000); // 2 → 1
      countdown.update(1000); // 1 → 0 (GO!)
      expect(countdown.currentStep).toBe(0);
    });

    test('accumulates partial time correctly', () => {
      countdown.start();
      countdown.update(600); // not yet 1s
      countdown.update(600); // now 1.2s total → should advance
      expect(countdown.currentStep).toBe(2);
    });

    test('marks finished after GO! display time elapses', () => {
      countdown.start();
      countdown.update(1000); // 3 → 2
      countdown.update(1000); // 2 → 1
      countdown.update(1000); // 1 → 0 (GO!)
      countdown.update(1000); // GO! display duration
      expect(countdown.isFinished).toBe(true);
    });

    test('does not update when not active', () => {
      // Not started
      countdown.update(1000);
      expect(countdown.currentStep).toBe(3); // unchanged
    });

    test('does not update when finished', () => {
      countdown.start();
      countdown.update(4000); // skip past everything
      const step = countdown.currentStep;
      countdown.update(1000);
      expect(countdown.currentStep).toBe(step); // no change
    });
  });

  describe('reset()', () => {
    test('resets to initial state', () => {
      countdown.start();
      countdown.update(2000);
      countdown.reset();
      expect(countdown.isActive).toBe(false);
      expect(countdown.isFinished).toBe(false);
      expect(countdown.currentStep).toBe(3);
    });
  });
});
