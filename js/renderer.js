/**
 * Rendering engine - draw game state to canvas layers
 */

let canvases = {
  background: null,
  rider: null,
  ui: null
};

let contexts = {
  background: null,
  rider: null,
  ui: null
};

/**
 * Initialize canvas layers
 */
export function initializeRenderer(width, height) {
  canvases.background = document.getElementById('background-layer');
  canvases.rider = document.getElementById('rider-layer');
  canvases.ui = document.getElementById('ui-layer');
  
  Object.keys(canvases).forEach(key => {
    canvases[key].width = width;
    canvases[key].height = height;
    contexts[key] = canvases[key].getContext('2d');
  });
}

/**
 * Main render function - orchestrates all layers
 */
export function render(gameState, config) {
  renderBackground(gameState, config);
  renderRiders(gameState, config);
  renderHUD(gameState, config);
}

/**
 * Render background layer (track, lanes)
 */
function renderBackground(gameState, config) {
  const ctx = contexts.background;
  const canvas = canvases.background;
  
  // Clear
  ctx.fillStyle = '#2d5016';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw lanes
  const laneCount = config.race.lanes.total;
  const laneWidth = canvas.height / laneCount;
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  
  for (let i = 1; i < laneCount; i++) {
    const y = i * laneWidth;
    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  ctx.setLineDash([]);
}

/**
 * Render all riders with scrolling viewport
 */
function renderRiders(gameState, config) {
  const ctx = contexts.rider;
  const canvas = canvases.rider;
  
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const player = gameState.riders.find(r => r.type === 'player');
  if (!player) return;
  
  // Viewport configuration
  const bikeLengthMeters = 1.8;
  const viewportRange = 15 * bikeLengthMeters; // 15 bike lengths total
  const playerViewportCenter = canvas.width * 0.4; // Player positioned at 40% from left
  
  // Calculate visible range (meters)
  const viewStart = player.position - (playerViewportCenter / canvas.width) * viewportRange;
  const viewEnd = viewStart + viewportRange;
  
  const laneCount = config.race.lanes.total;
  const laneHeight = canvas.height / laneCount;
  
  // Helper to convert position to screen X
  const posToScreenX = (position) => {
    return ((position - viewStart) / viewportRange) * canvas.width;
  };
  
  // Draw finish line if in view
  const finishPosition = gameState.race.totalDistance;
  if (finishPosition >= viewStart && finishPosition <= viewEnd) {
    const finishX = posToScreenX(finishPosition);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(finishX, 0);
    ctx.lineTo(finishX, canvas.height);
    ctx.stroke();
    
    // "FINISH" text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
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
      const y = (rider.lane - 0.5) * laneHeight;
      
      // Draw rider as circle (placeholder)
      ctx.fillStyle = getRiderColor(rider, config);
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw draft indicator if applicable
      renderDraftIndicator(ctx, rider, gameState, config, x, y);
    }
  }
}

/**
 * Get rider color based on type
 */
function getRiderColor(rider, config) {
  if (rider.type === 'player') {
    return config.race.riders.playerColor;
  }
  return config.race.riders.aiColors[rider.type] || '#CCCCCC';
}

/**
 * Render draft indicator
 */
function renderDraftIndicator(ctx, rider, gameState, config, x, y) {
  // TODO: Implement visual draft indicator
}

/**
 * Render HUD (energy, speed, position, etc.)
 */
function renderHUD(gameState, config) {
  const ctx = contexts.ui;
  const canvas = canvases.ui;
  
  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const player = gameState.riders.find(r => r.type === 'player');
  if (!player) return;
  
  // Energy bar
  renderEnergyBar(ctx, player, 20, 20);
  
  // Speed display
  renderSpeed(ctx, player, config, 20, 80);
  
  // Distance remaining
  renderDistance(ctx, player, gameState, 20, 110);
  
  // Position
  renderPosition(ctx, player, gameState, 20, 140);
  
  // Points
  renderPoints(ctx, player, 20, 170);
  
  // Minimap
  renderMinimap(ctx, gameState, config, canvas.width - 220, canvas.height - 70);
}

/**
 * Render energy bar
 */
function renderEnergyBar(ctx, player, x, y) {
  const width = 200;
  const height = 30;
  
  // Background
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, width, height);
  
  // Energy fill
  const energyWidth = (player.energy / 100) * width;
  ctx.fillStyle = getEnergyColor(player.energy);
  ctx.fillRect(x, y, energyWidth, height);
  
  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  
  // Text
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.fillText(`Energy: ${Math.round(player.energy)}%`, x + 5, y + 20);
}

/**
 * Get energy bar color based on level
 */
function getEnergyColor(energy) {
  if (energy > 60) return '#00ff00';
  if (energy > 30) return '#ffff00';
  return '#ff0000';
}

/**
 * Render speed
 */
function renderSpeed(ctx, player, config, x, y) {
  const mph = player.speed / 0.44704;
  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.fillText(`Speed: ${Math.round(mph)} mph`, x, y);
}

/**
 * Render distance remaining
 */
function renderDistance(ctx, player, gameState, x, y) {
  const remaining = gameState.race.totalDistance - player.position;
  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.fillText(`Distance: ${Math.round(remaining)}m`, x, y);
}

/**
 * Render position
 */
function renderPosition(ctx, player, gameState, x, y) {
  const sorted = [...gameState.riders].sort((a, b) => b.position - a.position);
  const position = sorted.findIndex(r => r.id === player.id) + 1;
  const total = gameState.riders.length;
  
  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.fillText(`Position: ${position} / ${total}`, x, y);
}

/**
 * Render points
 */
function renderPoints(ctx, player, x, y) {
  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.fillText(`Points: ${player.points}`, x, y);
}

/**
 * Render minimap
 */
function renderMinimap(ctx, gameState, config, x, y) {
  const width = 200;
  const height = 50;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(x, y, width, height);
  
  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  
  // Riders
  for (const rider of gameState.riders) {
    const riderX = x + (rider.position / gameState.race.totalDistance) * width;
    const riderY = y + height / 2;
    
    ctx.fillStyle = rider.type === 'player' ? '#FF3366' : '#888';
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
