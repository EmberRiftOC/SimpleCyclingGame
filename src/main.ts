import './style.css'

// Game constants
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const LANES = 3
const LANE_HEIGHT = CANVAS_HEIGHT / LANES
const PLAYER_START_X = 150
const BASE_SCROLL_SPEED = 3
const MIN_SPEED = 1.5
const MAX_SPEED = 6
const RACE_DISTANCE = 10000
const MAX_ENERGY = 100
const ENERGY_DRAIN_BASE = 0.08
const ENERGY_DRAIN_FAST = 0.3
const ENERGY_REGEN_DRAFT = 0.4
const BOOST_SPEED_MULTIPLIER = 1.8
const EXHAUSTED_SPEED = 0.8
const RECOVERY_TIME = 5000 // 5 seconds in ms
const RECOVERY_ENERGY = 50 // Energy restored after recovery

// Game state
interface Cyclist {
  x: number
  y: number
  lane: number
  speed: number
  color: string
  isBoosting: boolean
  name: string
  distance: number
  score: number
}

interface Obstacle {
  x: number
  lane: number
}

interface Prime {
  x: number
  crossed: Set<string>
  distance: number
}

let player: Cyclist = {
  x: PLAYER_START_X,
  y: LANE_HEIGHT * 1 + LANE_HEIGHT / 2,
  lane: 1,
  speed: BASE_SCROLL_SPEED,
  color: '#00ff41',
  isBoosting: false,
  name: 'You',
  distance: 0,
  score: 0
}

let aiCyclists: Cyclist[] = [
  { x: 200, y: LANE_HEIGHT * 0 + LANE_HEIGHT / 2, lane: 0, speed: BASE_SCROLL_SPEED, color: '#ff3366', isBoosting: false, name: 'Red', distance: 50, score: 0 },
  { x: 180, y: LANE_HEIGHT * 2 + LANE_HEIGHT / 2, lane: 2, speed: BASE_SCROLL_SPEED, color: '#3366ff', isBoosting: false, name: 'Blue', distance: -30, score: 0 }
]

let obstacles: Obstacle[] = []
let primes: Prime[] = []
let energy = MAX_ENERGY
let targetSpeed = BASE_SCROLL_SPEED
let keys: { [key: string]: boolean } = {}
let isExhausted = false
let exhaustedStartTime: number | null = null
let gameFinished = false
let finishLinePassed = false

// Touch controls
let touchStartX = 0
let touchStartY = 0
let isTouching = false
let touchDetected = false
let lastTouchTime = 0

// Detect mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

// Adjust layout for mobile portrait
if (isMobile) {
  document.body.classList.add('mobile-portrait')
}

// Initialize
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div class="game-container">
    <canvas id="gameCanvas" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></canvas>
    <div id="speedSlider" class="speed-slider hidden">
      <div class="slider-track">
        <div class="slider-thumb" id="sliderThumb"></div>
      </div>
      <div class="slider-label">Speed: <span id="sliderSpeedText">3.0</span>x</div>
    </div>
    <div class="minimap" id="minimap">
      <canvas id="minimapCanvas" width="760" height="40"></canvas>
    </div>
    <div class="hud">
      <div class="energy-bar">
        <div class="energy-fill" id="energyFill"></div>
      </div>
      <div class="stats">
        <span>Energy: <span id="energyText">100</span></span>
        <span>Speed: <span id="speedText">3.0</span>x</span>
        <span>Distance: <span id="distanceText">0</span>/<span id="totalDistance">${RACE_DISTANCE}</span>m</span>
      </div>
      <div class="scoreboard">
        <div class="score-item"><span class="score-name" style="color: #00ff41">You:</span> <span id="scoreYou">0</span></div>
        <div class="score-item"><span class="score-name" style="color: #ff3366">Red:</span> <span id="scoreRed">0</span></div>
        <div class="score-item"><span class="score-name" style="color: #3366ff">Blue:</span> <span id="scoreBlue">0</span></div>
      </div>
      <div class="controls-hint" id="controlsHint">
        ↑↓ Change Lane | ←→ Speed | Space: Boost
      </div>
    </div>
    <div id="finishScreen" class="finish-screen hidden">
      <h1>Race Complete!</h1>
      <div class="final-scores">
        <p><span style="color: #00ff41">You:</span> <span id="finalScoreYou">0</span> pts</p>
        <p><span style="color: #ff3366">Red:</span> <span id="finalScoreRed">0</span> pts</p>
        <p><span style="color: #3366ff">Blue:</span> <span id="finalScoreBlue">0</span> pts</p>
      </div>
    </div>
  </div>
