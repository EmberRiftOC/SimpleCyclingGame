/**
 * Sprite system for pixel art cyclists
 */

/**
 * Draw a pixel art cyclist
 */
export function drawCyclist(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  animFrame: number,
  isPlayer: boolean = false
): void {
  const scale = 4; // Pixel size multiplier (2x larger for visibility)
  
  ctx.save();
  ctx.translate(x, y);
  
  // Pixel grid helper
  const pixel = (px, py, fillColor) => {
    ctx.fillStyle = fillColor || color;
    ctx.fillRect(px * scale, py * scale, scale, scale);
  };
  
  // Body color variations
  const bodyColor = color;
  const darkColor = adjustBrightness(color, -40);
  const lightColor = adjustBrightness(color, 20);
  
  // Helmet
  pixel(-6, -8, bodyColor);
  pixel(-5, -8, bodyColor);
  pixel(-4, -8, bodyColor);
  pixel(-6, -7, darkColor);
  pixel(-5, -7, darkColor);
  pixel(-4, -7, darkColor);
  
  // Head
  pixel(-5, -6, '#ffdbac'); // Skin tone
  pixel(-4, -6, '#ffdbac');
  
  // Torso (bent over bike)
  pixel(-5, -5, bodyColor);
  pixel(-4, -5, bodyColor);
  pixel(-3, -5, bodyColor);
  pixel(-5, -4, darkColor);
  pixel(-4, -4, darkColor);
  pixel(-3, -4, darkColor);
  
  // Arms
  pixel(-6, -4, '#ffdbac');
  pixel(-7, -3, '#ffdbac');
  pixel(-2, -4, '#ffdbac');
  pixel(-1, -3, '#ffdbac');
  
  // Bike frame
  pixel(-4, -3, '#333');
  pixel(-3, -2, '#333');
  pixel(-2, -1, '#333');
  pixel(-4, -1, '#333');
  pixel(-5, -2, '#333');
  
  // Wheels (stationary)
  drawWheel(ctx, -7, 0, scale);
  drawWheel(ctx, 0, 0, scale);
  
  // Legs - animated based on frame
  drawLegs(ctx, animFrame, scale, '#ffdbac');
  
  // Note: Black box border removed per task-003
  
  // Player indicator (glow)
  if (isPlayer) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#FFD700'; // Bright yellow glow for player
    ctx.fillRect(-10 * scale, -11 * scale, 20 * scale, 15 * scale);
    ctx.globalAlpha = 1.0;
  }
  
  ctx.restore();
}

/**
 * Draw animated legs based on pedaling frame
 */
function drawLegs(ctx: CanvasRenderingContext2D, frame: number, scale: number, skinColor: string): void {
  const pixel = (px, py) => {
    ctx.fillStyle = skinColor;
    ctx.fillRect(px * scale, py * scale, scale, scale);
  };
  
  // 4 frame pedaling animation
  switch (frame % 4) {
    case 0: // Top of pedal stroke
      pixel(-5, -3);
      pixel(-5, -2);
      pixel(-5, -1);
      pixel(-3, -2);
      pixel(-3, -1);
      pixel(-3, 0);
      break;
    case 1: // Forward
      pixel(-6, -2);
      pixel(-5, -1);
      pixel(-4, 0);
      pixel(-2, -1);
      pixel(-1, 0);
      pixel(0, 1);
      break;
    case 2: // Bottom of pedal stroke
      pixel(-5, 0);
      pixel(-5, 1);
      pixel(-5, 2);
      pixel(-3, 0);
      pixel(-3, 1);
      pixel(-3, 2);
      break;
    case 3: // Back
      pixel(-6, 0);
      pixel(-5, 1);
      pixel(-4, 2);
      pixel(-2, 1);
      pixel(-1, 2);
      pixel(0, 3);
      break;
  }
}

/**
 * Draw a wheel
 */
function drawWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
  ctx.fillStyle = '#333';
  
  // Wheel circle (pixelated)
  const wheelPixels = [
    [0, -2], [1, -2], [-1, -2],
    [2, -1], [-2, -1], [2, 1], [-2, 1],
    [0, 2], [1, 2], [-1, 2],
    [0, -1], [0, 0], [0, 1],
    [-1, 0], [1, 0]
  ];
  
  wheelPixels.forEach(([dx, dy]) => {
    ctx.fillRect((cx + dx) * scale, (cy + dy) * scale, scale, scale);
  });
}

/**
 * Adjust color brightness
 */
function adjustBrightness(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Calculate animation frame based on energy drain rate
 * Higher drain = faster pedaling
 */
export function getAnimationFrame(energyDrainRate: number, time: number): number {
  // Base animation speed (frames per second)
  const baseSpeed = 4; // 4 FPS at normal drain
  const speedMultiplier = Math.max(0.5, Math.min(3, energyDrainRate + 1));
  const animSpeed = baseSpeed * speedMultiplier;
  
  return Math.floor((time / 1000) * animSpeed);
}
