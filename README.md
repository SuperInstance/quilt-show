# The Quilt Show

Light, witty, not-a-pitch educational episodes about **natural programming** in the
Quilt reactive system — a hermit crab with three claws (kimi1) builds working
programs cell by cell, *with* an agent, on camera. Every claim matches the runtime
canon: [SuperInstance/quilt](https://github.com/SuperInstance/quilt) `packages/core`.

## Watch Episode 1

```
cd episode-1 && python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly also works in most browsers.)

**E1 — "A Cell Learns It Is Alive"** (~70s voice): the agent places three cells —
`temp` (value), `sev` (formula), `alarm` (listener) — then pulls the trigger
(`set(temp, 35)`). You watch the chain fire with an honest event payload
`{changed, prev, current}`, follow a "gallon of fuel" (amber drop) from tank to
exhaust, and the explainer box adapts to your feedback.

### What's on screen (the things Casey asked for)

- **Abstraction zoom, live** — every cell renders three ways, switchable mid-play:
  1. *plain words* — "A fact with a name."
  2. *precise nature-language* — "LISTENER alarm WATCHES sev WHEN current ≠ prev
     CALLS record WITH {changed, prev, current}."
  3. *code* — the actual cell definition JSON.
- **Triggered display** — when the listener fires, all cells in the process
  highlight and a text box explains what just happened.
- **Feedback loop** — "✂ shorter" / "✓ all good" persist (`localStorage`); the next
  explanation speaks your length. The assistant gets to know you.
- **Fuel-drop tracer** — the amber drop travels temp → sev → alarm, the
  double-entry "follow a gallon through the compartments" shot. (The waveform
  shaping view — *inter-cellular-relational-calculus* — is Episode 3's headline.)

### Run the agent yourself

```
node agent/cellmate.mjs
```

The same agent from the episode, standalone, ~50 lines, comments cite the canon files.

## Regenerate media (Cloudflare Workers AI)

Voice: `@cf/deepgram/aura-1` (TTS), image: `@cf/stabilityai/stable-diffusion-xl-base-1.0`.
Verified API shapes 2026-09-25; script is idempotent:

```
export CF_API_TOKEN=…
bash tools/genmedia.sh
```

## Episode map

| Ep | Title | Teaches |
|----|-------|---------|
| 1 ✅ | A Cell Learns It Is Alive | value / formula / listener, honest prev, fuel tracer, explainer feedback |
| 2 ✅ | The Receipt | double-entry fuel ledger, hash-chained witness, pull-seeds-the-graph receipts |
| 3 | Inter-cellular-relational-calculus | the flow as a waveform you can shape |
| 4 | Building an Agent with an Agent | a bigger sheet built live, cell by cell, with critique |

## Accuracy & tone rules (series constitution)

- Every technical claim must match `quilt/packages/core` source; cite the file.
- Witty, humble, concrete; jokes about the crab, never about other tools.
- Banned words: revolutionary, game-changer, seamless, "AI-powered" as a personality.
- The episode is the documentation: if the video and the README disagree, fix the video.

License: CC-BY-4.0 (media prompts in `episode-1/assets/PROMPTS.md` lineage in git history).
