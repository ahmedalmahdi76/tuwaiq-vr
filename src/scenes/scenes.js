// The diorama scenes (NATURE_SCENES.md §5), one class per station. N.3: stations 9, 3 and 4.
//
// Every scene gets a context `ctx` from its station:
//   ctx.X(x), ctx.Y(y)  curve coordinates → station-local metres
//   ctx.base            the plinth top (station-local y); ctx.z the curve plane (station-local z)
//   ctx.window          [y0, y1] the station's curve window; ctx.f(x, params) the function
// and implements:
//   update(params)   re-anchor everything to the curve (called on load and while a parameter morphs)
//   resting(params)  where the traveller rests: { x, y (curve units) | localY, pose, yaw }
//   tick(dt)         small animations (only the nearest station)
//   dispose()
// Anchors keep sad props at the low part of the curve and happy props at the high part, whatever
// the parameters do (they mirror / move zones when the shape flips).
import * as THREE from 'three';
import { Rise, RockPile, Sign, RainCloud, Sun, PropSet, KenneyTree, Petals } from './kit.js';
import { SIGNS } from '../nature-content.js';

const clamp = THREE.MathUtils.clamp;
const FRONT = 0.33; // sign row: in front of the curve plane, on the plinth
const BACK = -0.08; // hills sit a little behind the curve plane so the ribbon runs over their top

class Scene {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.parts = [];
    this.ticking = [];
  }

  add(part, { tick = false } = {}) {
    this.parts.push(part);
    this.group.add(part.group || part.mesh);
    if (tick) this.ticking.push(part);
    return part;
  }

  tick(dt) {
    for (const p of this.ticking) p.tick(dt);
  }

  dispose() {
    this.parts.forEach((p) => p.dispose?.());
  }
}

// ---------------------------------------------------------------- 9: the quadratic (photo 3)
class Scene9 extends Scene {
  constructor(ctx) {
    super(ctx);
    const s = SIGNS[9];
    this.rocks = this.add(new RockPile({ radius: 0.3, seed: 91 }));
    this.rocks2 = this.add(new RockPile({ radius: 0.24, seed: 92 }));
    this.pedestal = this.add(new RockPile({ radius: 0.13, seed: 93 }));
    this.sprout = this.add(new PropSet(['stone_smallFlatA', 'grass_leafs'], 1));
    this.rise = this.add(new Rise({ seed: 94, radius: 0.46, stairs: true, flowerCount: 9 }));
    this.cloud = this.add(new RainCloud({ seed: 95 }), { tick: true });
    this.cloud2 = this.add(new RainCloud({ seed: 96, scale: 0.85 }), { tick: true });
    this.sun = this.add(new Sun(), { tick: true });
    this.signSad = this.add(new Sign({ text: s.left, theme: 'lilac' }));
    this.signTurn = this.add(new Sign({ text: s.vertex, theme: 'lilac', w: 0.4, h: 0.3 }));
    this.signHope = this.add(new Sign({ text: s.right, theme: 'pink', w: 0.4, h: 0.3 }));
  }

  /** Vertex and the side spots, in curve units. */
  layout(p) {
    const { f, window: [y0, y1] } = this.ctx;
    const a = p.a;
    const xv = -p.b / (2 * a);
    const yv = f(xv, p);
    const at = (x) => clamp(f(x, p), y0, y1);
    if (a > 0) {
      // valley: sad on the left (high), turning point at the vertex, hope on the right (high)
      const sadTarget = Math.min(y1 - 0.3, Math.max(yv + 0.6, yv + 0.85));
      const xs = clamp(xv - Math.sqrt((sadTarget - yv) / a), -2.75, xv - 0.3);
      const hopeTarget = Math.min(y1 - 0.4, yv + 1.35);
      const xh = clamp(xv + Math.sqrt((hopeTarget - yv) / a), xv + 0.3, 2.7);
      return { valley: true, xv, yv, xs, ys: at(xs), xh, yh: at(xh) };
    }
    // hill: the vertex is a sunny peak; both falling sides get rocks and rain
    const low = y0 + 0.35;
    // keep the two sad sides well apart from the peak (they stay inside the plinth)
    const dx = Math.max(1.45, yv > low ? Math.sqrt((yv - low) / -a) : 2);
    const xl = clamp(xv - dx, -2.75, 2.75);
    const xr = clamp(xv + dx, -2.75, 2.75);
    return { valley: false, xv, yv, xl, yl: at(xl), xr, yr: at(xr), peak: yv > y0 + 0.08 };
  }

