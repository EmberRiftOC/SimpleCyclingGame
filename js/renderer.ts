/**
 * Rendering engine - draw game state to canvas layers
 */

import type { GameConfig, GameState, Rider } from '../types';
import { drawCyclist, getAnimationFrame } from './sprites.js';

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

/**
 * Initialize canvas layers
 */
export function initializeRenderer(width: number, height: number): void {
  canvases.background = document.getElementById('background-layer') as HTMLCanvasElement;
  canvases.rider = document.getElementById('rider-layer') as HTMLCanvasElement;
  canvases.ui = document.getElementById('ui-layer') as HTMLCanvasElement;

  scaleFactor = width / 1200;

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
 * Render background layer (track, lanes) - scrolling with viewport
 */
function renderBackground(gameState: GameState, config: RenderConfig): void {
  const ctx = contexts.background;
  const canvas = canvases.background;
  if (!ctx || !canvas) return;

  const player = gameState.riders.find(r => r.type === 'player');
  if (!player) return;

  // Clear - retro vibrant track
  ctx.fillStyle = '#1a1a2e'; // Dark purple-blue
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw lanes
  const laneCount = config.race.lanes.total;
  const laneHeight = canvas.height / laneCount;

  ctx.strokeStyle = '#00ffff'; // Cyan lane markers
  ctx.lineWidth = 3;

  for (let i = 1; i < laneCount; i++) {
    const y = i * laneHeight;
    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // Draw scrolling road markers (dashed center lines)
  const markerSpacing = 50; // pixels between markers
  const offset = (player.position * 10) % markerSpacing; // Scroll effect

  ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)'; // Magenta markers
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);

  for (let x = -offset; x < canvas.width; x += markerSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
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
  const laneHeight = canvas.height / laneCount;

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

  // Draw riders if in view
  for (const rider of gameState.riders) {
    if (rider.position >= viewStart && rider.position <= viewEnd) {
      const x = posToScreenX(rider.position);

      // Calculate visual lane (supports smooth interpolation if targetLane/laneProgress added)
      const visualLane = getVisualLane(rider);
      const y = (visualLane - 0.5) * laneHeight;

      // Calculate animation frame based on energy drain rate
      const animFrame = getAnimationFrame(rider.energyDrainRate || 0, gameState.time);
      const isPlayer = rider.type === 'player';
      const color = getRiderColor(rider, config);

      // Draw cyclist sprite
      drawCyclist(ctx, x, y, color, animFrame, isPlayer);

      // Draw draft indicator if applicable
      renderDraftIndicator(ctx, rider, gameState, config, x, y);
    }
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

  // Energy bar (takes 2 lines worth of space)
  renderEnergyBar(ctx, player, hudX, currentY, s);
  currentY += Math.round(60 * s); // Energy bar height + spacing

  // Energy drain percentage
  renderEnergyDrainRate(ctx, player, hudX, currentY, s);
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
  s: number = 1
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

  // Border - retro cyan
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = Math.max(1, Math.round(3 * s));
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
  s: number = 1
): void {
  const drainRate = player.energyDrainRate || 0;
  const maxDrainRate = 3.0;
  const drainPercent = Math.min(100, (drainRate / maxDrainRate) * 100);

  let color = '#00ff41';
  if (drainPercent > 40) color = '#ffea00';
  if (drainPercent > 70) color = '#ff0051';

  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(18 * s)}px monospace`;
  ctx.fillText(`DRAIN: ${Math.round(drainPercent)}%`, x, y);
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

    ctx.fillStyle = rider.type === 'player' ? '#FFD700' : '#888';
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
