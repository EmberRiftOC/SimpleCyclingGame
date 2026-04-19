/**
 * NeonCityBackground — pixel-art parallax city background for a 5-lane cycling game.
 *
 * Usage:
 *   const bg = new NeonCityBackground(canvas);
 *   // in your game loop:
 *   bg.update(deltaTimeSeconds);
 *   bg.render();
 *
 *   bg.speed = 4;        // set scroll speed
 *   bg.paused = true;    // pause scrolling
 *   bg.scrollX;          // read current scroll offset
 *   bg.LANE_COUNT;       // 5
 *   bg.getLaneY(lane);   // get center Y of lane 0–4
 */

// ── Types ──

interface Star {
  x: number;
  y: number;
  brightness: number;
  twinkleSpeed: number;
  size: number;
}

interface WindowDef {
  rx: number;
  ry: number;
  color: string;
}

interface RoofFeature {
  type: "ac" | "tower" | "antenna";
  rx: number;
}

interface Building {
  x: number;
  w: number;
  h: number;
  color: string;
  windows: WindowDef[];
  roofFeatures: RoofFeature[];
  textureSeed: number;
  panels: number[];
}

interface Puddle {
  offset: number;
  lane: number;
  w: number;
  h: number;
}

interface Crater {
  cx: number;
  cy: number;
  r: number;
}

type PixelGlyph = [number, number, number, number, number];

// ── Seeded PRNG ──

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Pixel font (3×5 glyphs for lane numbers) ──

const PIXEL_FONT: Record<string, PixelGlyph> = {
  "1": [0b010, 0b110, 0b010, 0b010, 0b111],
  "2": [0b111, 0b001, 0b111, 0b100, 0b111],
  "3": [0b111, 0b001, 0b111, 0b001, 0b111],
  "4": [0b101, 0b101, 0b111, 0b001, 0b001],
  "5": [0b111, 0b100, 0b111, 0b001, 0b111],
};

// ── Main class ──

export class NeonCityBackground {
  // Public config
  readonly WIDTH = 384;
  readonly HEIGHT = 216;
  readonly LANE_COUNT = 5;
  readonly ROAD_TOP = 152;

  speed = 2;
  paused = false;
  scrollX = 0;

  // Internals
  private ctx: CanvasRenderingContext2D;
  private time = 0;

  private readonly roadBottom: number;
  private readonly laneHeight: number;
  private readonly dashLength = 8;
  private readonly dashGap = 6;
  private readonly lampSpacing = 65;

  private stars: Star[] = [];
  private farBuildings: Building[] = [];
  private nearBuildings: Building[] = [];
  private asphaltNoise: number[] = [];
  private puddles: Puddle[] = [];

  private srand: () => number;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = this.WIDTH;
    canvas.height = this.HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");
    this.ctx = ctx;

    this.roadBottom = this.HEIGHT;
    this.laneHeight = (this.roadBottom - this.ROAD_TOP) / this.LANE_COUNT;

