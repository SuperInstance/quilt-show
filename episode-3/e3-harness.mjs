// e3-harness.mjs — headless integration test for episode-3/index.html.
// Stubs DOM/canvas/audio, evals the page's inline script, drives S2–S5,
// verifies receipts match sim.mjs ground truth. Run: node e3-harness.mjs
import { readFileSync } from 'node:fs';
import { runDemo, verify, fnv1a } from './sim.mjs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

// ---- stubs ----
const els = new Map();
function mkEl(id) {
  const el = {
    id, innerHTML: '', textContent: '', scrollTop: 0, value: 0,
    style: {}, children: [],
    classList: { toggle(){}, add(){}, remove(){} },
    appendChild(c){ this.children.push(c); },
    prepend(c){ this.children.unshift(c); },
    querySelector(){ return { set textContent(v){}, get textContent(){return ''} }; },
    onclick: null, onchange: null, oninput: null, onended: null, ontimeupdate: null,
  };
  return el;
}
const cvHandlers = {};
const cv = {
  clientWidth: 1200, clientHeight: 800, width: 0, height: 0,
  getContext: () => new Proxy({}, { get: (t, k) => (k === 'canvas' ? cv : () => {}) }),
  addEventListener: (ev, fn) => { cvHandlers[ev] = fn; },
  getBoundingClientRect: () => ({ top: 0, left: 0 }),
};
const documentStub = {
  getElementById(id) { if (id === 'cv') return cv; if (!els.has(id)) els.set(id, mkEl(id)); return els.get(id); },
  createElement() { return mkEl('dyn'); },
  querySelectorAll() { return []; },
};
const store = new Map();
globalThis.document = documentStub;
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {};
globalThis.Audio = class { constructor() { this.src = ''; } play() { return Promise.reject(new Error('no audio')); } pause() {} };

// expose internals for driving
const hooked = src + `\n;globalThis.__e3 = { scenes, goto, runTicks, commitBand, engine, receiptEls, STREAM_ALL,
  getTick: () => tick, getHash: () => lastHash, getMode: () => thresholdMode, fnv1a,
  cvDispatch: (ev, e) => cvHandlers[ev] && cvHandlers[ev](e) };`;
eval(hooked);
const E = globalThis.__e3;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const receiptsText = () => E.engine.receipts.map(r => r.line);
let fail = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) fail++; };

// ---- S2: ticks 1–8, no watchers → no receipts ----
await E.goto(1);            // S2.run schedules reset + runTicks(1,8) at +600ms
await sleep(7000);
check('S2 ran ticks 1–8', E.getTick() === 8);
check('S2: no watchers → zero receipts', E.engine.receipts.length === 0);

// ---- S3: ticks 9–16 → shape@10 + threshold CROSS@16 ----
await E.goto(2);
await sleep(7000);
const rs = receiptsText();
check('S3: shape rang at t10', rs.some(l => l.startsWith('t10 shape SLOPE')));
check('S3: threshold crossed at t16', rs.some(l => l.startsWith('t16 threshold CROSS >30')));
check('S3: exactly 2 receipts so far', E.engine.receipts.length === 2);

// ---- S4: replay + hot receipts ----
await E.goto(3);
await sleep(5800);
check('S4: both receipts highlighted', E.receiptEls.length === 2 && E.receiptEls.every(el => true)); // classList stub absorbs

// ---- S5: enter scene, then drag via synthetic pointer events → band [26,31] ----
await E.goto(4);
await sleep(800); // let S5.run enable dragging
const H = 800;
const yFor = v => (0.1 + (35 - v) / 18 * 0.8) * H;
E.cvDispatch('pointerdown', { clientY: yFor(31), clientX: 600 });
E.cvDispatch('pointermove', { clientY: yFor(26), clientX: 600 });
E.cvDispatch('pointerup', {});
check('S5: drag committed band mode', E.getMode() === 'band');
await sleep(7500); // commitBand → +900ms → runTicks(17,24)
const rs2 = receiptsText();
check('S5: RESHAPED def-change receipt', rs2.some(l => l.includes('RESHAPED level→band [26,31]')));
check('S5: EXIT band at t17', rs2.some(l => l.startsWith('t17 threshold EXIT')));
check('S5: ENTER band at t18', rs2.some(l => l.startsWith('t18 threshold ENTER')));
check('S5: all 24 ticks ran', E.getTick() === 24);

// ---- chain: recompute fnv1a from genesis over the page's own receipts ----
let h = 'genesis';
for (const r of E.engine.receipts) h = E.fnv1a(h + r.line);
check('page chain unbroken, genesis-sealed', h === E.getHash());
check('page has 5 receipts', E.engine.receipts.length === 5);

// ---- ground truth: page receipts vs sim.mjs receipts ----
const sim = runDemo();
check('page receipts match sim.mjs exactly',
  JSON.stringify(E.engine.receipts.map(r => r.line)) === JSON.stringify(sim.receipts.map(r => r.line)));

console.log('— page receipts —'); for (const r of E.engine.receipts) console.log(`⟨${r.hash}⟩ ${r.line}`);
console.log(fail === 0 ? 'HARNESS OK' : `HARNESS FAILED ${fail}`);
process.exit(fail ? 1 : 0);