  update(p) {
    const { X, Y, base, z } = this.ctx;
    const L = this.layout(p);
    const [y0, y1] = this.ctx.window;
    const signX = (x) => clamp(x, -2.75, 2.75);
    if (L.valley) {
      this.rocks.place(X(L.xs), z, base, Y(L.ys) - 0.02);
      this.cloud.place(X(L.xs - 0.1), Y(Math.min(L.ys + 1.3, y1 + 0.3)), z - 0.05);
      this.rocks2.group.visible = false;
      this.cloud2.group.visible = false;
      // the turning point: a small stone with a sprout on a pedestal of stones
      const vertexOn = L.yv > y0 + 0.02 && L.yv < y1;
      this.pedestal.group.visible = vertexOn && L.yv > y0 + 0.15;
      if (vertexOn) this.pedestal.place(X(L.xv), z + 0.02, base, Y(L.yv) - 0.04);
      this.sprout.group.visible = vertexOn;
      if (vertexOn) {
        this.sprout.set([
          { name: 'stone_smallFlatA', x: X(L.xv) + 0.03, y: Y(L.yv) - 0.04, z: z + 0.06, scale: 0.4 },
          { name: 'grass_leafs', x: X(L.xv) - 0.06, y: Y(L.yv) - 0.04, z: z + 0.08, scale: 0.6 },
        ]);
      }
      this.rise.group.visible = true;
      this.rise.place(X(L.xh) + 0.12, z + BACK, base, Y(L.yh) - 0.03, -1);
      // the sun at the top of the right arm, just above the curve (like the photo)
      const xt = Math.min(2.6, L.xv + Math.sqrt(Math.max(0, (y1 - L.yv) / p.a)));
      this.sun.place(X(xt) + 0.28, Y(y1) + 0.05, z - 0.15);
      this.signSad.place(X(signX(L.xs - 0.55)), base, z + FRONT);
      this.signTurn.place(X(signX(L.xv)), base, z + FRONT + 0.04);
      this.signHope.place(X(signX(Math.max(L.xh + 0.55, L.xv + 1.2))), base, z + FRONT);
      return;
    }
    // a < 0: a sunny peak at the vertex, rocks and rain on both falling sides
    this.rise.group.visible = L.peak;
    if (L.peak) this.rise.place(X(L.xv), z + BACK, base, Y(Math.min(L.yv, y1)) - 0.03, -1);
    this.sun.place(X(L.xv), Y(Math.min(Math.max(L.yv, y0) + 1.1, y1 + 0.4)), z - 0.15);
    this.rocks.place(X(L.xl), z, base, Y(L.yl) - 0.02);
    this.rocks2.group.visible = true;
    this.rocks2.place(X(L.xr), z, base, Y(L.yr) - 0.02, { flip: -1 });
    this.cloud.place(X(L.xl), Y(Math.min(L.yl + 1.2, y1 + 0.3)), z - 0.05);
    this.cloud2.group.visible = true;
    this.cloud2.place(X(L.xr), Y(Math.min(L.yr + 1.2, y1 + 0.3)), z - 0.05);
    this.pedestal.group.visible = false;
    this.sprout.group.visible = false;
    this.signSad.place(X(signX(L.xl - 0.5)), base, z + FRONT);
    this.signTurn.place(X(signX(L.xv)), base, z + FRONT + 0.04);
    this.signHope.place(X(signX(L.xv + 0.95)), base, z + FRONT + 0.02);
  }

  resting(p) {
    const L = this.layout(p);
    // on the rocks at the left falling part, under the rain cloud
    return L.valley ? { x: L.xs, y: L.ys, pose: 'sitHug', yaw: 15 } : { x: L.xl, y: L.yl, pose: 'sitHug', yaw: 15 };
  }
}

