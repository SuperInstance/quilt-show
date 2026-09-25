// sim.mjs — E4 instruments logic, shared by the page and smoke.mjs.
// Every instrument the episode demonstrates is built HERE from the
// vendored engines; index.html only draws what this file proves.
import { Multigrid } from './engine/multigrid.mjs';
import { twistFieldFrom } from './engine/twistfield.mjs';
import { makeRat, ratToString, ratToNumber } from './engine/commensurate.mjs';

// ── The floor + twist instrument ─────────────────────────────────────
export function buildFloor(gamma = [0.1, 0.7, 0.3, 0.9, 0.4], radius = 5.5) {
  // radius 5.5 measured: 731 points, magic windows at 5.00° (p=0.019) and
  // 7.75° (p=0.006). Below r≈3.4 the floor is commensuration-silent in 0–12°
  // (measured across r ∈ {0.7, 1.3, 2.1, 3.4, 5.5}) — the comb wakes with the seat.
  const mg = new Multigrid({ N: gamma.length, gamma, reach: 8 });
  const tf = twistFieldFrom(mg, radius);
  return { mg, tf };
}

export function twistCurve(tf, from = 0, to = 4, step = 0.1) {
  return tf.curve(from, to, step).map(({ theta, R }) => ({ theta, R, S: 1 - R }));
}

export function magicWindows(curve, prominence = 0.006) {
  const out = [];
  for (let i = 2; i < curve.length - 2; i++) {
    const p = curve[i];
    if (p.S >= curve[i - 1].S || p.S >= curve[i + 1].S) continue; // local min of S
    const left = Math.max(...curve.slice(Math.max(0, i - 25), i).map(q => q.S));
    const right = Math.max(...curve.slice(i + 1, i + 26).map(q => q.S));
    const prom = Math.min(left, right) - p.S;
    if (prom >= prominence) out.push({ theta: p.theta, S: p.S, prominence: prom });
  }
  return out;
}

// ── Commensuration readout (exact rationals) ─────────────────────────
export function commensurateReadout() {
  const PHI = (1 + Math.sqrt(5)) / 2;
  const target = Math.PI / (2 * PHI);
  // Stern–Brocot walk to the simplest rational within 1e-3 of π/(2φ)
  let lo = makeRat(0, 1), hi = makeRat(1, 1);
  for (let i = 0; i < 40; i++) {
    const mid = makeRat(lo.num + hi.num, lo.den + hi.den);
    if (ratToNumber(mid) < target) lo = mid; else hi = mid;
  }
  return {
    target,
    rational: ratToString(lo),
    rationalValue: ratToNumber(lo),
    error: Math.abs(ratToNumber(lo) - target),
    cents: 1200 * Math.log2(ratToNumber(lo) / target),
  };
}

// ── Demo kernel: a living cell graph for the render model ────────────
export function makeDemoKernel() {
  const cells = new Map();
  const links = new Map();
  const subs = new Set();
  let ts = 0;
  const emit = (ev) => { ts++; for (const fn of subs) fn({ ...ev, ts }); };

  return {
    bind(name, value) { cells.set(name, value); emit({ kind: 'bind', cell: name, value }); },
    set(name, value) { cells.set(name, value); emit({ kind: 'effect', cell: name, value }); },
    unbind(name) { if (cells.delete(name)) emit({ kind: 'unbind', cell: name }); },
    link(from, to, type = 'flow') {
      const id = `${from}->${to}:${type}`;
      links.set(id, { id, from, to, type });
      emit({ kind: 'link', id, from, to, type });
    },
    cells: () => [...cells.keys()],
    view: (n) => cells.get(n),
    links: () => [...links.values()],
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

export function seedDemoKernel(k, n = 7) {
  k.bind('floor.seed', 137);
  for (let i = 0; i < n; i++) k.bind(`cell.${i}`, i * 0.37);
  for (let i = 0; i < n - 1; i++) k.link(`cell.${i}`, `cell.${i + 1}`);
  k.link('floor.seed', 'cell.0', 'seed');
  return k;
}

// ── Smoke checks (node + page both honest about the same numbers) ────
export function verify() {
  const { tf } = buildFloor();
  const curve = twistCurve(tf, 0, 12, 0.05);
  const windows = magicWindows(curve);
  const comm = commensurateReadout();
  return [
    ['floor has points', tf.points.length > 500],
    ['twist law σ = 0.24·s', Math.abs(tf.sigma - 0.24 * tf.s) < 1e-9],
    ['twist law grid = 0.6·s', Math.abs(tf.grid - 0.6 * tf.s) < 1e-9],
    ['curve sweeps 0–12°', curve.length === 241 && curve[0].theta === 0 && curve.at(-1).theta > 11.9],
    ['S = 1 − R everywhere', curve.every(({ R, S }) => Math.abs(S - (1 - R)) < 1e-12)],
    ['magic windows exist at r=5.5 (prominence ≥ 0.006)', windows.length >= 1],
    ['π/(2φ) ≈ 133/137 within one cent', comm.rational === '133/137' && Math.abs(comm.cents) < 1],
    ['demo kernel binds + reads', (() => {
      const k = seedDemoKernel(makeDemoKernel(), 5);
      return k.cells().length === 6 && k.view('cell.3') === 3 * 0.37;
    })()],
  ];
}