    this.srand = mulberry32(42);
    this.generateWorld();
  }

  /** Center Y coordinate for a given lane index (0-based). */
  getLaneY(lane: number): number {
    return this.ROAD_TOP + lane * this.laneHeight + this.laneHeight / 2;
  }

  /** Advance time. Call once per frame with your delta in seconds. */
  update(dt: number): void {
    if (this.paused) return;
    this.time += dt;
    this.scrollX += this.speed;
  }

  /** Draw the full background to the canvas. Call after update(). */
  render(): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
    this.drawSky();
    this.drawBuildingLayer(this.farBuildings, 0.12, this.ROAD_TOP - 3, true);
    this.drawBuildingLayer(this.nearBuildings, 0.5, this.ROAD_TOP, false);
    this.drawSidewalk();
    this.drawRoad();
    this.drawLaneNumbers();
    this.drawStreetlights();
    this.drawAtmosphere();
  }

  // ── World generation ──

  private generateWorld(): void {
    this.generateStars();
    this.farBuildings = this.generateBuildings(
      80, 35, 85, 12, 30,
      ["#08081a", "#0a0a1e", "#0c0c20", "#0b0b1c"],
      true,
    );
    this.nearBuildings = this.generateBuildings(
      60, 45, 115, 16, 38,
      ["#111126", "#13132a", "#0f0f22", "#151530", "#12122a"],
      false,
    );
    this.generateAsphaltNoise();
    this.generatePuddles();
  }

  private generateStars(): void {
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * this.WIDTH,
        y: Math.random() * this.HEIGHT * 0.25,
        brightness: 0.2 + Math.random() * 0.8,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        size: Math.random() < 0.1 ? 2 : 1,
      });
    }
  }

  private generateBuildings(
    count: number,
    minH: number,
    maxH: number,
    minW: number,
    maxW: number,
    palettes: string[],
    isFar: boolean,
  ): Building[] {
    const buildings: Building[] = [];
    let x = 0;
    const r = this.srand;

    for (let i = 0; i < count; i++) {
      const w = minW + Math.floor(r() * (maxW - minW));
      const h = minH + Math.floor(r() * (maxH - minH));
      const color = palettes[Math.floor(r() * palettes.length)];

      // Windows
      const windows: WindowDef[] = [];
      const winSpacingX = 4 + Math.floor(r() * 2);
      const winSpacingY = 5 + Math.floor(r() * 2);
      for (let wy = 3; wy < h - 3; wy += winSpacingY) {
        for (let wx = 2; wx < w - 2; wx += winSpacingX) {
          const roll = r();
          let wc: string;
          if (roll < 0.35) wc = "#0a0a14";
          else if (roll < 0.5) wc = "#14121a";
          else if (roll < 0.78) wc = "#c49530";
          else if (roll < 0.85) wc = "#ddb244";
          else if (roll < 0.9) wc = "#a08028";
          else if (roll < 0.94) wc = "#7ab0c8";
          else wc = "#e8d8b0";
          windows.push({ rx: wx, ry: wy, color: wc });
        }
      }

      // Roof features
      const roofFeatures: RoofFeature[] = [];
      if (!isFar && r() < 0.5) {
        const ftype: RoofFeature["type"] = r() < 0.6 ? "ac" : "tower";
        roofFeatures.push({ type: ftype, rx: 2 + Math.floor(r() * (w - 6)) });
      }
      if (!isFar && r() < 0.3) {
        roofFeatures.push({ type: "antenna", rx: Math.floor(r() * w) });
      }

      const textureSeed = Math.floor(r() * 10000);
      const panels: number[] = [];
      if (!isFar && w > 20) {
        const panelCount = 1 + Math.floor(r() * 2);
        for (let p = 0; p < panelCount; p++) {
          panels.push(4 + Math.floor(r() * (w - 8)));
        }
      }

      buildings.push({ x, w, h, color, windows, roofFeatures, textureSeed, panels });
      x += w + Math.floor(r() * 4);
    }
    return buildings;
  }

  private generateAsphaltNoise(): void {
    const count = this.WIDTH * (this.roadBottom - this.ROAD_TOP);
    for (let i = 0; i < count; i++) {
      this.asphaltNoise.push(this.srand() * 0.06);
    }
  }

  private generatePuddles(): void {
    for (let i = 0; i < 12; i++) {
      this.puddles.push({
        offset: Math.floor(this.srand() * 600),
        lane: Math.floor(this.srand() * this.LANE_COUNT),
        w: 6 + Math.floor(this.srand() * 14),
        h: 2 + Math.floor(this.srand() * 2),
      });
    }
  }

  // ── Drawing helpers ──

  private rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
  }

  private pixelText(text: string, x: number, y: number, color: string): void {
    this.ctx.fillStyle = color;
    let cx = x;
    for (const ch of text) {
      const glyph = PIXEL_FONT[ch];
      if (glyph) {
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 3; col++) {
            if (glyph[row] & (1 << (2 - col))) {
              this.ctx.fillRect(cx + col, y + row, 1, 1);
            }
          }
        }
      }
      cx += 4;
    }
  }

  private getLayerWidth(buildings: Building[]): number {
    if (buildings.length === 0) return this.WIDTH;
    const last = buildings[buildings.length - 1];
    return last.x + last.w + 10;
  }

  // ── Sky ──

  private drawSky(): void {
    const { ctx, ROAD_TOP: rt, WIDTH: W } = this;

    // Gradient
    for (let y = 0; y < rt; y++) {
      const t = y / rt;
      ctx.fillStyle = `rgb(${Math.floor(6 + t * 18)},${Math.floor(4 + t * 8)},${Math.floor(18 + t * 24)})`;
      ctx.fillRect(0, y, W, 1);
    }

    // Horizon glow
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#ff6a2a";
    ctx.fillRect(0, rt - 6, W, 4);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#cc4400";
    ctx.fillRect(0, rt - 10, W, 6);
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#ff8844";
    ctx.fillRect(0, rt - 16, W, 10);
    ctx.globalAlpha = 1;

    // Stars
    for (const star of this.stars) {
      const alpha =
        0.2 + 0.6 * Math.abs(Math.sin(this.time * star.twinkleSpeed + star.brightness * 10));
      ctx.globalAlpha = alpha * star.brightness;
      ctx.fillStyle = "#ffe8cc";
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    }
    ctx.globalAlpha = 1;

    this.drawMoon();
  }

  private drawMoon(): void {
    const { ctx } = this;
    const mx = 310;
    const my = 20;
    const moonR = 7;
    const cutOffsetX = 4;
    const cutOffsetY = -1;
    const cutR = 6;

    // Glow layers
    for (let layer = 3; layer >= 1; layer--) {
      const gr = moonR + layer * 4;
      ctx.globalAlpha = 0.02 / layer;
      ctx.fillStyle = "#ffe8cc";
      for (let dy = -gr; dy <= gr; dy++) {
        for (let dx = -gr; dx <= gr; dx++) {
          if (dx * dx + dy * dy <= gr * gr) {
            ctx.fillRect(mx + dx, my + dy, 1, 1);
          }
        }
      }
    }

    // Crescent body with surface shading
    for (let dy = -moonR; dy <= moonR; dy++) {
      for (let dx = -moonR; dx <= moonR; dx++) {
        const inMoon = dx * dx + dy * dy <= moonR * moonR;
        const inCut =
          (dx + cutOffsetX) * (dx + cutOffsetX) +
            (dy + cutOffsetY) * (dy + cutOffsetY) <=
          cutR * cutR;
        if (inMoon && !inCut) {
          const edgeFactor = (dx + moonR) / (moonR * 2);
          const brightness = 0.65 + edgeFactor * 0.35;
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = `rgb(${Math.floor(232 * brightness)},${Math.floor(224 * brightness)},${Math.floor(208 * brightness)})`;
          ctx.fillRect(mx + dx, my + dy, 1, 1);
        }
      }
    }

    // Craters
    const craters: Crater[] = [
      { cx: -2, cy: -2, r: 1 },
      { cx: -3, cy: 1, r: 1 },
      { cx: -1, cy: 3, r: 1 },
      { cx: -4, cy: -1, r: 0 },
      { cx: -2, cy: 5, r: 0 },
    ];
    for (const c of craters) {
      const inMoon = c.cx * c.cx + c.cy * c.cy <= moonR * moonR;
      const inCut =
        (c.cx + cutOffsetX) * (c.cx + cutOffsetX) +
          (c.cy + cutOffsetY) * (c.cy + cutOffsetY) <=
        cutR * cutR;
      if (inMoon && !inCut) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#a09880";
        if (c.r === 0) {
          ctx.fillRect(mx + c.cx, my + c.cy, 1, 1);
        } else {
          for (let dy2 = -c.r; dy2 <= c.r; dy2++) {
            for (let dx2 = -c.r; dx2 <= c.r; dx2++) {
              if (dx2 * dx2 + dy2 * dy2 <= c.r * c.r) {
                ctx.fillRect(mx + c.cx + dx2, my + c.cy + dy2, 1, 1);
              }
            }
          }
        }
      }
    }

    // Terminator edge
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#887860";
    for (let dy = -moonR; dy <= moonR; dy++) {
      for (let dx = -moonR; dx <= moonR; dx++) {
        const inMoon = dx * dx + dy * dy <= moonR * moonR;
        const distToCut = Math.sqrt(
          (dx + cutOffsetX) * (dx + cutOffsetX) + (dy + cutOffsetY) * (dy + cutOffsetY),
        );
        if (inMoon && Math.abs(distToCut - cutR) < 1.2 && distToCut >= cutR) {
          ctx.fillRect(mx + dx, my + dy, 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Buildings ──

  private drawBuildingLayer(
    buildings: Building[],
    scrollFactor: number,
    baseY: number,
    isFar: boolean,
  ): void {
    const { ctx } = this;
    const layerW = this.getLayerWidth(buildings);
    const offset = (this.scrollX * scrollFactor) % layerW;

    for (const b of buildings) {
      const bx = b.x - offset;
      const wrappedX = (((bx % layerW) + layerW) % layerW) - 100;
      if (wrappedX > this.WIDTH + 50 || wrappedX + b.w < -50) continue;
      const by = baseY - b.h;

      // Body
      this.rect(wrappedX, by, b.w, b.h, b.color);

      // Surface texture
      const tRand = mulberry32(b.textureSeed);
      if (!isFar) {
        ctx.globalAlpha = 0.04;
        for (let ty = 0; ty < b.h; ty += 2) {
          for (let tx = 0; tx < b.w; tx += 2) {
            if (tRand() < 0.3) {
              ctx.fillStyle = tRand() < 0.5 ? "#ffffff" : "#000000";
              ctx.fillRect(wrappedX + tx, by + ty, 1, 1);
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // Panel lines
      for (const px of b.panels) {
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = "#000000";
        ctx.fillRect(wrappedX + px, by, 1, b.h);
        ctx.globalAlpha = 1;
      }

      // Edges
      this.rect(wrappedX, by, b.w, 1, "#2a2a44");
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = "#000000";
      ctx.fillRect(wrappedX, by, 1, b.h);
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(wrappedX + b.w - 1, by, 1, b.h);
      ctx.globalAlpha = 1;

      // Roof features
      for (const feat of b.roofFeatures) {
        if (feat.type === "ac") {
          this.rect(wrappedX + feat.rx, by - 3, 4, 3, "#1a1a2a");
          this.rect(wrappedX + feat.rx, by - 3, 4, 1, "#2a2a3a");
          this.rect(wrappedX + feat.rx + 1, by - 2, 2, 1, "#222233");
        } else if (feat.type === "tower") {
          this.rect(wrappedX + feat.rx + 1, by - 8, 2, 8, "#181828");
          this.rect(wrappedX + feat.rx, by - 5, 4, 5, "#1a1a2c");
          this.rect(wrappedX + feat.rx, by - 5, 4, 1, "#2a2a3c");
        } else if (feat.type === "antenna") {
          this.rect(wrappedX + feat.rx, by - 6, 1, 6, "#2a2a3a");
          if (Math.sin(this.time * 2) > 0) {
            ctx.fillStyle = "#ff2222";
            ctx.fillRect(wrappedX + feat.rx, by - 7, 1, 1);
            ctx.globalAlpha = 0.2;
            ctx.fillRect(wrappedX + feat.rx - 1, by - 8, 3, 3);
            ctx.globalAlpha = 1;
          }
        }
      }

      // Windows
      for (const win of b.windows) {
        const isLit = win.color !== "#0a0a14" && win.color !== "#14121a";
        this.rect(wrappedX + win.rx, by + win.ry, 2, 3, win.color);
        if (isLit && !isFar) {
          ctx.globalAlpha = 0.03;
          ctx.fillStyle = win.color;
          ctx.fillRect(wrappedX + win.rx - 1, by + win.ry + 3, 4, 2);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  // ── Sidewalk ──

  private drawSidewalk(): void {
    const { ctx } = this;
    const swY = this.ROAD_TOP - 5;
    const swH = 5;

    this.rect(0, swY, this.WIDTH, swH, "#1e1e30");
    this.rect(0, swY, this.WIDTH, 1, "#33334a");
    this.rect(0, swY + swH - 1, this.WIDTH, 1, "#14141e");

    const slabW = 10;
    for (let sx = 0; sx < this.WIDTH + slabW; sx += slabW) {
      const wx = sx - (Math.floor(this.scrollX * 0.95) % slabW);
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#000000";
      ctx.fillRect(wx, swY + 1, 1, swH - 2);
      ctx.globalAlpha = 1;
    }
  }

  // ── Road ──

  private drawRoad(): void {
    const { ctx, WIDTH: W, ROAD_TOP: rt, roadBottom: rb, laneHeight: lh } = this;

    this.rect(0, rt, W, rb - rt, "#18181f");

    // Alternating lane shade
    for (let lane = 0; lane < this.LANE_COUNT; lane++) {
      if (lane % 2 === 1) {
        ctx.globalAlpha = 0.04;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, rt + lane * lh, W, lh);
        ctx.globalAlpha = 1;
      }
    }

    // Asphalt grain
    const roadH = rb - rt;
    for (let py = 0; py < roadH; py++) {
      for (let px = 0; px < W; px++) {
        const n = this.asphaltNoise[(py * W + px) % this.asphaltNoise.length];
        if (n > 0.04) {
          ctx.globalAlpha = n;
          ctx.fillStyle = n > 0.05 ? "#2a2a35" : "#101018";
          ctx.fillRect(px, rt + py, 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;

    // Tire wear
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = "#111118";
    for (let lane = 0; lane < this.LANE_COUNT; lane++) {
      const ly1 = rt + lane * lh + Math.floor(lh * 0.35);
      const ly2 = rt + lane * lh + Math.floor(lh * 0.65);
      ctx.fillRect(0, ly1, W, 1);
      ctx.fillRect(0, ly2, W, 1);
    }
    ctx.globalAlpha = 1;

    // Puddles
    for (const puddle of this.puddles) {
      const px = (puddle.offset - Math.floor(this.scrollX * 0.9)) % (W + 100);
      const adjustedPx = (((px % (W + 100)) + W + 100) % (W + 100)) - 50;
      if (adjustedPx < -20 || adjustedPx > W + 20) continue;
      const py = rt + puddle.lane * lh + Math.floor(lh / 2) - 1;

      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#0a0a18";
      ctx.fillRect(adjustedPx, py, puddle.w, puddle.h);
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "#ffcc66";
      ctx.fillRect(adjustedPx + 1, py, puddle.w - 2, 1);
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = puddle.lane % 2 === 0 ? "#ff6633" : "#6688cc";
      ctx.fillRect(adjustedPx + 2, py + 1, puddle.w - 4, 1);
      ctx.globalAlpha = 1;
    }

    // Lane dividers
    for (let lane = 1; lane < this.LANE_COUNT; lane++) {
      const ly = rt + lane * lh;
      const isCenter = lane === Math.floor(this.LANE_COUNT / 2);
      const lineColor = isCenter ? "#9a8522" : "#444455";

      for (let dx = 0; dx < W; dx++) {
        const worldX = dx + Math.floor(this.scrollX);
        if (worldX % (this.dashLength + this.dashGap) < this.dashLength) {
          ctx.fillStyle = lineColor;
          ctx.fillRect(dx, ly, 1, 1);
          if (isCenter) {
            ctx.globalAlpha = 0.04;
            ctx.fillRect(dx, ly + 1, 1, 1);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    // Road edges
    this.rect(0, rt, W, 1, "#3a3a4a");
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#888899";
    ctx.fillRect(0, rt + 1, W, 1);
    ctx.fillRect(0, rb - 1, W, 1);
    ctx.globalAlpha = 1;
  }

  // ── Streetlights ──

  private drawStreetlights(): void {
    const { ctx, ROAD_TOP: rt, roadBottom: rb, WIDTH: W } = this;

    for (let lx = 0; lx < W + this.lampSpacing; lx += this.lampSpacing) {
      const worldLx = lx - (Math.floor(this.scrollX * 0.95) % this.lampSpacing);
      if (worldLx < -15 || worldLx > W + 15) continue;

      // Post
      this.rect(worldLx, rt - 24, 2, 24, "#2a2a3a");
      this.rect(worldLx + 1, rt - 24, 1, 24, "#333344");
      // Arm
      this.rect(worldLx + 2, rt - 23, 1, 1, "#2a2a3a");
      this.rect(worldLx + 3, rt - 22, 2, 1, "#2a2a3a");
      this.rect(worldLx + 5, rt - 21, 2, 1, "#2a2a3a");
      // Housing
      this.rect(worldLx + 5, rt - 23, 3, 2, "#3a3a4a");
      // Bulb
      this.rect(worldLx + 6, rt - 21, 2, 1, "#ffdd88");
      ctx.fillStyle = "#ffeeaa";
      ctx.fillRect(worldLx + 6, rt - 21, 1, 1);

      // Halo
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#ffcc66";
      for (let r = 1; r <= 4; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r) {
              ctx.fillRect(worldLx + 6 + dx, rt - 21 + dy, 1, 1);
            }
          }
        }
        ctx.globalAlpha *= 0.5;
      }
      ctx.globalAlpha = 1;

      // Light cone
      const centerX = worldLx + 7;
      for (let dy = 0; dy < rb - rt; dy++) {
        const spread = 2 + dy * 0.5;
        ctx.globalAlpha = Math.max(0, 0.08 - dy * 0.0012);
        ctx.fillStyle = "#ffcc66";
        ctx.fillRect(centerX - spread, rt + dy, spread * 2, 1);
      }
      ctx.globalAlpha = 1;

      // Reflection streak
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = "#ffaa44";
      ctx.fillRect(centerX - 3, rt + 8, 6, rb - rt - 10);
      ctx.globalAlpha = 1;
    }
  }

  // ── Atmosphere / vignette ──

  private drawAtmosphere(): void {
    const { ctx, WIDTH: W, HEIGHT: H, ROAD_TOP: rt } = this;

    ctx.globalAlpha = 0.04;
    ctx.fillStyle = "#334466";
    ctx.fillRect(0, rt - 20, W, 15);
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = "#ff8844";
    ctx.fillRect(0, rt - 8, W, 8);
    ctx.globalAlpha = 1;

    // Vignette
    for (let x = 0; x < 20; x++) {
      ctx.globalAlpha = (20 - x) * 0.008;
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, 0, 1, H);
      ctx.fillRect(W - 1 - x, 0, 1, H);
    }
    ctx.globalAlpha = 1;
  }

  // ── Lane numbers ──

  private drawLaneNumbers(): void {
    this.ctx.globalAlpha = 0.08;
    for (let lane = 0; lane < this.LANE_COUNT; lane++) {
      const ly =
        this.ROAD_TOP + lane * this.laneHeight + Math.floor(this.laneHeight / 2) - 2;
      for (let rep = 0; rep < 3; rep++) {
        const lnx = 60 + rep * 150 - (Math.floor(this.scrollX * 0.7) % 150);
        if (lnx > -10 && lnx < this.WIDTH + 10) {
          this.pixelText(String(lane + 1), lnx, ly, "#888899");
        }
      }
    }
    this.ctx.globalAlpha = 1;
  }
}
