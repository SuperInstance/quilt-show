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

## Empirical update (2026-09-25, z-lab S3 — quilt-tools PR #4, commit 7c7a84a)

The sheet-level version of this contract now has **live receipts**: S3 ran a
quantum-tided budget against the real MothQuantum `coin-toss-v1` backend
(aer). The three states behaved exactly as sketched above, as *sheet cells*:

- **PENDING**: the appeal envelope opens with money unmoved; the cell refuses
  all reads of its outcome until the quantum job resolves (202→poll→result).
- **ENTANGLED**: the budget cell and the appeal cell are correlated by
  construction — one receipt names both when the appeal is granted.
- **COLLAPSED**: `heads` produced a *witnessed override* — the refusal was
  real, the override is real, and the receipt chain pins the sampled value so
  replay reproduces the observation, not the generator.
- **Hard debt refuses absolutely** — no appeal cell can be constructed; the
  contract is enforced by the sheet's shape, not by prompt discipline.

Notable discipline beat: the appeal-invariant was originally prose-only and a
pin caught it (10/11); fixed as a *sheet cell*, 11/11. The contract is
self-checking when the invariants are cells.

## What S3 proves and what it doesn't

Proven: the three-state contract is expressible and witnessable on today's
engine with zero engine changes — the enum stays classical while the *sheet*
carries the quantum semantics. Not yet proven: native PENDING reads (engine
blocking/sampling policy), correlated collapse across nodes, and the replay
guarantee under WAL truncation. Those three are the engine-level PR, ranked.

## The honest cost

Reads of PENDING cells need a policy (block / sample / raise) — that policy is
a product decision, not an engine decision. And every consumer that pattern-matches
on `'ready'` needs the three new arms. Estimate: the enum change is ten lines;
the discipline is a week of pins.
