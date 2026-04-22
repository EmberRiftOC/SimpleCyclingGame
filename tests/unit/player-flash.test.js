import { describe, test, expect, beforeEach } from '@jest/globals';
import { PlayerFlash } from '../../js/player-flash.js';

describe('PlayerFlash', () => {
  let flash;

  beforeEach(() => {
    flash = new PlayerFlash();
  });

  describe('initial state', () => {
    test('is not active by default', () => {
      expect(flash.isActive).toBe(false);
    });

    test('player is visible by default', () => {
      expect(flash.isVisible).toBe(true);
    });
  });

  describe('start()', () => {
    test('activates flash', () => {
      flash.start();
      expect(flash.isActive).toBe(true);
    });

    test('starts hidden (first toggle is off)', () => {
      flash.start();
      expect(flash.isVisible).toBe(false);
    });
  });

  describe('update()', () => {
    test('does nothing when not active', () => {
      flash.update(500);
      expect(flash.isVisible).toBe(true);
      expect(flash.isActive).toBe(false);
    });

    test('toggles visibility after TOGGLE_MS', () => {
      flash.start();
      expect(flash.isVisible).toBe(false); // starts hidden
      flash.update(200); // one toggle
      expect(flash.isVisible).toBe(true);
    });

    test('does not toggle before TOGGLE_MS', () => {
      flash.start();
      flash.update(100);
      expect(flash.isVisible).toBe(false); // still hidden
    });

    test('completes 3 full flashes (6 toggles)', () => {
      flash.start();
      // 6 toggles × 200ms = 1200ms total
      for (let i = 0; i < 6; i++) {
        flash.update(200);
      }
      expect(flash.isActive).toBe(false);
    });

    test('player is visible after flash completes', () => {
      flash.start();
      for (let i = 0; i < 6; i++) {
        flash.update(200);
      }
      expect(flash.isVisible).toBe(true);
    });

    test('accumulates partial time correctly', () => {
      flash.start();
      flash.update(120); // not yet a toggle
      flash.update(120); // 240ms total → should have toggled
      expect(flash.isVisible).toBe(true); // toggled from hidden → visible
    });

    test('does not update after completed', () => {
      flash.start();
      for (let i = 0; i < 6; i++) {
        flash.update(200);
      }
      // Flash is done; further updates should be no-ops
      flash.update(1000);
      expect(flash.isVisible).toBe(true);
      expect(flash.isActive).toBe(false);
    });
  });

  describe('reset()', () => {
    test('restores initial state', () => {
      flash.start();
      flash.update(500);
      flash.reset();
      expect(flash.isActive).toBe(false);
      expect(flash.isVisible).toBe(true);
    });
  });
});
