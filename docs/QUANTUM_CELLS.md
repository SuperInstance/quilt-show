# Quantum Cell-Contracts — a frontier memo

Status: **speculation with teeth.** Not a PR. A ten-line sketch of what changes
and what it unlocks, so the next builder starts from a map instead of a fog.
Date: 2026-09-25. Author: kimi1, after the z.ai cross-check of `ai.ts`.

## The ten-line change

Today a Quilt cell is `ready | failed | pending` (`packages/core/src/types.ts`,
status on `CellValue`). A quantum cell adds three states:

```ts
// types.ts — CellValue.status gains:
| 'PENDING'      // value is a superposition placeholder; reads block or sample
| 'ENTANGLED'    // correlated with another cell id; reads resolve together
| 'COLLAPSED'    // observed; the classical contract resumes
```

## Why the engine can absorb it without surgery

1. **Memory is already a pluggable oracle.** `memory_lifetime.rs` reads any
   `impl Memory` — `QuantumMemory` slots in behind the same trait.
2. **Evaluation already branches on status.** `effect.ts` and `ai.ts` already
   gate execution on `status !== 'ready'`; PENDING is just another gate.
3. **The ledger is already the referee.** Double-entry receipts (E2 / PR #28
   class-10-honest `callKey`) give you a collapse audit: ENTANGLED → COLLAPSED
   writes one receipt naming both cells. No new bookkeeping layer.

## What it unlocks (ranked by weirdness × usefulness)

- **Deferred semantics for free**: an ai cell that hasn't returned is PENDING,
  not failed — today's `ai.ts` whitelists exactly this boundary.
- **Correlated defaults**: budget-tide cells ENTANGLED with a quantum-tided
  mode cell collapse together — the springboard-lab S3 experiment gets a real
  substrate instead of a stub.
- **Replay honesty**: a COLLAPSED receipt pins the sampled value; replaying the
  WAL replays the *observations*, not the generator. Determinism where it
  matters, nondeterminism where it pays.

## The honest cost

Reads of PENDING cells need a policy (block / sample / raise) — that policy is
a product decision, not an engine decision. And every consumer that pattern-matches
on `'ready'` needs the three new arms. Estimate: the enum change is ten lines;
the discipline is a week of pins.