`

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const minimapCanvas = document.getElementById('minimapCanvas') as HTMLCanvasElement
const minimapCtx = minimapCanvas.getContext('2d')!
const speedSlider = document.getElementById('speedSlider')!
const sliderThumb = document.getElementById('sliderThumb')!

// Keyboard input handling
document.addEventListener('keydown', (e) => {
  if (gameFinished) return
  
  keys[e.key] = true
  
  if ((e.key === 'ArrowUp' || e.key === 'w') && player.lane > 0 && energy > 5) {
    player.lane--
    player.y = LANE_HEIGHT * player.lane + LANE_HEIGHT / 2
    energy -= 5
  }
  if ((e.key === 'ArrowDown' || e.key === 's') && player.lane < LANES - 1 && energy > 5) {
    player.lane++
    player.y = LANE_HEIGHT * player.lane + LANE_HEIGHT / 2
    energy -= 5
  }
})

document.addEventListener('keyup', (e) => {
  keys[e.key] = false
})

// Touch input handling
canvas.addEventListener('touchstart', (e) => {
  if (gameFinished) return
  e.preventDefault()
  
  const touch = e.touches[0]
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  isTouching = true
  lastTouchTime = Date.now()
  
  // Show speed slider on first touch
  if (!touchDetected) {
    touchDetected = true
    speedSlider.classList.remove('hidden')
    document.getElementById('controlsHint')!.textContent = 'Swipe ↑↓ Lanes | Drag ←→ Speed | Tap: Boost'
  }
})

canvas.addEventListener('touchmove', (e) => {
  if (gameFinished || !isTouching) return
  e.preventDefault()
  
  const touch = e.touches[0]
  const deltaX = touch.clientX - touchStartX
  const deltaY = touch.clientY - touchStartY
  
  // Prioritize vertical swipes for lane changes
  if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 30) {
    if (deltaY < 0 && player.lane > 0 && energy > 5) {
      // Swipe up
      player.lane--
      player.y = LANE_HEIGHT * player.lane + LANE_HEIGHT / 2
      energy -= 5
      touchStartY = touch.clientY // Reset so it doesn't trigger multiple times
    } else if (deltaY > 0 && player.lane < LANES - 1 && energy > 5) {
      // Swipe down
      player.lane++
      player.y = LANE_HEIGHT * player.lane + LANE_HEIGHT / 2
      energy -= 5
      touchStartY = touch.clientY
    }
  }
  
  // Horizontal drag for speed control
  if (Math.abs(deltaX) > 5) {
    const speedAdjust = deltaX * 0.01
    targetSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, targetSpeed + speedAdjust))
    touchStartX = touch.clientX // Reset for continuous drag
  }
})

canvas.addEventListener('touchend', (e) => {
  if (gameFinished) return
  e.preventDefault()
  
  const touchDuration = Date.now() - lastTouchTime
  const touch = e.changedTouches[0]
  const deltaX = Math.abs(touch.clientX - touchStartX)
  const deltaY = Math.abs(touch.clientY - touchStartY)
  
  // Tap detected (short duration, minimal movement)
  if (touchDuration < 200 && deltaX < 20 && deltaY < 20 && energy > 0) {
    player.isBoosting = true
    setTimeout(() => {
      player.isBoosting = false
    }, 500) // Boost for half a second
  }
  
  isTouching = false
})

// Update speed slider visual
function updateSpeedSlider() {
  const percentage = ((targetSpeed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 100
  sliderThumb.style.left = `${percentage}%`
  document.getElementById('sliderSpeedText')!.textContent = targetSpeed.toFixed(1)
}

// Spawn obstacles
function spawnObstacle() {
  if (Math.random() < 0.015) {
    obstacles.push({
      x: CANVAS_WIDTH,
      lane: Math.floor(Math.random() * LANES)
    })
  }
}

// Spawn primes
function spawnPrime() {
  if (primes.length < 5 && Math.random() < 0.0008) {
    primes.push({
      x: CANVAS_WIDTH + 200,
      crossed: new Set(),
      distance: player.distance + CANVAS_WIDTH + 200
    })
  }
}

// Check if player is drafting
function isDrafting(): boolean {
  for (const ai of aiCyclists) {
    const inSameLane = ai.lane === player.lane
    const behindAI = player.x < ai.x && ai.x - player.x < 100
    if (inSameLane && behindAI) return true
  }
  return false
}

// Update game state
function update() {
  if (gameFinished) return
  
  // Handle speed adjustments with arrow keys
  if (keys['ArrowLeft']) {
    targetSpeed = Math.max(MIN_SPEED, targetSpeed - 0.05)
  }
  if (keys['ArrowRight']) {
    targetSpeed = Math.min(MAX_SPEED, targetSpeed + 0.05)
  }
  
  // Smooth speed transition
  player.speed += (targetSpeed - player.speed) * 0.1
  
  // Boost mechanic (keyboard or touch)
  player.isBoosting = (keys[' '] && energy > 0) || player.isBoosting
  let currentSpeed = player.speed
  if (player.isBoosting) {
    currentSpeed *= BOOST_SPEED_MULTIPLIER
  }
  
  // Handle exhaustion recovery BEFORE energy management
  const now = Date.now()
  if (energy <= 0 && !isExhausted) {
    // Just became exhausted
    isExhausted = true
    exhaustedStartTime = now
    console.log('🚨 EXHAUSTED - Starting 5 second timer', { energy, frame: player.distance })
  }
  
  if (isExhausted && exhaustedStartTime && now - exhaustedStartTime >= RECOVERY_TIME) {
    // Recovery complete
    console.log('✅ RECOVERY TRIGGERED', { 
      energyBefore: energy, 
      isExhausted, 
      timeSinceExhaustion: (now - exhaustedStartTime) / 1000,
      frame: player.distance 
    })
    energy = RECOVERY_ENERGY
    isExhausted = false
    exhaustedStartTime = null
    console.log('✅ RECOVERY COMPLETE', { energyAfter: energy, isExhausted })
  }
  
  // Apply speed penalty if exhausted
  if (isExhausted) {
    currentSpeed = EXHAUSTED_SPEED
  }
  
  // Energy management (runs every frame)
  const energyBeforeDrain = energy
  if (player.isBoosting && energy > 0) {
    energy -= ENERGY_DRAIN_FAST
  } else if (isDrafting() && energy < MAX_ENERGY) {
    energy = Math.min(MAX_ENERGY, energy + ENERGY_REGEN_DRAFT)
  } else if (energy > 0) {
    // Energy drain based on speed
    const speedFactor = (player.speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)
    const drain = ENERGY_DRAIN_BASE + (speedFactor * ENERGY_DRAIN_FAST)
    energy -= drain
  }
  energy = Math.max(0, energy)
  
  // Log if energy just hit 0 after recovery
  if (energyBeforeDrain > 40 && energy <= 0) {
    console.error('⚠️ ENERGY DRAINED TO 0 IN ONE FRAME!', {
      energyBefore: energyBeforeDrain,
      energyAfter: energy,
      isBoosting: player.isBoosting,
      isDrafting: isDrafting(),
      speed: player.speed
    })
  }
  
  player.distance += currentSpeed
  
  // Check for finish line crossing
  if (player.distance >= RACE_DISTANCE && !finishLinePassed) {
    finishLinePassed = true
    player.score += 100 // First place bonus
    setTimeout(() => {
      gameFinished = true
      showFinishScreen()
    }, 1000)
  }
  
  // Move obstacles
  obstacles = obstacles.filter(obs => {
    obs.x -= currentSpeed
    
    // Collision detection
    if (obs.lane === player.lane && obs.x > player.x - 20 && obs.x < player.x + 20) {
      energy = Math.max(0, energy - 20)
      return false
    }
    
    return obs.x > -20
  })
  
  // Move primes
  primes.forEach(prime => {
    prime.x -= currentSpeed
    
    // Check if player crossed prime (similar to finish line)
    if (!prime.crossed.has('player') && player.distance >= prime.distance) {
      prime.crossed.add('player')
      const position = prime.crossed.size
      if (position === 1) player.score += 20
      else if (position === 2) player.score += 10
      else if (position === 3) player.score += 5
    }
  })
  primes = primes.filter(p => p.x > -50)
  
  // AI behavior - maintain position relative to player
  aiCyclists.forEach(ai => {
    // AI maintains their initial offset distance from player
    const targetDistance = player.distance + (ai.distance - player.distance)
    ai.distance += ai.speed
    
    // Calculate screen position based on distance from player
    const distanceFromPlayer = ai.distance - player.distance
    ai.x = player.x + distanceFromPlayer
    
    // Simple AI lane changes to avoid obstacles
    if (Math.random() < 0.01 && ai.x > 0 && ai.x < CANVAS_WIDTH) {
      const newLane = Math.floor(Math.random() * LANES)
      ai.lane = newLane
      ai.y = LANE_HEIGHT * ai.lane + LANE_HEIGHT / 2
    }
    
    // AI crosses primes
    primes.forEach(prime => {
      if (!prime.crossed.has(ai.name) && ai.distance >= prime.distance) {
        prime.crossed.add(ai.name)
        const position = prime.crossed.size
        if (position === 1) ai.score += 20
        else if (position === 2) ai.score += 10
        else if (position === 3) ai.score += 5
      }
    })
    
    // AI crosses finish
    if (ai.distance >= RACE_DISTANCE && ai.score < 100) {
      if (player.score >= 100) {
        ai.score += 50 // Second place
      } else {
        ai.score += 100 // Beat player
      }
    }
  })
  
  spawnObstacle()
  spawnPrime()
  updateSpeedSlider()
}

// Show finish screen
function showFinishScreen() {
  const finishScreen = document.getElementById('finishScreen')!
  document.getElementById('finalScoreYou')!.textContent = player.score.toString()
  document.getElementById('finalScoreRed')!.textContent = aiCyclists[0].score.toString()
  document.getElementById('finalScoreBlue')!.textContent = aiCyclists[1].score.toString()
  finishScreen.classList.remove('hidden')
}

// Draw minimap
function drawMinimap() {
  const width = minimapCanvas.width
  const height = minimapCanvas.height
  
  minimapCtx.fillStyle = '#0a0a0a'
  minimapCtx.fillRect(0, 0, width, height)
  
  minimapCtx.strokeStyle = '#1a1a1a'
  minimapCtx.strokeRect(0, 0, width, height)
  
  // Draw finish line on minimap
  const finishPos = (RACE_DISTANCE / RACE_DISTANCE) * width
  minimapCtx.fillStyle = '#ffffff'
  minimapCtx.fillRect(finishPos - 2, 0, 4, height)
  
  // Draw primes on minimap
  primes.forEach(prime => {
    const primePos = (prime.distance / RACE_DISTANCE) * width
    minimapCtx.fillStyle = '#ffff00'
    minimapCtx.globalAlpha = 0.5
    minimapCtx.fillRect(primePos - 3, 0, 6, height)
    minimapCtx.globalAlpha = 1
  })
  
  // Draw all cyclists
  const playerPos = (player.distance / RACE_DISTANCE) * width
  minimapCtx.fillStyle = player.color
  minimapCtx.fillRect(playerPos - 4, height / 2 - 6, 8, 12)
  
  aiCyclists.forEach(ai => {
    const aiPos = (ai.distance / RACE_DISTANCE) * width
    minimapCtx.fillStyle = ai.color
    minimapCtx.fillRect(aiPos - 4, height / 2 - 6, 8, 12)
  })
}

// Draw everything
function draw() {
  // Clear with dark background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  
  // Draw lane dividers
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 2
  for (let i = 1; i < LANES; i++) {
    const y = LANE_HEIGHT * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CANVAS_WIDTH, y)
    ctx.stroke()
  }
  
  // Draw grid effect (scrolling)
  ctx.strokeStyle = '#111111'
  ctx.lineWidth = 1
  const gridOffset = (player.distance * 2) % 40
  for (let x = -gridOffset; x < CANVAS_WIDTH; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CANVAS_HEIGHT)
    ctx.stroke()
  }
  
  // Draw finish line (similar to primes)
  const distanceToFinish = RACE_DISTANCE - player.distance
  if (distanceToFinish < CANVAS_WIDTH && distanceToFinish > 0) {
    const finishX = player.x + distanceToFinish
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.3
    ctx.fillRect(finishX - 50, 0, 100, CANVAS_HEIGHT)
    ctx.globalAlpha = 1
    
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.setLineDash([10, 10])
    ctx.strokeRect(finishX - 50, 0, 100, CANVAS_HEIGHT)
    ctx.setLineDash([])
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('FINISH', finishX, 30)
  }
  
  // Draw primes
  primes.forEach(prime => {
    const primeX = player.x + (prime.distance - player.distance)
    
    if (primeX > -100 && primeX < CANVAS_WIDTH + 100 && !prime.crossed.has('player')) {
      ctx.fillStyle = '#ffff00'
      ctx.globalAlpha = 0.3
      ctx.fillRect(primeX - 50, 0, 100, CANVAS_HEIGHT)
      ctx.globalAlpha = 1
      
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 10])
      ctx.strokeRect(primeX - 50, 0, 100, CANVAS_HEIGHT)
      ctx.setLineDash([])
      
      ctx.fillStyle = '#ffff00'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('PRIME', primeX, 30)
    }
  })
  
  // Draw obstacles
  obstacles.forEach(obs => {
    const y = LANE_HEIGHT * obs.lane + LANE_HEIGHT / 2
    ctx.fillStyle = '#ff0066'
    ctx.fillRect(obs.x - 15, y - 15, 30, 30)
    ctx.strokeStyle = '#ff3388'
    ctx.lineWidth = 2
    ctx.strokeRect(obs.x - 15, y - 15, 30, 30)
  })
  
  // Draw AI cyclists (only if on screen)
  aiCyclists.forEach(ai => {
    if (ai.x > -50 && ai.x < CANVAS_WIDTH + 50) {
      drawCyclist(ai)
    }
  })
  
  // Draw player (with glow if boosting)
  if (player.isBoosting) {
    ctx.shadowBlur = 20
    ctx.shadowColor = player.color
  }
  drawCyclist(player)
  ctx.shadowBlur = 0
  
  // Draw drafting indicator
  if (isDrafting()) {
    ctx.strokeStyle = '#00ffff'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(player.x - 25, player.y - 25, 50, 50)
    ctx.setLineDash([])
  }
  
  // Draw exhausted indicator
  if (isExhausted && exhaustedStartTime !== null) {
    ctx.fillStyle = '#ff0066'
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    const recoveryTimeLeft = Math.max(0, RECOVERY_TIME - (Date.now() - exhaustedStartTime)) / 1000
    ctx.fillText(`EXHAUSTED - Recovery in ${recoveryTimeLeft.toFixed(1)}s`, CANVAS_WIDTH / 2, 50)
  }
  
  // Update HUD
  const energyFill = document.getElementById('energyFill')!
  energyFill.style.width = `${energy}%`
  energyFill.style.background = energy > 50 ? '#00ff41' : energy > 25 ? '#ffaa00' : '#ff0066'
  
  document.getElementById('energyText')!.textContent = Math.floor(energy).toString()
  document.getElementById('speedText')!.textContent = player.speed.toFixed(1)
  document.getElementById('distanceText')!.textContent = Math.floor(player.distance).toString()
  
  // Update scores
  document.getElementById('scoreYou')!.textContent = player.score.toString()
  document.getElementById('scoreRed')!.textContent = aiCyclists[0].score.toString()
  document.getElementById('scoreBlue')!.textContent = aiCyclists[1].score.toString()
  
  // Draw minimap
  drawMinimap()
}

function drawCyclist(cyclist: Cyclist) {
  ctx.fillStyle = cyclist.color
  ctx.strokeStyle = cyclist.color
  ctx.lineWidth = 2
  
  // Simple bike + rider representation
  // Wheels
  ctx.beginPath()
  ctx.arc(cyclist.x - 10, cyclist.y + 8, 8, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cyclist.x + 10, cyclist.y + 8, 8, 0, Math.PI * 2)
  ctx.stroke()
  
  // Frame
  ctx.beginPath()
  ctx.moveTo(cyclist.x - 10, cyclist.y + 8)
  ctx.lineTo(cyclist.x, cyclist.y - 5)
  ctx.lineTo(cyclist.x + 10, cyclist.y + 8)
  ctx.stroke()
  
  // Rider
  ctx.fillRect(cyclist.x - 5, cyclist.y - 15, 10, 10)
}

// Game loop
function gameLoop() {
  update()
  draw()
  requestAnimationFrame(gameLoop)
}

console.log('Simple Cycling Game - MVP')
console.log('Controls: ↑↓/WS: Change lanes | ←→: Speed | Space: Boost')
console.log('Touch: Swipe ↑↓ Lanes | Drag ←→ Speed | Tap: Boost')
gameLoop()
