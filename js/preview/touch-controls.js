/**
 * Touch gesture layer for the Three.js viewer canvas.
 * Provides: pinch-to-zoom, single-finger orbit, two-finger pan, double-tap reset.
 */

export function attachTouchControls(canvasEl, controls) {
  if (!controls) return;

  let lastTouches = [];
  let lastPinchDist = null;
  let tapTime = 0;

  function dist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function midpoint(t1, t2) {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
  }

  canvasEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    lastTouches = Array.from(e.touches);

    if (e.touches.length === 1) {
      // Double tap detection
      const now = Date.now();
      if (now - tapTime < 300) {
        // Double tap: reset camera
        controls.target?.set(0, 0, 0);
        if (controls.update) controls.update();
      }
      tapTime = now;
    }

    if (e.touches.length === 2) {
      lastPinchDist = dist(e.touches[0], e.touches[1]);
    }
  }, { passive: false });

  canvasEl.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touches = Array.from(e.touches);

    if (touches.length === 1 && lastTouches.length === 1) {
      // Single finger: orbit
      const dx = touches[0].clientX - lastTouches[0].clientX;
      const dy = touches[0].clientY - lastTouches[0].clientY;
      // Simulate mouse move for OrbitControls
      if (controls.spherical) {
        // Minimal orbit controls
        if (controls._spherical) {
          controls._spherical.theta -= dx * 0.005;
          controls._spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controls._spherical.phi + dy * 0.005));
          controls.update();
        }
      } else {
        // Three.js OrbitControls — trigger pointer events on canvas
        const moveEvent = new MouseEvent('mousemove', {
          clientX: touches[0].clientX,
          clientY: touches[0].clientY,
          buttons: 1
        });
        canvasEl.dispatchEvent(moveEvent);
      }
    }

    if (touches.length === 2) {
      const currentDist = dist(touches[0], touches[1]);

      if (lastPinchDist !== null && Math.abs(currentDist - lastPinchDist) > 1) {
        // Pinch-to-zoom
        const delta = lastPinchDist - currentDist;
        if (controls._spherical) {
          controls._spherical.radius = Math.max(
            controls.minDistance || 1,
            Math.min(controls.maxDistance || 5000, controls._spherical.radius * (1 + delta * 0.01))
          );
          controls.update();
        } else {
          // Trigger wheel event
          const wheelEvent = new WheelEvent('wheel', { deltaY: delta * 3, clientX: 0, clientY: 0 });
          canvasEl.dispatchEvent(wheelEvent);
        }
        lastPinchDist = currentDist;
      }

      // Two-finger pan
      if (lastTouches.length === 2) {
        const lastMid = midpoint(lastTouches[0], lastTouches[1]);
        const currentMid = midpoint(touches[0], touches[1]);
        const panX = (currentMid.x - lastMid.x) * 0.1;
        const panY = (currentMid.y - lastMid.y) * 0.1;

        if (controls.target) {
          controls.target.x -= panX;
          controls.target.y += panY;
          if (controls.update) controls.update();
        }
      }
    }

    lastTouches = touches;
  }, { passive: false });

  canvasEl.addEventListener('touchend', (e) => {
    lastTouches = Array.from(e.touches);
    if (e.touches.length < 2) lastPinchDist = null;
  }, { passive: false });
}
