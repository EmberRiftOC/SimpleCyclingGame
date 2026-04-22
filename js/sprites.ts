/**
 * Sprite system - high quality pixel art cyclists
 * Ported from cycling_sprites.html
 */

const SPRITE_W = 48;
const SPRITE_H = 48;

// Shared color constants (bike/skin/structural)
const C = {
  skin: '#f5c6a0',
  skinShade: '#d4a07a',
  shoe: '#2b2b2b',
  shoeAccent: '#ff6b35',
  helmet: '#e8e8e8',
  helmetShade: '#c0c0c0',
  frame: '#3a3a3a',
  frameAccent: '#ff6b35',
  wheel: '#555555',
  spoke: '#888888',
  tire: '#333333',
  handlebar: '#444444',
  seat: '#222222',
  crank: '#666666',
  pedal: '#444444',
  hair: '#4a3728',
  trainer: '#2a2a2a',
  trainerAccent: '#555555',
  trainerBase: '#1a1a1a',
  shorts: '#1d3557',
  shortsShade: '#0f1f38',
};

function drawPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string
): void {
  // Bresenham line
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    drawPixel(ctx, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mainColor: string,
  shadeColor: string,
  _highlightColor: string,
  thickness: number = 2
): void {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = -dy / len, py = dx / len;

  drawLine(ctx, x0, y0, x1, y1, mainColor);

  for (let t = 1; t <= Math.floor(thickness / 2); t++) {
    const ox1 = Math.round(px * t), oy1 = Math.round(py * t);
    drawLine(ctx, x0 + ox1, y0 + oy1, x1 + ox1, y1 + oy1, t === 1 ? mainColor : _highlightColor);
    const ox2 = Math.round(-px * t), oy2 = Math.round(-py * t);
    drawLine(ctx, x0 + ox2, y0 + oy2, x1 + ox2, y1 + oy2, t === 1 ? mainColor : shadeColor);
  }
}

function drawShoe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  accentColor: string
): void {
  drawPixel(ctx, x - 1, y, color);
  drawPixel(ctx, x, y, color);
  drawPixel(ctx, x + 1, y, color);
  drawPixel(ctx, x + 2, y, color);
  drawPixel(ctx, x - 1, y - 1, color);
  drawPixel(ctx, x, y - 1, color);
  drawPixel(ctx, x + 1, y - 1, accentColor);
  drawPixel(ctx, x + 2, y - 1, accentColor);
}

function drawFilledCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        drawPixel(ctx, cx + dx, cy + dy, color);
      }
    }
  }
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const x = Math.round(cx + r * Math.cos(a));
    const y = Math.round(cy + r * Math.sin(a));
    drawPixel(ctx, x, y, color);
  }
}

/**
 * Compute knee position via inverse kinematics
 */
function legIK(
  hipX: number,
  hipY: number,
  footX: number,
  footY: number,
  thighLen: number,
  shinLen: number
): { kneeX: number; kneeY: number } {
  const dx = footX - hipX, dy = footY - hipY;
  let dist = Math.sqrt(dx * dx + dy * dy);
  const totalLen = thighLen + shinLen;
  if (dist > totalLen) dist = totalLen;
  const a = Math.atan2(dy, dx);
  let cosKnee = (thighLen * thighLen + dist * dist - shinLen * shinLen) / (2 * thighLen * dist);
  cosKnee = Math.max(-1, Math.min(1, cosKnee));
  const kneeAngle = Math.acos(cosKnee);
  return {
    kneeX: Math.round(hipX + thighLen * Math.cos(a - kneeAngle)),
    kneeY: Math.round(hipY + thighLen * Math.sin(a - kneeAngle)),
  };
}

