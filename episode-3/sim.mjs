// sim.mjs — E3 "Inter-cellular-relational-calculus" logic, node-testable.
// The player (index.html) mirrors this logic inline so the episode runs from
// file://; smoke.mjs is the source of truth that keeps us honest.
//
// Canon claims (SuperInstance/quilt packages/core):
//  - listener fires with event payload {changed, prev, current}
//    (packages/core/src/cells/listener.ts — ctx.metadata = {changed, prev, current})
//  - honest prev: set() captures prev BEFORE the write and threads it through
//    propagate() (packages/core/src/engine.ts — `changedPrev`)
//  - formula cells are lazy promises, recomputed only when pulled/poked
//  - receipts: fnv1a hash chain, same discipline as E2 / the fleet WAL
//
// Why this episode exists — z-lab S2 (quilt-tools PR #3): driftwatch was
// measured against a live jev-1.13.0 oracle across 30 calls; the oracle
// credited the 0.80 static threshold on slow drift even where shape flagged
// 8 samples earlier (st02: shape@10 vs naive@18). "Shape beats threshold"
// is NOT prompt-visible — it must be demonstrated with receipts. This is
// that demonstration, on camera.

export const STREAM_A = [
  20.0, 19.7,                                 // t1–t2: a dip resets the rise
  20.3, 20.9, 21.5, 22.1, 22.7, 23.3, 23.9, 24.5, // t3–t10: +0.6/tick, sustained
  25.2, 26.0, 26.9, 27.9, 29.0, 30.3,         // t11–t16: crosses 30 at t16
];
export const STREAM_B = [
  31.1,                                       // t17: still above the band
  30.2, 29.4, 28.7, 27.9, 28.3, 29.1, 30.0,   // t18–t24: dips into the band
];
export const THRESHOLD_LEVEL = 30;            // static threshold (S3)
export const SHAPE_WINDOW = 9;                // samples held by the listener
export const SHAPE_MIN_SLOPE = 0.5;           // per-tick rise that counts
export const BAND = [26, 31];                 // the drag shapes this region (S5)

export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// Hash-chained receipt log. Every hop — a watcher firing, even the drag
// itself — becomes one line, hashed into the last. Rewindable, replayable.
export function makeLog() {
  let lastHash = 'genesis';
  const receipts = [];
  return {
    get receipts() { return receipts; },
    get lastHash() { return lastHash; },
    write(r) {
      const line = `t${r.tick} ${r.who} ${r.what} · prev ${r.prev} → cur ${r.current}`;
      lastHash = fnv1a(lastHash + line);
      const rec = { tick: r.tick, who: r.who, what: r.what, prev: r.prev, current: r.current, line, hash: lastHash, defChange: !!r.defChange };
      receipts.push(rec);
      return rec;
    },
    // Recompute the chain from genesis — catches any tampering or NaN leak.
    chainOk() {
      let h = 'genesis';
      for (const r of receipts) { h = fnv1a(h + r.line); if (h !== r.hash) return false; }
      return true;
    },
  };
}

export function createDemo(log) {
  const threshold = { kind: 'formula', mode: 'level', level: THRESHOLD_LEVEL };
  const shape = { kind: 'listener', watch: 'stream', window: [], fired: false };
  const state = { threshold, shape };

  function thresholdEvent(value, prev) {
    if (threshold.mode === 'level') {
      return value > threshold.level && !(prev > threshold.level)
        ? `CROSS >${threshold.level}` : null;
    }
    const lo = threshold.low, hi = threshold.high;
    const inNow = value >= lo && value <= hi, inPrev = prev >= lo && prev <= hi;
    if (inNow && !inPrev) return `ENTER band [${lo},${hi}]`;
    if (!inNow && inPrev) return `EXIT band [${lo},${hi}]`;
    return null;
  }

  return {
    state,
    // One tick of the stream. value = stream's new value; prev = the value
    // it replaced (honest prev — captured before the write, per engine.set).
    step(tick, value, prev) {
      const fired = [];
      const t = thresholdEvent(value, prev);
      if (t) { log.write({ tick, who: 'threshold', what: t, prev, current: value }); fired.push('threshold'); }
      shape.window.push(value);
      if (shape.window.length > SHAPE_WINDOW) shape.window.shift();
      if (!shape.fired && shape.window.length === SHAPE_WINDOW) {
        const w = shape.window;
        let ok = true;
        for (let i = 1; i < w.length; i++) if (w[i] - w[i-1] < SHAPE_MIN_SLOPE) { ok = false; break; }
        if (ok) {
          shape.fired = true;
          const rise = (w[w.length-1] - w[0]) / (w.length - 1);
          log.write({ tick, who: 'shape', what: `SLOPE +${rise.toFixed(1)}/tick ×${SHAPE_WINDOW-1} sustained`, prev, current: value });
          fired.push('shape');
        }
      }
      return fired;
    },
    // S5 payoff: the viewer drags the waveform — the threshold cell stops
    // being a static level and becomes a formula shaped by the drag.
    // Even the reshaping is receipted.
    reshape(low, high, tick) {
      threshold.mode = 'band'; threshold.low = low; threshold.high = high;
      delete threshold.level;
      log.write({ tick, who: 'threshold', what: `RESHAPED level→band [${low},${high}] (drag)`, prev: NaN, current: NaN, defChange: true });
    },
  };
}

// Full episode run: drift (STREAM_A) → static cross → drag-reshape → band (STREAM_B).
export function runDemo() {
  const log = makeLog();
  const demo = createDemo(log);
  let prev = STREAM_A[0];
  demo.step(1, STREAM_A[0], prev);
  for (let t = 2; t <= STREAM_A.length; t++) { demo.step(t, STREAM_A[t-1], prev); prev = STREAM_A[t-1]; }
  demo.reshape(BAND[0], BAND[1], STREAM_A.length); // the drag happens at t16
  for (let t = 1; t <= STREAM_B.length; t++) {
    const v = STREAM_B[t-1];
    demo.step(STREAM_A.length + t, v, prev); prev = v;
  }
  return { receipts: log.receipts, chainOk: log.chainOk(), lastHash: log.lastHash };
}

// Smoke checks — E2's smoke caught a NaN receipt; this one hunts the same.
export function verify(result) {
  const rs = result.receipts;
  const shape = rs.find(r => r.who === 'shape');
  const cross = rs.find(r => r.who === 'threshold' && r.what.startsWith('CROSS'));
  const enter = rs.find(r => r.what.startsWith('ENTER'));
  const reshape = rs.find(r => r.what.startsWith('RESHAPED'));
  return [
    ['shape fires once, at tick 10', !!shape && shape.tick === 10 && rs.filter(r => r.who === 'shape').length === 1],
    ['static threshold fires once, at tick 16', !!cross && cross.tick === 16 && rs.filter(r => r.who === 'threshold' && r.what.startsWith('CROSS')).length === 1],
    ['early flag (shape@10) < late flag (threshold@16)', !!shape && !!cross && shape.tick < cross.tick],
    ['in-scene delta is 6 ticks; S2 measured 8 live (st02 shape@10 vs naive@18)', !!shape && !!cross && cross.tick - shape.tick === 6],
    ['drag receipted as def-change', !!reshape],
    ['band ENTER receipted at tick 18', !!enter && enter.tick === 18],
    ['no NaN prev/current on data receipts', rs.filter(r => !r.defChange).every(r => Number.isFinite(r.prev) && Number.isFinite(r.current))],
    ['hash chain unbroken (fnv1a, genesis-sealed)', result.chainOk === true],
    ['receipts exist at all', rs.length >= 5],
  ];
}
