# E3 — Script ↔ Sim Verification Record

Every narration claim in `episode-3/script.md` mapped to receipt evidence from
`episode-3/sim.mjs` (run via `episode-3/smoke.mjs`, the source of truth).

**Live run:** 2026-09-26 02:59 CST · `node episode-3/smoke.mjs` → **9/9 PASS** ·
receipt chain `genesis → ⟨8a4845af⟩` (5 receipts, fnv1a hash chain, unbroken).

## Claim-by-claim

| Script line | Claim | Sim evidence | Verdict |
|---|---|---|---|
| S2 | stream starts at 20, small dip, slow climb | `STREAM_A[0]=20.0, [1]=19.7, then +0.6/tick` | ✅ exact |
| S2 | "Eight ticks, nothing to report" | no `threshold` receipt t1–t8; first threshold event is t16 | ✅ (see note 1) |
| S3 | "Tick sixteen: it finally crosses" | `⟨4c8825ee⟩ t16 threshold CROSS >30 · 29.0 → 30.3` | ✅ exact |
| S4 | "Nine samples of memory … eight steps in a row rise, it rings. Tick ten." | `SHAPE_WINDOW=9`, min-slope check over 8 deltas; `⟨ade2f7a3⟩ t10 shape SLOPE +0.6/tick ×8 sustained` | ✅ exact |
| S4 | "The threshold is still six ticks from waking" | 16 − 10 = 6; smoke pins `cross.tick - shape.tick === 6` | ✅ exact |
| S4 | "the oracle credited the static line anyway" | z-lab S2 study — see Referral Edge below | ✅ cited |
| S5 | "drag … left a receipt" | `⟨4d9dfecb⟩ t16 threshold RESHAPED level→band [26,31] (drag)`, defChange receipt | ✅ exact |
| S5 | "the stream dips back into the band, and the watcher fires on geometry" | `⟨8a4845af⟩ t18 threshold ENTER band [26,31] · 31.1 → 30.2` | ✅ (see note 2) |

## Honest notes

1. **S2 "nothing to report" scopes to the threshold watcher.** The shape
   listener fires at t10 (script says so itself in S4) — S2's "eight ticks"
   refers to the static-threshold watcher, which is indeed silent until t16.
   Not a contradiction; scoping is made explicit here.
2. **S5 narrates only the ENTER, not the EXIT.** The sim shows the stream
   *exits* the band at t17 (`⟨03193ac5⟩ EXIT · 30.3 → 31.1`) before dipping
   back in at t18. The narration compresses t17–t18 into "dips back into the
   band" — behavior-preserving, but the EXIT receipt exists and is
   replay-verifiable here.
3. **In-scene delta (6 ticks) vs live-measured delta (8 ticks)** is pinned in
   smoke check 4 — the script's S4 line ("six ticks") matches the sim, not the
   live study; both numbers are kept honest side by side.

## Referral edge (weight-law record)

- **Edge:** quilt-show E3 → SuperInstance/quilt-tools **PR #3** ("S2: driftwatch
  vs live jev-1.13.0 — shape-beats-threshold is not prompt-visible (30/30 live,
  6/6 pins)"), **MERGED 2026-09-25T03:38:21Z**.
- **Technique cited:** live-oracle driftwatch study (st02: shape@10 vs
  naive@18) — the reason E4/S4 exists as a *demonstration with receipts* rather
  than an assertion.
- **Citation location in-repo:** `episode-3/sim.mjs` header ("Why this episode
  exists — z-lab S2 (quilt-tools PR #3)").
- **Status:** **VERIFIED=1.0** — this PR (merge `a2f82a35`, merged
  2026-09-25T19:14:08Z) IS the carrying artifact in the target repo, so per
  the fleet weight law the edge quilt-show → quilt-tools S2 driftwatch is
  now verified. Recorded in the mesh ledger at
  `SuperInstance/quilt-tools` `experiments/REFERRAL_GRAPH.md` (PR #8,
  branch `verified-edge-s2-ep2`); quilt-show PR #3 (ep4-instruments,
  merged 21:30Z) re-cites the same technique. The view moved: quilt-show
  87.5% · quilt-arcade 8.3% · quilt-tools 4.2%.