/**
 * Draw a single animation frame onto a 48x48 canvas context.
 * jerseyColor and jerseyShade let each rider have a unique jersey.
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  frameIndex: number,
  jerseyColor: string,
  jerseyShade: string
): void {
  ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);

  // 6-frame crank rotation (60° per frame)
  const crankAngle = (frameIndex / 6) * Math.PI * 2;

  // Bike geometry
  const bbX = 24, bbY = 34;
  const crankLen = 5;
  const wheelR = 6;
  const rearWheelX = 14, rearWheelY = 38;
  const frontWheelX = 35, frontWheelY = 38;

  // Pedal positions
  const pedalAX = Math.round(bbX + crankLen * Math.cos(crankAngle));
  const pedalAY = Math.round(bbY + crankLen * Math.sin(crankAngle));
  const pedalBX = Math.round(bbX + crankLen * Math.cos(crankAngle + Math.PI));
  const pedalBY = Math.round(bbY + crankLen * Math.sin(crankAngle + Math.PI));

  // Trainer stand
  drawLine(ctx, rearWheelX - 4, 44, rearWheelX + 4, 44, C.trainerBase);
  drawLine(ctx, rearWheelX - 5, 45, rearWheelX + 5, 45, C.trainerBase);
  drawLine(ctx, rearWheelX - 5, 46, rearWheelX + 5, 46, C.trainerBase);
  drawLine(ctx, rearWheelX, 39, rearWheelX - 4, 44, C.trainer);
  drawLine(ctx, rearWheelX, 39, rearWheelX + 4, 44, C.trainer);
  drawFilledCircle(ctx, rearWheelX, 41, 2, C.trainerAccent);
  drawFilledCircle(ctx, rearWheelX, 41, 1, C.trainer);
  drawLine(ctx, frontWheelX, 39, frontWheelX - 2, 45, C.trainer);
  drawLine(ctx, frontWheelX, 39, frontWheelX + 2, 45, C.trainer);
  drawLine(ctx, frontWheelX - 3, 45, frontWheelX + 3, 45, C.trainerBase);
  drawLine(ctx, frontWheelX - 3, 46, frontWheelX + 3, 46, C.trainerBase);

  // Wheels
  drawCircle(ctx, rearWheelX, rearWheelY, wheelR, C.tire);
  drawCircle(ctx, rearWheelX, rearWheelY, wheelR - 1, C.wheel);
  drawFilledCircle(ctx, rearWheelX, rearWheelY, 1, C.spoke);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
    const sx = Math.round(rearWheelX + (wheelR - 1) * Math.cos(a + crankAngle * 0.5));
    const sy = Math.round(rearWheelY + (wheelR - 1) * Math.sin(a + crankAngle * 0.5));
    drawLine(ctx, rearWheelX, rearWheelY, sx, sy, C.spoke);
  }
  drawCircle(ctx, frontWheelX, frontWheelY, wheelR, C.tire);
  drawCircle(ctx, frontWheelX, frontWheelY, wheelR - 1, C.wheel);
  drawFilledCircle(ctx, frontWheelX, frontWheelY, 1, C.spoke);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
    const sx = Math.round(frontWheelX + (wheelR - 1) * Math.cos(a + crankAngle * 0.5));
    const sy = Math.round(frontWheelY + (wheelR - 1) * Math.sin(a + crankAngle * 0.5));
    drawLine(ctx, frontWheelX, frontWheelY, sx, sy, C.spoke);
  }

  // Frame
  const seatTubeTopX = 22, seatTubeTopY = 25;
  const headTubeTopX = 33, headTubeTopY = 27;
  drawLine(ctx, bbX, bbY, rearWheelX, rearWheelY, C.frame);
  drawLine(ctx, bbX, bbY, seatTubeTopX, seatTubeTopY, C.frame);
  drawLine(ctx, seatTubeTopX, seatTubeTopY, headTubeTopX, headTubeTopY, C.frame);
  drawLine(ctx, bbX, bbY, headTubeTopX, headTubeTopY + 4, C.frame);
  drawLine(ctx, headTubeTopX, headTubeTopY, headTubeTopX, headTubeTopY + 4, C.frameAccent);
  drawLine(ctx, seatTubeTopX, seatTubeTopY, rearWheelX, rearWheelY, C.frame);
  drawLine(ctx, headTubeTopX, headTubeTopY + 4, frontWheelX, frontWheelY, C.frame);
  drawLine(ctx, seatTubeTopX - 2, seatTubeTopY - 1, seatTubeTopX + 2, seatTubeTopY - 1, C.seat);
  drawLine(ctx, seatTubeTopX - 1, seatTubeTopY - 2, seatTubeTopX + 1, seatTubeTopY - 2, C.seat);
  drawLine(ctx, headTubeTopX, headTubeTopY, headTubeTopX + 2, headTubeTopY - 2, C.handlebar);
  drawLine(ctx, headTubeTopX + 2, headTubeTopY - 2, headTubeTopX + 3, headTubeTopY, C.handlebar);
  drawPixel(ctx, headTubeTopX + 3, headTubeTopY + 1, C.handlebar);

  // Cranks and pedals
  drawLine(ctx, bbX, bbY, pedalAX, pedalAY, C.crank);
  drawLine(ctx, bbX, bbY, pedalBX, pedalBY, C.crank);
  drawPixel(ctx, pedalAX - 1, pedalAY, C.pedal);
  drawPixel(ctx, pedalAX, pedalAY, C.pedal);
  drawPixel(ctx, pedalAX + 1, pedalAY, C.pedal);
  drawPixel(ctx, pedalBX - 1, pedalBY, C.pedal);
  drawPixel(ctx, pedalBX, pedalBY, C.pedal);
  drawPixel(ctx, pedalBX + 1, pedalBY, C.pedal);

  // Rider
  const hipX = seatTubeTopX, hipY = seatTubeTopY + 1;
  const thighLen = 6, shinLen = 6;
  const legA = legIK(hipX, hipY, pedalAX, pedalAY, thighLen, shinLen);
  const legB = legIK(hipX, hipY, pedalBX, pedalBY, thighLen, shinLen);

  // Far leg (behind, darker)
  drawLimb(ctx, hipX, hipY, legB.kneeX, legB.kneeY, C.shortsShade, '#0a1528', '#1a2a48', 3);
  drawLimb(ctx, legB.kneeX, legB.kneeY, pedalBX, pedalBY, C.skinShade, '#b8845e', '#e0b08a', 3);
  drawFilledCircle(ctx, legB.kneeX, legB.kneeY, 1, C.skinShade);
  drawShoe(ctx, pedalBX - 1, pedalBY - 1, C.shoe, '#444');

  // Torso
  const shoulderX = 27, shoulderY = 19;
  drawLimb(ctx, hipX, hipY, shoulderX, shoulderY, jerseyColor, jerseyShade, '#f04a56', 3);

  // Near leg (foreground)
  drawLimb(ctx, hipX, hipY, legA.kneeX, legA.kneeY, C.shorts, C.shortsShade, '#2a4a78', 3);
  drawLimb(ctx, legA.kneeX, legA.kneeY, pedalAX, pedalAY, C.skin, C.skinShade, '#ffe0c8', 3);
  drawFilledCircle(ctx, legA.kneeX, legA.kneeY, 1, C.skin);
  drawShoe(ctx, pedalAX - 1, pedalAY - 1, C.shoe, C.shoeAccent);

  // Arms
  const handX = headTubeTopX + 2, handY = headTubeTopY - 1;
  const elbowFarX = Math.round((shoulderX + handX) / 2) - 1;
  const elbowFarY = Math.round((shoulderY + handY) / 2) + 2;
  drawLimb(ctx, shoulderX - 1, shoulderY, elbowFarX - 1, elbowFarY, jerseyShade, '#8a1e28', '#c83844', 2);
  drawLimb(ctx, elbowFarX - 1, elbowFarY, handX, handY, C.skinShade, '#b8845e', '#e0b08a', 2);
  const elbowX = Math.round((shoulderX + handX) / 2);
  const elbowY = Math.round((shoulderY + handY) / 2) + 2;
  drawLimb(ctx, shoulderX, shoulderY, elbowX, elbowY, jerseyColor, jerseyShade, '#f04a56', 2);
  drawLimb(ctx, elbowX, elbowY, handX, handY, C.skin, C.skinShade, '#ffe0c8', 2);
  drawFilledCircle(ctx, handX, handY, 1, C.skin);

  // Head
  const headX = 29, headY = 15;
  drawFilledCircle(ctx, headX, headY, 3, C.skin);
  drawPixel(ctx, headX + 2, headY - 1, C.skinShade);
  drawPixel(ctx, headX + 1, headY - 2, '#333');

  // Helmet (updated artwork from cycling_sprites2.html)
  drawLine(ctx, headX - 1, headY - 5, headX + 1, headY - 5, C.helmet);
  drawLine(ctx, headX - 3, headY - 4, headX + 2, headY - 4, C.helmet);
  drawLine(ctx, headX - 4, headY - 3, headX + 2, headY - 3, C.helmet);
  drawLine(ctx, headX - 3, headY - 2, headX + 1, headY - 2, C.helmetShade);
  drawPixel(ctx, headX - 1, headY - 4, C.hair);
  drawPixel(ctx, headX + 1, headY - 4, C.hair);
  drawPixel(ctx, headX - 2, headY - 1, C.hair);
  drawPixel(ctx, headX - 3, headY, C.hair);
}

// Cache offscreen canvases per color to avoid redrawing every frame
const frameCache = new Map<string, HTMLCanvasElement[]>();

/**
 * Get or create cached frames for a given jersey color
 */
