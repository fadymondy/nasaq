/*
 * A small live force simulation for the graph view. Pure: no React, no DOM, no timers. The caller steps it
 * (one `tick()` per animation frame), so it can be tested under node and skipped entirely for reduced motion.
 */

export interface SimLink {
  source: string;
  target: string;
}
export interface SimPoint {
  x: number;
  y: number;
}

export interface SimInput {
  id: string;
  /** The node's size, used to keep nodes from overlapping. */
  r?: number;
}

export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Pinned position. While both are set the node stays there. */
  fx: number | null;
  fy: number | null;
}

export interface SimOptions {
  /** Rest length of a link. Default 90. */
  distance?: number;
  /** Repulsion between nodes. Default 260. */
  charge?: number;
  /** Pull towards the centre. Default 0.04. */
  gravity?: number;
  /** Share of the velocity lost each tick, 0 to 1. Default 0.4. */
  velocityDecay?: number;
  /** Alpha (the heat) under which the simulation counts as settled. Default 0.002. */
  alphaMin?: number;
  /** Ticks a fully hot simulation takes to cool to `alphaMin`. Default 300. */
  ticks?: number;
}

export interface Simulation {
  readonly nodes: SimNode[];
  readonly alpha: number;
  /** Cooled below `alphaMin` and nothing being dragged: there is nothing left to animate. */
  readonly settled: boolean;
  /** One step: forces, then velocity, then position. Returns false once settled (and does nothing). */
  tick(): boolean;
  /** Warm the simulation up again. Never cools it. Default 0.5, at most 1. */
  reheat(alpha?: number): void;
  /** Pin a node at a point. It stays there until unpinned. While it is being dragged, the simulation keeps running. */
  pin(id: string, x: number, y: number, dragging?: boolean): void;
  /** The drag ended: the node stays pinned, and the simulation may settle. */
  drop(): void;
  unpin(id: string): void;
  isPinned(id: string): boolean;
  /** Swap the data. Nodes that stay keep position, velocity and pin; new ones start next to a neighbour. Reheats. */
  update(nodes: SimInput[], links: SimLink[]): void;
  /** Put nodes at given points (skipping pinned ones) and stop the simulation, e.g. a precomputed layout. */
  place(points: Map<string, SimPoint>): void;
  /** Stop: the picture stays as it is. */
  cool(): void;
  positions(): Map<string, SimPoint>;
}

/** A small deterministic pseudo-random source, so the same graph always starts the same way. */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * Nodes repel each other, links pull their ends to a rest length, gravity keeps pieces together and a
 * collision pass keeps nodes apart. Movement is semi-implicit Euler (velocity first, then position) with
 * damping, and every force is scaled by `alpha`, which decays each tick until the picture is still.
 * Deterministic: start positions come from the node ids.
 */
