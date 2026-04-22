/**
 * Rendering engine - draw game state to canvas layers
 */

import type { GameConfig, GameState, Rider } from '../types';
import { drawCyclist, getAnimationFrame, drawBowShock, getBowShockFrame } from './sprites.js';
import { NeonCityBackground } from './NeonCityBackground.js';

interface CanvasLayer {
  background: HTMLCanvasElement | null;
  rider: HTMLCanvasElement | null;
  ui: HTMLCanvasElement | null;
}

interface ContextLayer {
  background: CanvasRenderingContext2D | null;
  rider: CanvasRenderingContext2D | null;
  ui: CanvasRenderingContext2D | null;
}

type LayerKey = keyof CanvasLayer;

type RenderConfig = Pick<GameConfig, 'race' | 'prime' | 'drafting'>;

/** Set by main.ts each frame to control player flash visibility */
let playerFlashVisible = true;

export function setPlayerFlashVisible(visible: boolean): void {
  playerFlashVisible = visible;
}

let canvases: CanvasLayer = {
  background: null,
  rider: null,
  ui: null,
};

let contexts: ContextLayer = {
  background: null,
  rider: null,
  ui: null,
};

// Scale factor relative to the baseline 1200px width
let scaleFactor = 1.0;

// Neon city background
let neonCity: NeonCityBackground | null = null;
let neonCanvas: HTMLCanvasElement | null = null;

/**
 * Initialize canvas layers
 */
export function initializeRenderer(width: number, height: number): void {
  canvases.background = document.getElementById('background-layer') as HTMLCanvasElement;
  canvases.rider = document.getElementById('rider-layer') as HTMLCanvasElement;
  canvases.ui = document.getElementById('ui-layer') as HTMLCanvasElement;

  scaleFactor = width / 1200;

  // Initialize neon city background on an offscreen canvas
  if (!neonCanvas) {
    neonCanvas = document.createElement('canvas');
  }
  neonCity = new NeonCityBackground(neonCanvas);

  (Object.keys(canvases) as LayerKey[]).forEach(key => {
    const canvas = canvases[key];
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    contexts[key] = canvas.getContext('2d');
  });
}

/**
 * Main render function - orchestrates all layers
 */
export function render(gameState: GameState, config: RenderConfig): void {
  renderBackground(gameState, config);
  renderRiders(gameState, config);
  renderHUD(gameState, config);
}

/**
 * Render background layer using NeonCityBackground
 */
function renderBackground(gameState: GameState, _config: RenderConfig): void {
  const ctx = contexts.background;
  const canvas = canvases.background;
  if (!ctx || !canvas || !neonCity || !neonCanvas) return;

  const player = gameState.riders.find(r => r.type === 'player');

  // Sync scroll speed to player velocity (pixels/frame at 60fps)
  const normalSpeed = 11.176; // m/s baseline
  const playerSpeed = player ? player.speed : normalSpeed;
  neonCity.speed = (playerSpeed / normalSpeed) * 3; // scale to feel right

  // Update and render the neon city at its native resolution
  neonCity.update(1 / 60);
  neonCity.render();

  // Scale neon canvas up to fill the game canvas
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(neonCanvas, 0, 0, canvas.width, canvas.height);
}

/**
 * Render all riders with scrolling viewport
 */