function getFrames(jerseyColor: string, jerseyShade: string): HTMLCanvasElement[] {
  const key = `${jerseyColor}|${jerseyShade}`;
  if (frameCache.has(key)) return frameCache.get(key)!;

  const frames: HTMLCanvasElement[] = [];
  for (let i = 0; i < 6; i++) {
    const offscreen = document.createElement('canvas');
    offscreen.width = SPRITE_W;
    offscreen.height = SPRITE_H;
    const offCtx = offscreen.getContext('2d')!;
    drawFrame(offCtx, i, jerseyColor, jerseyShade);
    frames.push(offscreen);
  }

  frameCache.set(key, frames);
  return frames;
}

/**
 * Derive a shade color for a given jersey hex color
 */
function darkenColor(color: string, amount: number = 40): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Draw a cyclist sprite at (x, y) using the high-quality pixel art renderer.
 * Renders at 2x scale (96x96) for visibility.
 * @param laneScale - perspective scale multiplier (1.0 = normal, >1.0 = larger/closer)
 */
export function drawCyclist(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  animFrame: number,
  isPlayer: boolean = false,
  laneScale: number = 1.0,
  flashVisible: boolean = true
): void {
  // Skip draw when flash effect hides the player
  if (isPlayer && !flashVisible) return;

  const RENDER_SCALE = 2 * laneScale; // Scale by lane for perspective effect
  const shade = darkenColor(color, 40);
  const frames = getFrames(color, shade);
  const frame = frames[Math.abs(animFrame) % 6];

  ctx.save();

  // Draw the sprite centered on (x, y) — no yellow box
  ctx.imageSmoothingEnabled = false; // Preserve pixel art sharpness
  ctx.drawImage(
    frame,
    x - (SPRITE_W * RENDER_SCALE) / 2,
    y - (SPRITE_H * RENDER_SCALE) / 2,
    SPRITE_W * RENDER_SCALE,
    SPRITE_H * RENDER_SCALE
  );

  ctx.restore();
}

