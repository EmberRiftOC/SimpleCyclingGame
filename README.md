# Cycling Game

A 10,000-meter criterium race where energy management and drafting strategy are key to victory.

## Core Concept

Race against AI opponents in a 10km criterium where:
- **Energy is finite** - it never regenerates
- **Drafting saves energy** - get close to other riders for up to 70% energy savings
- **Speed costs energy** - going faster drains energy exponentially
- **Primes reward aggression** - intermediate sprints award bonus points
- **Collisions hurt** - crash into someone and get knocked back 4-5 bike lengths

## Controls

### Desktop (Keyboard)
- **Up Arrow**: Accelerate
- **Down Arrow**: Brake/Slow down
- **Left/Right Arrow**: Change lanes

### Mobile
- Touch controls (coming soon)

## Game Mechanics

### Energy System
- Start with 100% energy
- Energy drains based on speed (exponential)
- Drafting reduces energy drain significantly:
  - 0-1 bike lengths: 70% savings
  - 1-2 bike lengths: 50% savings
  - 2-3 bike lengths: 30% savings
  - 3+ bike lengths: No benefit
- At 0% energy: speed drops to 50% of normal

### Drafting
Position yourself behind other riders to conserve energy. The closer you get, the more you save, but too close = collision risk.

### Primes (Intermediate Sprints)
- 3 randomized sprint points throughout the race
- Points awarded: 1st = 3pts, 2nd = 2pts, 3rd = 1pt
- Sprint for points or conserve energy for the finish

### Collisions
- Touch another rider's rear wheel = you get knocked back 4-5 bike lengths
- Only the rear rider crashes (the one doing the rear-ending)
- Costs time and energy to catch back up

### Finish Scoring
- 1st place: 15 points
- 2nd place: 10 points
- 3rd place: 6 points

## AI Opponents

Three types of AI riders:
- **Aggressive** (Orange): Fast, sprints for all primes, risky drafting
- **Balanced** (Teal): Smart pacing, opportunistic prime attacks
- **Defensive** (Mint): Conserves energy, avoids primes, strong finish

## Development

### Running Locally

1. Clone the repo
2. Serve with any static file server:
   ```bash
   python -m http.server 8000
   # or
   npx serve
   ```
3. Open `http://localhost:8000` in your browser

### Testing

```bash
npm install
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Architecture

- **Vanilla JavaScript** - No game engine, just HTML5 Canvas
- **Fixed timestep physics** - Deterministic 60Hz physics updates
- **Three-layer rendering** - Background, riders, UI (for performance)
- **Config-driven** - All game balance tuning in JSON files
- **TDD workflow** - Tests written first, then implementation

See `cycling-game-architecture.md` and `cycling-game-tech-specs.md` for detailed design docs.

## Project Structure

```
SimpleCyclingGame/
├── index.html              # Entry point
├── css/
│   └── styles.css          # Canvas layout
├── js/
│   ├── main.js             # Game loop
│   ├── game-state.js       # State management
│   ├── race-manager.js     # Race orchestration
│   ├── physics.js          # Physics engine
│   ├── renderer.js         # Canvas rendering
│   ├── ai.js               # AI decision-making
│   ├── input.js            # Input handling
│   ├── config.js           # Config loader
│   └── utils.js            # Utilities
├── config/
│   ├── race-config.json    # Race parameters
│   ├── energy-config.json  # Energy formulas
│   ├── drafting-config.json # Drafting zones
│   ├── ai-behaviors.json   # AI personalities
│   └── prime-config.json   # Prime rules
└── tests/
    ├── unit/               # Unit tests
    └── integration/        # Integration tests
```

## Design Philosophy

**Energy management is everything.** You have 100% energy for 10km. Normal pace uses ~90%. Going faster = exponential drain. Drafting = survival.

Every decision matters: When to attack, when to conserve, when to risk getting close.

Fast-paced, tactical, intense.

## License

MIT
