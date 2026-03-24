# Game Design Document - Simple Cycling Game

## Core Mechanics

### Energy System
- **Max Energy:** 100
- **Purpose:** Primary resource management - gates speed and abilities

#### Energy Drain
- **Base drain:** 0.08/frame when riding solo
- **Speed multiplier:** Additional drain scales with speed (MIN_SPEED to MAX_SPEED)
- **Boost drain:** 0.5/frame when boosting
- **Total drain at base speed (3.0):** ~0.18/frame = ~10.8/second

#### Energy Recovery
- **Drafting:** +0.4/frame = ~24/second (when behind AI cyclist)
- **Exhaustion recovery:** After 5 seconds at 0 energy → restore to 50 energy

#### Exhaustion State
- **Trigger:** Energy reaches 0
- **Effect:** Speed reduced to 0.8x (EXHAUSTED_SPEED)
- **Recovery timer:** 5 seconds
- **Recovery amount:** 50 energy

**⚠️ Known Issue:** At base speed, 50 energy drains in ~4.6 seconds, creating a death loop if not drafting immediately after recovery.

**Potential Solutions:**
1. Increase RECOVERY_ENERGY to 75 or 100
2. Add 3-second grace period (no drain) after recovery
3. Reduce base energy drain
4. Require player to find draft immediately after recovery (intended challenge?)

---

### Speed Control
- **Range:** 1.5x (slow) to 6.0x (fast)
- **Base:** 3.0x
- **Energy cost:** Faster = more drain
- **Strategic trade-off:** Go fast to position for primes, or go slow to conserve energy

---

### Drafting
- **Trigger:** Player is in same lane as AI cyclist AND within 100 units behind them
- **Benefit:** Energy regenerates at +0.4/frame (~24/second)
- **Risk:** Locked into AI's lane → harder to dodge obstacles
- **Visual:** Cyan dashed outline around player

---

### Primes (Sprint Points)
- **Count:** 5 randomly spawned throughout race
- **Points awarded:**
  - 1st across: 20pts
  - 2nd across: 10pts
  - 3rd across: 5pts
- **Strategic depth:** Contest every prime vs. conserve for finish

---

### Finish Line
- **Distance:** 10,000 meters
- **Points:** 100pts for 1st, 50pts for 2nd, 25pts for 3rd (TODO: verify)
- **Win condition:** Highest total score (primes + finish position)

---

## Calculated Values & Balance

### Energy Math
```
Speed 3.0 (base):
  - speedFactor = (3.0 - 1.5) / (6.0 - 1.5) = 0.333
  - drain = 0.08 + (0.333 * 0.3) = 0.18/frame
  - At 60fps: 10.8 energy/second

Drafting at speed 3.0:
  - Net recovery: +0.4 - 0.18 = +0.22/frame = +13.2/second

Exhaustion recovery:
  - Wait 5 seconds → get 50 energy
  - Time until re-exhaust (solo): 50 / 10.8 = 4.6 seconds
  - Time until re-exhaust (drafting): Never (net positive)
```

### Strategic Implications
- **Drafting is essential** for long-term survival
- **Speed control** lets you match AI pace to maintain draft
- **Breaking out for primes** requires energy reserves
- **Recovery puts you in deficit** unless you immediately draft

---

## AI Behavior
- **Speed:** Constant BASE_SCROLL_SPEED (3.0)
- **Lane changes:** Random (1% chance/frame)
- **Prime behavior:** TODO - do AI contest primes?
- **Positioning:** Maintain fixed distance offsets from player

---

## Mobile Controls
- **Swipe up/down:** Change lanes (5 energy cost)
- **Drag left/right:** Adjust speed continuously
- **Tap:** Boost for 0.5 seconds
- **Speed slider:** Appears after first touch, shows current speed

---

## Design Questions / TODOs
1. Should RECOVERY_ENERGY be higher? (75? 100?)
2. Should there be a grace period after recovery?
3. Do AI cyclists contest primes? (affects difficulty)
4. Should obstacles damage energy more/less?
5. Should boost cost scale with duration?
6. What's the intended difficulty curve? (obstacles get denser over time?)

---

## Change Log
- 2026-03-24: Initial design doc created
- 2026-03-24: Identified exhaustion death loop issue