const NUM_BOW_FRAMES = 12;

/**
 * Draw the bow shock overlay in front of a drafting rider.
 * The bow shock is drawn at the FRONT of the rider (right side in screen space).
 * @param overlayFrame - animation frame 0–11
 * @param laneScale - same perspective scale as the rider sprite
 */
export function drawBowShock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  overlayFrame: number,
  laneScale: number = 1.0
): void {
  const RENDER_SCALE = 2 * laneScale;
  const offscreen = document.createElement('canvas');
  offscreen.width = SPRITE_W;
  offscreen.height = SPRITE_H;
  const oc = offscreen.getContext('2d')!;

  const frame = overlayFrame % NUM_BOW_FRAMES;
  const u = frame / NUM_BOW_FRAMES;
  const pulseU = (u * 2) % 1;
  const sparkU = (u * 3) % 1;
  const pulse = 0.5 + 0.5 * Math.sin(pulseU * Math.PI * 2);

  // Draw pixel helper
  const px = (px: number, py: number, color: string, alpha: number) => {
    if (px < 0 || px >= SPRITE_W || py < 0 || py >= SPRITE_H) return;
    oc.globalAlpha = alpha;
    oc.fillStyle = color;
    oc.fillRect(px, py, 1, 1);
    oc.globalAlpha = 1;
  };

  const cx = 38, cy = 28;

  // Inner arc
  const innerRx = 8, innerRy = 13;
  for (let a = -Math.PI / 2.1; a <= Math.PI / 2.1; a += 0.06) {
    px(Math.round(cx + innerRx * Math.cos(a)), Math.round(cy + innerRy * Math.sin(a)), '#4ea3ff', 1);
  }

  // Outer arc (pulsing)
  const outerRx = 10 + Math.floor(pulse * 1.5);
  const outerRy = 15;
  for (let a = -Math.PI / 2.3; a <= Math.PI / 2.3; a += 0.08) {
    px(Math.round(cx + outerRx * Math.cos(a)), Math.round(cy + outerRy * Math.sin(a)), '#2d6bd4', 0.8);
  }

  // Radiating sparks
  const sparkAngles = [-0.9, -0.4, 0, 0.4, 0.9];
  sparkAngles.forEach((baseA, i) => {
    const sparkOffset = (sparkU + i * 0.17) % 1;
    const dist = 10 + sparkOffset * 5;
    const sx = Math.round(cx + dist * Math.cos(baseA));
    const sy = Math.round(cy + dist * Math.sin(baseA) * 1.4);
    const sx2 = Math.round(cx + (dist - 1.5) * Math.cos(baseA));
    const sy2 = Math.round(cy + (dist - 1.5) * Math.sin(baseA) * 1.4);
    const alpha = (1 - sparkOffset) * 0.9;
    px(sx, sy, '#a8d8ff', alpha);
    px(sx2, sy2, '#4ea3ff', alpha * 0.8);
  });

  // Trail haze drift
  const driftStep = frame % 6;
  for (let i = 0; i < 4; i++) {
    const hx = Math.round(32 - driftStep - i * 4);
    if (hx > 1) {
      const hy = 28 + (i % 2 === 0 ? -1 : 1);
      px(hx, hy, '#2d6bd4', 0.5);
    }
  }

  // Impact core flash
  if (Math.floor(frame / 2) % 2 === 0) {
    px(cx + innerRx, cy, '#ffffff', 1);
    px(cx + innerRx + 1, cy, '#a8d8ff', 0.9);
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // Position the bow shock in front of the rider (to the right)
  ctx.drawImage(
    offscreen,
    x - (SPRITE_W * RENDER_SCALE) / 2,
    y - (SPRITE_H * RENDER_SCALE) / 2,
    SPRITE_W * RENDER_SCALE,
    SPRITE_H * RENDER_SCALE
  );
  ctx.restore();
}

/**
 * Get bow shock animation frame (0–11)
 */
export function getBowShockFrame(time: number): number {
  return Math.floor((time / 1000) * 12) % NUM_BOW_FRAMES;
}

/**
 * Calculate animation frame based on energy drain rate.
 * Higher drain = faster pedaling. Returns 0–5 (6-frame cycle).
 */
export function getAnimationFrame(energyDrainRate: number, time: number): number {
  const baseSpeed = 4; // 4 FPS at baseline drain
  const speedMultiplier = Math.max(0.5, Math.min(3, energyDrainRate + 1));
  const animSpeed = baseSpeed * speedMultiplier;
  return Math.floor((time / 1000) * animSpeed);
}