// ---------------------------------------------------------------- 3: the line (photo 2)
class Scene3 extends Scene {
  constructor(ctx) {
    super(ctx);
    const s = SIGNS[3];
    this.rocks = this.add(new RockPile({ radius: 0.34, seed: 31 }));
    this.tree = this.add(new KenneyTree('tree_thin', { leaves: false }));
    this.rise = this.add(new Rise({ seed: 32, radius: 0.5, stairs: true, flowerCount: 10 }));
    this.sun = this.add(new Sun({ size: 0.45 }), { tick: true });
    this.meadow = this.add(new PropSet(['grass', 'grass_large', 'grass_leafs', 'plant_bushSmall', 'flower_redA', 'flower_yellowA', 'flower_purpleA'], 14));
    this.signLow = this.add(new Sign({ text: s.low, theme: 'lilac' }));
    this.signHigh = this.add(new Sign({ text: s.high, theme: 'pink' }));
  }

  update(p) {
    const { X, Y, base, z, f, window: [y0, y1] } = this.ctx;
    const at = (x) => clamp(f(x, p), y0, y1);
    const list = [];
    if (p.m === 0) {
      // a flat meadow with flowers on both sides
      this.rocks.group.visible = this.tree.group.visible = this.rise.group.visible = this.sun.group.visible = false;
      for (let i = 0; i < 14; i++) {
        const x = -2.8 + (i / 13) * 5.6;
        list.push({ name: ['flower_redA', 'flower_yellowA', 'flower_purpleA'][i % 3], x: X(x), y: base, z: z + 0.18 + (i % 2) * 0.1, scale: 0.6 });
        list.push({ name: i % 2 ? 'grass' : 'grass_large', x: X(x + 0.2), y: base, z: z - 0.15, scale: 0.55 });
      }
      this.meadow.set(list);
      this.signLow.place(X(-2.5), base, z + FRONT);
      this.signHigh.place(X(2.5), base, z + FRONT);
      return;
    }
    // m ≠ 0: the low end (rocks, a bare tree) and the high end (a hill or mesa with stairs and the
    // sun). m < 0 mirrors the scene.
    const dir = Math.sign(p.m);
    const xl = -2.7 * dir;
    // the hill / mesa stands where the line is at most RISE_MAX above the plinth (a mesa, not a
    // tower); the sun still marks the line's high end
    const RISE_MAX = 4.4; // curve units (≈ 2 m)
    const xCap = (y0 + RISE_MAX - p.b) / p.m;
    const xh = dir > 0 ? clamp(Math.min(2.3, xCap), 0.6, 2.3) : clamp(Math.max(-2.3, xCap), -2.3, -0.6);
    this.rocks.group.visible = this.tree.group.visible = this.rise.group.visible = this.sun.group.visible = true;
    this.rocks.place(X(xl), z, base, Y(at(xl)) - 0.02, { flip: dir });
    this.tree.place(X(xl) - dir * 0.1, base, z - 0.3, 0.95);
    this.rise.place(X(xh) + dir * 0.12, z + BACK, base, Y(at(xh)) - 0.03, -dir);
    const xs = 2.9 * dir;
    this.sun.place(X(xs), Y(Math.min(at(xs) + 1.3, y1 + 0.45)), z - 0.18);
    // young grass in the middle, plants around the rocks
    for (let i = 0; i < 8; i++) {
      const x = xl + dir * (0.9 + i * 0.42);
      list.push({ name: i % 3 ? 'grass' : 'grass_leafs', x: X(x), y: base, z: z + 0.12 - (i % 2) * 0.25, scale: 0.45 + (i % 3) * 0.08 });
    }
    list.push({ name: 'plant_bushSmall', x: X(xl + dir * 0.55), y: base, z: z + 0.22, scale: 0.6 });
    list.push({ name: 'grass_leafs', x: X(xl - dir * 0.15), y: base, z: z + 0.28, scale: 0.7 });
    this.meadow.set(list);
    this.signLow.place(X(clamp(xl + dir * 0.75, -2.75, 2.75)), base, z + FRONT);
    this.signHigh.place(X(clamp(xh - dir * 1.0, -2.75, 2.75)), base, z + FRONT);
  }

