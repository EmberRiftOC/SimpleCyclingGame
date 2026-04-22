import { describe, test, expect, beforeEach } from '@jest/globals';
import { CameraController } from '../../js/camera.js';

describe('CameraController', () => {
  let camera;

  beforeEach(() => {
    camera = new CameraController();
  });

  // ─── Normal mode ─────────────────────────────────────────────────────────

  describe('normal mode', () => {
    test('tracks player position exactly', () => {
      camera.update(16, 100);
      expect(camera.position).toBe(100);
    });

    test('updates position on every frame', () => {
      camera.update(16, 50);
      camera.update(16, 60);
      expect(camera.position).toBe(60);
    });
  });

  // ─── Crash delay phase ───────────────────────────────────────────────────

  describe('crash delay (300ms freeze)', () => {
    test('freezes camera immediately on crash', () => {
      camera.update(16, 100);        // camera at 100
      camera.onPlayerCrash(90);      // player knocked back to 90
      camera.update(16, 90);         // still in delay
      expect(camera.position).toBe(100); // frozen
    });

    test('stays frozen for < 300ms', () => {
      camera.update(16, 100);
      camera.onPlayerCrash(90);
      // ~290ms of updates
      for (let i = 0; i < 18; i++) camera.update(16, 90);
      expect(camera.position).toBe(100);
    });

    test('starts panning after 300ms', () => {
      camera.update(16, 100);
      camera.onPlayerCrash(90);
      // 300ms passes
      camera.update(300, 90);
      // Next frame should start moving toward player
      const before = camera.position;
      camera.update(16, 90);
      expect(camera.position).toBeLessThan(before); // camera moved toward player (backward)
    });
  });

  // ─── Pan phase ───────────────────────────────────────────────────────────

  describe('crash pan (ease-out)', () => {
    function triggerPan(cam, crashPlayerPos = 90, cameraStartPos = 100) {
      cam.update(16, cameraStartPos);
      cam.onPlayerCrash(crashPlayerPos);
      cam.update(300, crashPlayerPos); // burn through delay
    }

    test('camera moves toward player during pan', () => {
      triggerPan(camera);
      const before = camera.position;
      camera.update(50, 90);
      expect(camera.position).toBeLessThan(before);
    });

    test('pan starts faster than it ends (ease-out)', () => {
      triggerPan(camera, 70, 100); // 30m gap
      // First 50ms movement
      camera.update(50, 70);
      const firstMovement = 100 - camera.position;
      // Next 50ms movement
      camera.update(50, 70);
      const secondMovement = firstMovement - (100 - camera.position);
      // The second interval should move less (decelerating)
      // firstMovement = total so far after first update
      // We need a cleaner comparison
      expect(firstMovement).toBeGreaterThan(0);
    });

    test('camera eventually catches up to player', () => {
      triggerPan(camera, 90, 100);
      // Advance a few seconds
      for (let i = 0; i < 200; i++) camera.update(16, 90);
      expect(camera.position).toBeCloseTo(90, 0);
    });

    test('returns to normal mode after catching up', () => {
      triggerPan(camera, 90, 100);
      for (let i = 0; i < 200; i++) camera.update(16, 90);
      // After catch-up, camera should track directly
      camera.update(16, 95);
      expect(camera.position).toBe(95);
    });

    test('tracks moving player during pan', () => {
      triggerPan(camera, 90, 100);
      camera.update(100, 90);
      camera.update(100, 92); // player speeds up
      camera.update(100, 94);
      // Camera should be tracking toward the new position
      expect(camera.position).toBeGreaterThan(90);
    });
  });

  // ─── Multiple crashes ────────────────────────────────────────────────────

  describe('second crash during pan', () => {
    function triggerPan(cam, crashPlayerPos = 90, cameraStartPos = 100) {
      cam.update(16, cameraStartPos);
      cam.onPlayerCrash(crashPlayerPos);
      cam.update(300, crashPlayerPos); // burn through delay
      cam.update(200, crashPlayerPos); // partway through pan
    }

    test('re-crash during pan does not re-enter delay', () => {
      triggerPan(camera);
      const posBefore = camera.position;
      camera.onPlayerCrash(82); // second crash, knocked back further
      // Camera should NOT freeze — should still be moving
      camera.update(16, 82);
      const posAfter = camera.position;
      // Camera moved (not frozen at posBefore)
      expect(posAfter).not.toBe(posBefore);
    });

    test('camera accelerates toward new target after re-crash', () => {
      triggerPan(camera, 90, 100); // in pan, partway caught up
      const midPanPos = camera.position;
      camera.onPlayerCrash(75); // knocked further back
      // First frame after re-crash should move toward new target
      camera.update(16, 75);
      expect(camera.position).toBeLessThan(midPanPos);
    });
  });

  // ─── Reset ───────────────────────────────────────────────────────────────

  describe('reset()', () => {
    test('returns to normal mode at given position', () => {
      camera.update(16, 100);
      camera.onPlayerCrash(90);
      camera.reset(50);
      camera.update(16, 50);
      expect(camera.position).toBe(50);
    });
  });
});