function renderRiders(gameState: GameState, config: RenderConfig): void {
  const ctx = contexts.rider;
  const canvas = canvases.rider;
  if (!ctx || !canvas) return;

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const player = gameState.riders.find(r => r.type === 'player');
  if (!player) return;

  // Viewport configuration
  const bikeLengthMeters = config.drafting.bikeLengthInMeters;
  const viewportRange = config.race.viewport.rangeBikeLengths * bikeLengthMeters;
  const playerViewportCenter = canvas.width * config.race.viewport.playerPositionPercent;

  // Calculate visible range (meters)
  const viewStart = player.position - (playerViewportCenter / canvas.width) * viewportRange;
  const viewEnd = viewStart + viewportRange;

  const laneCount = config.race.lanes.total;

  // Map cyclists to NeonCity road coordinates
  // NeonCity: ROAD_TOP=152, HEIGHT=216 at 384x216 native, scaled to canvas
  // Add bottom padding so lane 5 cyclists aren't clipped at canvas edge
  const spriteHalfHeight = 20 * scaleFactor; // Approximate half-height of cyclist sprite
  const neonRoadTop = (152 / 216) * canvas.height;
  const neonRoadBottom = canvas.height - spriteHalfHeight;
  const laneHeight = (neonRoadBottom - neonRoadTop) / laneCount;

  // Helper to convert position to screen X
  const posToScreenX = (position: number): number => {
    return ((position - viewStart) / viewportRange) * canvas.width;
  };

  // Draw finish line if in view
  const finishPosition = gameState.race.totalDistance;
  if (finishPosition >= viewStart && finishPosition <= viewEnd) {
    const finishX = posToScreenX(finishPosition);
    ctx.strokeStyle = '#00ff41'; // Bright green
    ctx.lineWidth = 5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(finishX, 0);
    ctx.lineTo(finishX, canvas.height);
    ctx.stroke();

    // "FINISH" text with outline
    ctx.font = 'bold 28px monospace';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('FINISH', finishX + 10, canvas.height / 2);
    ctx.fillStyle = '#00ff41';
    ctx.fillText('FINISH', finishX + 10, canvas.height / 2);
  }

  // Draw primes if in view
  for (const prime of gameState.race.primes) {
    if (!prime.claimed && prime.location >= viewStart && prime.location <= viewEnd) {
      const primeX = posToScreenX(prime.location);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(primeX, 0);
      ctx.lineTo(primeX, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // "PRIME" text
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('PRIME', primeX + 10, 30);
    }
  }

  // Sort riders by lane ascending so lane 5 (closest) draws last and appears on top
  const visibleRiders = gameState.riders
    .filter(r => r.position >= viewStart && r.position <= viewEnd)
    .sort((a, b) => getVisualLane(a) - getVisualLane(b));

  // Perspective scale: lane 1 (far) = 0.9x, lane 5 (close) = 1.1x
  const minScale = 0.9;
  const maxScale = 1.1;

  for (const rider of visibleRiders) {
    const x = posToScreenX(rider.position);

    // Calculate visual lane (supports smooth interpolation if targetLane/laneProgress added)
    const visualLane = getVisualLane(rider);
    // Position within NeonCity road (lane 1 = top of road, lane 5 = bottom)
    const y = neonRoadTop + (visualLane - 0.5) * laneHeight;

    // Perspective scale based on lane (lane 1 = small/far, lane 5 = large/close)
    const laneScale = minScale + ((visualLane - 1) / (laneCount - 1)) * (maxScale - minScale);

    // Freeze animation when rider has finished (coasting/stopped pose)
    const animFrame = rider.finished
      ? 0
      : getAnimationFrame(rider.energyDrainRate || 0, gameState.time);
    const isPlayer = rider.type === 'player';
    const color = getRiderColor(rider, config);

    // Draw bow shock in front of rider if they have a drafting advantage
    if (rider.isDrafting) {
      const bowFrame = getBowShockFrame(gameState.time);
      drawBowShock(ctx, x, y, bowFrame, laneScale);
    }

    // Draw cyclist sprite with perspective scale (on top of bow shock)
    const flashVisible = isPlayer ? playerFlashVisible : true;
    drawCyclist(ctx, x, y, color, animFrame, isPlayer, laneScale, flashVisible);

    // Draw draft indicator if applicable
    renderDraftIndicator(ctx, rider, gameState, config, x, y);
  }
}

/**
 * Get visual lane position, supporting smooth transitions via optional extended fields
 */
function getVisualLane(rider: Rider): number {
  // These fields are added dynamically for smooth transitions
  const extended = rider as Rider & { targetLane?: number; laneProgress?: number };
  if (
    extended.targetLane !== undefined &&
    extended.laneProgress !== undefined &&
    extended.targetLane !== rider.lane
  ) {
    return rider.lane + (extended.targetLane - rider.lane) * extended.laneProgress;
  }
  return rider.lane;
}

/**
 * Get rider color based on type
 */
function getRiderColor(rider: Rider, config: RenderConfig): string {
  if (rider.type === 'player') {
    return config.race.riders.playerColor;
  }
  const aiColors = config.race.riders.aiColors as Record<string, string>;
  return aiColors[rider.type] ?? '#CCCCCC';
}

/**
 * Render draft indicator
 */
function renderDraftIndicator(
  _ctx: CanvasRenderingContext2D,
  _rider: Rider,
  _gameState: GameState,
  _config: RenderConfig,
  _x: number,
  _y: number
): void {
  // TODO: Implement visual draft indicator
}

/**
 * Render HUD (energy, speed, position, etc.)
 */
function renderHUD(gameState: GameState, config: RenderConfig): void {
  const ctx = contexts.ui;
  const canvas = canvases.ui;
  if (!ctx || !canvas) return;

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const player = gameState.riders.find(r => r.type === 'player');
  if (!player) return;

  // HUD element spacing (scales with canvas size)
  const s = scaleFactor;
  const hudX = Math.round(20 * s);
  const hudStartY = Math.round(20 * s);
  const lineSpacing = Math.round(30 * s);

  let currentY = hudStartY;

  // Flash warning: when drain >100%/s, pulse the energy bar every 200ms
  const flashOn = gameState.flashWarning && (Math.floor(gameState.time / 200) % 2 === 0);

  // Energy bar (takes 2 lines worth of space)
  renderEnergyBar(ctx, player, hudX, currentY, s, flashOn);
  currentY += Math.round(60 * s); // Energy bar height + spacing

  // Energy drain percentage
  renderEnergyDrainRate(ctx, player, hudX, currentY, s, flashOn);
  currentY += lineSpacing;

  // Speed display
  renderSpeed(ctx, player, config, hudX, currentY, s);
  currentY += lineSpacing;

  // Distance remaining
  renderDistance(ctx, player, gameState, hudX, currentY, s);
  currentY += lineSpacing;

  // Position
  renderPosition(ctx, player, gameState, hudX, currentY, s);
  currentY += lineSpacing;

  // Points
  renderPoints(ctx, player, hudX, currentY, s);

  // Minimap (scaled, pinned to bottom-right)
  const mapW = Math.round(200 * s);
  const mapH = Math.round(50 * s);
  renderMinimap(ctx, gameState, config, canvas.width - mapW - Math.round(20 * s), canvas.height - mapH - Math.round(20 * s), mapW, mapH);
}

/**
 * Render energy bar
 */
function renderEnergyBar(
  ctx: CanvasRenderingContext2D,
  player: Rider,
  x: number,
  y: number,
  s: number = 1,
  flashOn: boolean = false
): void {
  const width = Math.round(250 * s);
  const height = Math.round(35 * s);
  const fontSize = Math.round(18 * s);

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, width, height);

  // Energy fill
  const energyWidth = (player.energy / 100) * width;
  ctx.fillStyle = getEnergyColor(player.energy);
  ctx.fillRect(x, y, energyWidth, height);

  // Border - flashes hot orange when drain > 100%
  ctx.strokeStyle = flashOn ? '#ff6600' : '#00ffff';
  ctx.lineWidth = Math.max(1, Math.round((flashOn ? 5 : 3) * s));
  ctx.strokeRect(x, y, width, height);

  // Text with black outline for visibility
  ctx.font = `bold ${fontSize}px monospace`;
  const text = `ENERGY: ${Math.round(player.energy)}%`;
  const textX = x + Math.round(8 * s);
  const textY = y + Math.round(24 * s);

  // Black outline
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.round(4 * s);
  ctx.strokeText(text, textX, textY);

  // White fill
  ctx.fillStyle = '#fff';
  ctx.fillText(text, textX, textY);
}