export function createSimulation(inputs: SimInput[], links: SimLink[], options: SimOptions = {}): Simulation {
  const distance = options.distance ?? 90;
  const charge = options.charge ?? 260;
  const gravity = options.gravity ?? 0.04;
  const damping = 1 - (options.velocityDecay ?? 0.4);
  const alphaMin = options.alphaMin ?? 0.002;
  const alphaDecay = 1 - alphaMin ** (1 / (options.ticks ?? 300));
  let alpha = 1;
  let nodes: SimNode[] = [];
  let pairs: [number, number][] = [];
  let strength: number[] = [];
  // Where nodes that were filtered out last were, so they come back to the same spot.
  const memory = new Map<string, SimPoint>();

  const spawn = (id: string, count: number, near?: SimNode): SimPoint => {
    const rand = mulberry(hash(id));
    const angle = rand() * Math.PI * 2;
    if (near) return { x: near.x + Math.cos(angle) * distance * 0.6, y: near.y + Math.sin(angle) * distance * 0.6 };
    const r = distance * (0.4 + rand() * 0.6) * Math.sqrt(Math.max(1, count)) * 0.5;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  };

  const set = (next: SimInput[], nextLinks: SimLink[]) => {
    for (const n of nodes) memory.set(n.id, { x: n.x, y: n.y });
    const old = new Map(nodes.map((n) => [n.id, n]));
    const present = new Set(next.map((n) => n.id));
    const buddyOf = new Map<string, string>();
    for (const l of nextLinks) {
      if (l.source === l.target || !present.has(l.source) || !present.has(l.target)) continue;
      if (!buddyOf.has(l.source)) buddyOf.set(l.source, l.target);
      if (!buddyOf.has(l.target)) buddyOf.set(l.target, l.source);
    }
    const built: SimNode[] = [];
    const byId = new Map<string, SimNode>();
    for (const input of next) {
      const prev = old.get(input.id);
      if (prev) {
        prev.r = input.r ?? prev.r;
        built.push(prev);
        byId.set(prev.id, prev);
        continue;
      }
      const remembered = memory.get(input.id);
      const buddy = buddyOf.get(input.id);
      const anchor = buddy ? (byId.get(buddy) ?? old.get(buddy)) : undefined;
      const at = remembered ?? spawn(input.id, next.length, anchor);
      const made: SimNode = { id: input.id, x: at.x, y: at.y, vx: 0, vy: 0, r: input.r ?? 8, fx: null, fy: null };
      built.push(made);
      byId.set(made.id, made);
    }
    nodes = built;
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const degree = new Array<number>(nodes.length).fill(0);
    pairs = [];
    for (const l of nextLinks) {
      const a = index.get(l.source);
      const b = index.get(l.target);
      if (a === undefined || b === undefined || a === b) continue;
      pairs.push([a, b]);
      degree[a] = (degree[a] as number) + 1;
      degree[b] = (degree[b] as number) + 1;
    }
    strength = pairs.map(([a, b]) => 1 / Math.min(degree[a] as number, degree[b] as number));
  };
  set(inputs, links);

  let dragged: string | null = null;
  const held = () => dragged !== null;

  return {
    get nodes() {
      return nodes;
    },
    get alpha() {
      return alpha;
    },
    get settled() {
      return alpha < alphaMin && !held();
    },
    tick() {
      if (alpha < alphaMin && !held()) return false;
      const n = nodes.length;
      // While a node is being dragged, keep a little heat so the rest keeps following it.
      alpha = Math.max(alpha - alpha * alphaDecay, held() ? 0.05 : alphaMin * 0.5);
      const a = alpha;
      for (const p of nodes) {
        p.vx -= p.x * gravity * a;
        p.vy -= p.y * gravity * a;
      }
      for (let i = 0; i < n; i++) {
        const p = nodes[i] as SimNode;
        for (let j = i + 1; j < n; j++) {
          const q = nodes[j] as SimNode;
          let dx = q.x - p.x;
          let dy = q.y - p.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            // On top of each other: split them along a direction taken from their indexes.
            dx = ((i * 7 + j) % 5) - 2 + 0.5;
            dy = ((i * 3 + j) % 5) - 2 + 0.5;
            d2 = dx * dx + dy * dy;
          }
          const d = Math.sqrt(d2);
          if (d < 480) {
            const f = (charge * a) / Math.max(d, 24);
            p.vx -= (dx / d) * f;
            p.vy -= (dy / d) * f;
            q.vx += (dx / d) * f;
            q.vy += (dy / d) * f;
          }
          const min = p.r + q.r + 10;
          if (d < min) {
            const push = ((min - d) / d) * 0.5;
            p.vx -= dx * push;
            p.vy -= dy * push;
            q.vx += dx * push;
            q.vy += dy * push;
          }
        }
      }
      for (let k = 0; k < pairs.length; k++) {
        const [ai, bi] = pairs[k] as [number, number];
        const p = nodes[ai] as SimNode;
        const q = nodes[bi] as SimNode;
        const dx = q.x + q.vx - (p.x + p.vx);
        const dy = q.y + q.vy - (p.y + p.vy);
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = ((d - distance) / d) * a * (strength[k] as number) * 1.0;
        p.vx += dx * f * 0.5;
        p.vy += dy * f * 0.5;
        q.vx -= dx * f * 0.5;
        q.vy -= dy * f * 0.5;
      }
      for (const p of nodes) {
        if (p.fx !== null && p.fy !== null) {
          p.x = p.fx;
          p.y = p.fy;
          p.vx = 0;
          p.vy = 0;
        } else {
          p.vx *= damping;
          p.vy *= damping;
          p.x += p.vx;
          p.y += p.vy;
        }
      }
      return true;
    },
    reheat(to = 0.5) {
      alpha = Math.max(alpha, Math.min(1, to));
    },
    pin(id, x, y, dragging = false) {
      const node = nodes.find((p) => p.id === id);
      if (!node) return;
      node.fx = x;
      node.fy = y;
      node.x = x;
      node.y = y;
      if (dragging) dragged = id;
    },
    drop() {
      dragged = null;
    },
    unpin(id) {
      const node = nodes.find((p) => p.id === id);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      if (dragged === id) dragged = null;
    },
    isPinned(id) {
      return nodes.some((p) => p.id === id && p.fx !== null);
    },
    update(next, nextLinks) {
      set(next, nextLinks);
      alpha = Math.max(alpha, 0.6);
    },
    place(points) {
      for (const p of nodes) {
        const at = points.get(p.id);
        if (at && p.fx === null) {
          p.x = at.x;
          p.y = at.y;
          p.vx = 0;
          p.vy = 0;
        }
      }
      alpha = 0;
    },
    cool() {
      alpha = 0;
      for (const p of nodes) {
        p.vx = 0;
        p.vy = 0;
      }
    },
    positions() {
      return new Map(nodes.map((p) => [p.id, { x: p.x, y: p.y }]));
    },
  };
}

/** Runs a fresh simulation until it rests and returns where everything ended up. */
export function settle(inputs: SimInput[], links: SimLink[], options?: SimOptions, maxTicks = 1000): Map<string, SimPoint> {
  const sim = createSimulation(inputs, links, options);
  for (let i = 0; i < maxTicks && sim.tick(); i++);
  return sim.positions();
}
