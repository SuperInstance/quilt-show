#!/usr/bin/env bash
# genmedia.sh — regenerate episode-1 media via Cloudflare Workers AI.
# Verified shapes 2026-09-25 (account 049ff5e84ecf636b53b162cbb580aae6):
#   TTS:   POST /accounts/<id>/ai/run/@cf/deepgram/aura-1  {text:<s>} → MP3
#   Image: POST /accounts/<id>/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0 {prompt:<s>} → PNG
# Idempotent: skips files that exist. Requires CF_API_TOKEN in env.
set -euo pipefail
A="${CF_ACCOUNT_ID:-049ff5e84ecf636b53b162cbb580aae6}"
BASE="https://api.cloudflare.com/client/v4/accounts/$A/ai/run"
H="Authorization: Bearer $CF_API_TOKEN"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p voice assets
if [ ! -s voice/s1.mp3 ]; then
  for n in 1 2 3 4 5 6; do
    line=$(awk -v RS= "/^S$n /{print substr(\$0, index(\$0,\")\")+1)}" script.md 2>/dev/null || true)
    [ -z "$line" ] && line=$(sed -n "/^S$n /,/^$/p" script.md | tail -n +2 | tr '\n' ' ')
    printf '== voice/s%s: %s\n' "$n" "${line:0:60}"
    jq -n --arg t "$line" '{text:$t}' | curl -sf -m 90 -X POST -H "$H" -H 'Content-Type: application/json' -d @- "$BASE/@cf/deepgram/aura-1" -o "voice/s$n.mp3"
  done
fi
if [ ! -s assets/narrator.png ]; then
  jq -n --arg p "a small cheerful hermit crab with three claws sitting at a single glowing spreadsheet cell on the dark abyssal seafloor, deep-sea teal and warm amber bioluminescence, flat editorial illustration, Dieter Rams meets Moebius, no gradients, no text" '{prompt:$p}' \
  | curl -sf -m 180 -X POST -H "$H" -H 'Content-Type: application/json' -d @- "$BASE/@cf/stabilityai/stable-diffusion-xl-base-1.0" -o assets/narrator.png
fi
echo "media done: $(ls voice assets)"
