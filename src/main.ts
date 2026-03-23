import './style.css'

// Game constants
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const LANES = 3
const LANE_HEIGHT = CANVAS_HEIGHT / LANES
const PLAYER_START_X = 150
const SCROLL_SPEED = 3
const MAX_ENERGY = 100
const ENERGY_DRAIN_SOLO = 0.1
const ENERGY_DRAIN_BOOST = 0.5
const ENERGY_REGEN_DRAFT = 0.3
const BOOST_SPEED = 6

// Game state
interface Cyclist {
  x: number
  y: number
  lane: number
  speed: number
  color: string
  isBoosting: boolean
}

interface Obstacle {
  x: number
  lane: number
}

interface Prime {
  x: number
  crossed: boolean
}

let player: Cyclist = {
  x: PLAYER_START_X,
  y: LANE_HEIGHT * 1 + LANE_HEIGHT / 2,
  lane: 1,
  speed: 0,
  color: '#00ff41',
  isBoosting: false
}

let aiCyclists: Cyclist[] = [
  { x: 200, y: LANE_HEIGHT * 0 + LANE_HEIGHT / 2, lane: 0, speed: SCROLL_SPEED, color: '#ff3366', isBoosting: false },
  { x: 180, y: LANE_HEIGHT * 2 + LANE_HEIGHT / 2, lane: 2, speed: SCROLL_SPEED, color: '#3366ff', isBoosting: false }
]

let obstacles: Obstacle[] = []
let primes: Prime[] = []
let energy = MAX_ENERGY
let score = 0
let distance = 0
let keys: { [key: string]: boolean } = {}

// Initialize
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div class="game-container">
    <canvas id="gameCanvas" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></canvas>
    <div class="hud">
      <div class="energy-bar">
        <div class="energy-fill" id="energyFill"></div>
      </div>
      <div class="stats">
        <span>Energy: <span id="energyText">100</span></span>
        <span>Score: <span id="scoreText">0</span></span>
        <span>Distance: <span id="distanceText">0</span>m</span>
      </div>
    </div>
  </div>
`

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

// Input handling
document.addEventListener('keydown', (e) => {
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

// Spawn obstacles
function spawnObstacle() {
  if (Math.random() < 0.02) {
    obstacles.push({
      x: CANVAS_WIDTH,
      lane: Math.floor(Math.random() * LANES)
    })
  }
}

// Spawn primes
function spawnPrime() {
  if (primes.length < 5 && Math.random() < 0.001) {
    primes.push({
      x: CANVAS_WIDTH + 200,
      crossed: false
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
  distance += SCROLL_SPEED
  
  // Boost mechanic
  player.isBoosting = keys[' '] && energy > 0
  const currentSpeed = player.isBoosting ? BOOST_SPEED : SCROLL_SPEED
  
  // Energy management
  if (player.isBoosting) {
    energy -= ENERGY_DRAIN_BOOST
  } else if (isDrafting()) {
    energy = Math.min(MAX_ENERGY, energy + ENERGY_REGEN_DRAFT)
  } else {
    energy -= ENERGY_DRAIN_SOLO
  }
  energy = Math.max(0, energy)
  
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
    
    // Check if player crossed prime
    if (!prime.crossed && prime.x < player.x) {
      prime.crossed = true
      score += 20
    }
  })
  primes = primes.filter(p => p.x > -50)
  
  // AI behavior (simple)
  aiCyclists.forEach(ai => {
    ai.x -= currentSpeed - ai.speed
    if (ai.x < -50) ai.x = CANVAS_WIDTH + 50
  })
  
  spawnObstacle()
  spawnPrime()
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
  const gridOffset = (distance * 2) % 40
  for (let x = -gridOffset; x < CANVAS_WIDTH; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CANVAS_HEIGHT)
    ctx.stroke()
  }
  
  // Draw primes
  primes.forEach(prime => {
    if (!prime.crossed) {
      ctx.fillStyle = '#ffff00'
      ctx.globalAlpha = 0.3
      ctx.fillRect(prime.x - 50, 0, 100, CANVAS_HEIGHT)
      ctx.globalAlpha = 1
      
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 10])
      ctx.strokeRect(prime.x - 50, 0, 100, CANVAS_HEIGHT)
      ctx.setLineDash([])
      
      ctx.fillStyle = '#ffff00'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('PRIME', prime.x, 30)
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
  
  // Draw AI cyclists
  aiCyclists.forEach(ai => {
    drawCyclist(ai)
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
  
  // Update HUD
  const energyFill = document.getElementById('energyFill')!
  energyFill.style.width = `${energy}%`
  energyFill.style.background = energy > 50 ? '#00ff41' : energy > 25 ? '#ffaa00' : '#ff0066'
  
  document.getElementById('energyText')!.textContent = Math.floor(energy).toString()
  document.getElementById('scoreText')!.textContent = score.toString()
  document.getElementById('distanceText')!.textContent = Math.floor(distance).toString()
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
console.log('Controls: Arrow Keys / W/S to change lanes, Space to boost')
gameLoop()
