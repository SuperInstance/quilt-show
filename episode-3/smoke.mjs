// smoke.mjs — E3 smoke test. Run BEFORE the player, per the constitution:
// verify the logic in node first (E2's smoke caught a NaN receipt).
// Usage: node smoke.mjs   (exit 0 = all green)
import { runDemo, verify } from './sim.mjs';

const result = runDemo();
console.log('— receipts —');
for (const r of result.receipts) console.log(`⟨${r.hash}⟩ ${r.line}`);
console.log(`chain: genesis → ⟨${result.lastHash}⟩  (${result.receipts.length} receipts)`);

const checks = verify(result);
console.log('— checks —');
let fail = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) fail++; }
console.log(fail === 0 ? `SMOKE OK — ${checks.length}/${checks.length}` : `SMOKE FAILED — ${fail}/${checks.length}`);
process.exit(fail === 0 ? 0 : 1);