  resting(p) {
    if (p.m === 0) return { x: -1.6, y: p.b, pose: 'sitCalm', yaw: 15 };
    const xl = -2.7 * Math.sign(p.m);
    const [y0, y1] = this.ctx.window;
    // hugging her knees on the rocks at the low end
    return { x: xl, y: clamp(this.ctx.f(xl, p), y0, y1), pose: 'sitHug', yaw: 10 * Math.sign(p.m) };
  }
}

// ---------------------------------------------------------------- 4: the constant (photo 1)
class Scene4 extends Scene {
  constructor(ctx) {
    super(ctx);
    const s = SIGNS[4];
    this.tree = this.add(new KenneyTree('tree_oak', { blossoms: 12, seed: 41 }));
    this.props = this.add(new PropSet(['grass', 'grass_large', 'grass_leafs', 'flower_redA', 'flower_yellowA', 'flower_purpleA', 'fence_simple', 'stone_largeA', 'plant_bush'], 12));
    this.petals = this.add(new Petals({ count: 14, seed: 42 }), { tick: true });
    this.signLeft = this.add(new Sign({ text: s.left, theme: 'lilac', w: 0.4, h: 0.32, postHeight: 0.24 }));
    this.note = this.add(new Sign({ text: s.note, theme: 'pink', w: 0.36, h: 0.17, postHeight: 0, hanging: true }));
    this.placeMeadow();
  }

  /** The calm meadow: grass and scattered flowers, the fence, the rock (all on the plinth top). */
  placeMeadow() {
    const { X, base, z } = this.ctx;
    const list = [];
    const flowers = ['flower_redA', 'flower_yellowA', 'flower_purpleA'];
    for (let i = 0; i < 12; i++) {
      const x = -2.5 + (i / 11) * 5.0;
      if (Math.abs(x + 1.8) < 0.35) continue; // keep the rock clear
      list.push({ name: flowers[i % 3], x: X(x), y: base, z: z + 0.2 - (i % 3) * 0.17, scale: 0.55 + (i % 2) * 0.12, rotY: i });
      list.push({ name: ['grass', 'grass_large', 'grass_leafs'][i % 3], x: X(x + 0.17), y: base, z: z - 0.05 + (i % 2) * 0.2, scale: 0.5, rotY: i * 2 });
    }
    list.push({ name: 'fence_simple', x: X(2.6), y: base, z: z + 0.05, scale: 0.55 });
    list.push({ name: 'plant_bush', x: X(2.85), y: base, z: z - 0.18, scale: 0.7 });
    list.push({ name: 'plant_bush', x: X(2.3), y: base, z: z - 0.25, scale: 0.6 });
    list.push({ name: 'stone_largeA', x: X(-1.8), y: base, z: z + 0.12, scale: 0.35, rotY: 0.6 });
    this.props.set(list);
  }

  update(p) {
    const { X, Y, base, z, window: [y0] } = this.ctx;
    const lineY = Y(p.c);
    // the tree's crown reaches the line height c
    this.tree.place(X(-2.6), base, z - 0.15, Math.max(0.3, lineY - base + 0.06));
    this.signLeft.place(X(-2.72), base, z + FRONT + 0.03);
    // the note card hangs just below the line (above it when the line is close to the plinth)
    const cardH = 0.17;
    const below = lineY - base > cardH + 0.12;
    this.note.place(X(1.5), below ? lineY - 0.05 - cardH : lineY + 0.08, z + 0.02, { stringLength: below ? 0.05 : 0 });
    this.petals.area(X(-2.4), X(1.2), base + 0.1, Math.max(lineY, base + 0.4) + 0.05, z + 0.05);
    void y0;
  }

  resting() {
    // sitting calmly on the rock, looking at the sunset
    return { x: -1.8, localY: this.ctx.base + 0.09, pose: 'sitCalm', yaw: -25, z: 0.12 };
  }
}

const SCENES = { 3: Scene3, 4: Scene4, 9: Scene9 };

/** The scene for station n (or null while it isn't built yet: N.4). */
export function createScene(n, ctx) {
  const S = SCENES[n];
  return S ? new S(ctx) : null;
}

/** Emotion tint strength for the station's ribbon (§5: station 9 uses a stronger tint). */
export const RIBBON_TINT = { 9: 0.85 };
