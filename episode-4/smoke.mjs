// smoke.mjs — E4 smoke test. Run BEFORE the player, per the constitution:
// verify the instruments in node first; index.html only draws what this
// file proves. Usage: node smoke.mjs   (exit 0 = all green)
import { RenderModel } from './view/render-model.mjs';
import { buildFloor, twistCurve, magicWindows, commensurateReadout, makeDemoKernel, seedDemoKernel, verify } from './sim.mjs';

let fail = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) fail++; };

// sim.verify() covers floor/twist/commensurate/kernel
for (const [name, ok] of verify()) check(name, ok);

// ── Render model on the demo kernel ──────────────────────────────────
const k = seedDemoKernel(makeDemoKernel(), 5);
const m = new RenderModel(k);
const f1 = m.drain();
check('late-attach sees all cells', f1.added.length === 6);
check('late-attach sees links', f1.edgeAdded.length === 5);

k.set('cell.2', 99.5);
const f2 = m.drain();
check('tick produces a changed frame', f2.changed.length === 1 && f2.changed[0].name === 'cell.2');

k.unbind('cell.4');
const f3 = m.drain();
check('unbind produces a removed frame', f3.removed.length === 1);

check('empty drain is empty', (m.drain().added.length + m.drain().changed.length) === 0);

// determinism: same script, fresh kernel + model → same frames
const run = () => {
  const kk = seedDemoKernel(makeDemoKernel(), 5);
  const mm = new RenderModel(kk);
  const frames = [mm.drain()];
  kk.set('cell.0', -1); frames.push(mm.drain());
  return JSON.stringify(frames);
};
check('frames are deterministic', run() === run());

// ── The numbers the page prints ──────────────────────────────────────
const { tf } = buildFloor();
console.log('— instruments —');
console.log(`points ${tf.points.length} · s=${tf.s.toFixed(4)} · σ=${tf.sigma.toFixed(4)} · grid=${tf.grid.toFixed(4)}`);
const wins = magicWindows(twistCurve(tf, 0, 12, 0.05));
console.log(`magic windows: ${wins.map(w => `${w.theta.toFixed(2)}°`).join(', ')}`);
const comm = commensurateReadout();
console.log(`π/(2φ) = ${comm.target.toFixed(6)} ≈ ${comm.rational} (${comm.cents.toFixed(2)} cents)`);

console.log(fail === 0 ? `SMOKE OK — all green` : `SMOKE FAILED — ${fail} failing`);
process.exit(fail === 0 ? 0 : 1);