/**
 * Get energy bar color based on level (retro vibrant)
 */
function getEnergyColor(energy: number): string {
  if (energy > 60) return '#00ff41'; // Bright green
  if (energy > 30) return '#ffea00'; // Bright yellow
  return '#ff0051'; // Hot pink/red
}

/**
 * Render energy drain as percentage (0-100%)
 */
function renderEnergyDrainRate(
  ctx: CanvasRenderingContext2D,
  player: Rider,
  x: number,
  y: number,
  s: number = 1,
  flashOn: boolean = false
): void {
  const drainRate = player.energyDrainRate || 0;
  const maxDrainRate = 3.0;
  const drainPercent = Math.min(100, (drainRate / maxDrainRate) * 100);

  let color = '#00ff41';
  if (drainPercent > 40) color = '#ffea00';
  if (drainPercent > 70) color = '#ff0051';
  if (flashOn) color = '#ff6600'; // Override to orange flash when critical

  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(18 * s)}px monospace`;
  const label = drainRate > 2.7 ? `DRAIN: ${Math.round(drainPercent)}% ⚡` : `DRAIN: ${Math.round(drainPercent)}%`;
  ctx.fillText(label, x, y);
}

/**
 * Render speed
 */
function renderSpeed(
  ctx: CanvasRenderingContext2D,
  player: Rider,
  _config: RenderConfig,
  x: number,
  y: number,
  s: number = 1
): void {
  const mph = player.speed / 0.44704;
  ctx.fillStyle = '#00ffff';
  ctx.font = `bold ${Math.round(18 * s)}px monospace`;
  ctx.fillText(`SPEED: ${Math.round(mph)} mph`, x, y);
}

/**
 * Render distance remaining
 */
function renderDistance(
  ctx: CanvasRenderingContext2D,
  player: Rider,
  gameState: GameState,
  x: number,
  y: number,
  s: number = 1
): void {
  const remaining = gameState.race.totalDistance - player.position;
  ctx.fillStyle = '#ff00ff';
  ctx.font = `bold ${Math.round(18 * s)}px monospace`;
  ctx.fillText(`DISTANCE: ${Math.round(remaining)}m`, x, y);
}

/**
 * Render position
 */
function renderPosition(
  ctx: CanvasRenderingContext2D,
  player: Rider,
  gameState: GameState,
  x: number,
  y: number,
  s: number = 1
): void {
  const sorted = [...gameState.riders].sort((a, b) => b.position - a.position);
  const position = sorted.findIndex(r => r.id === player.id) + 1;
  const total = gameState.riders.length;

  ctx.fillStyle = '#ffea00';
  ctx.font = `bold ${Math.round(18 * s)}px monospace`;
  ctx.fillText(`POSITION: ${position} / ${total}`, x, y);
}

/**
 * Render points
 */
function renderPoints(ctx: CanvasRenderingContext2D, player: Rider, x: number, y: number, s: number = 1): void {
  ctx.fillStyle = '#00ff41';
  ctx.font = `bold ${Math.round(18 * s)}px monospace`;
  ctx.fillText(`POINTS: ${player.points}`, x, y);
}

/**
 * Render minimap
 */
function renderMinimap(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  config: RenderConfig,
  x: number,
  y: number,
  width: number = 200,
  height: number = 50
): void {

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(x, y, width, height);

  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  // Riders - positioned vertically by lane
  const laneCount = config.race.lanes.total;
  for (const rider of gameState.riders) {
    const riderX = x + (rider.position / gameState.race.totalDistance) * width;
    const visualLane = getVisualLane(rider);
    const lanePercent = (visualLane - 1) / (laneCount - 1);
    const riderY = y + lanePercent * height;

    let dotColor: string;
    if (rider.type === 'player') {
      dotColor = '#FFD700'; // Gold for player
    } else if (rider.energy <= 0) {
      dotColor = '#FF0000'; // Red for depleted AI
    } else {
      dotColor = '#888888'; // Gray for normal AI
    }
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(riderX, riderY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Primes
  for (const prime of gameState.race.primes) {
    if (!prime.claimed) {
      const primeX = x + (prime.location / gameState.race.totalDistance) * width;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(primeX - 2, y, 4, height);
    }
  }

  // Finish line
  const finishX = x + width;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(finishX, y);
  ctx.lineTo(finishX, y + height);
  ctx.stroke();
}
