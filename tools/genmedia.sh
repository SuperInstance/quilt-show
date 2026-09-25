#!/usr/bin/env bash
# genmedia.sh — regenerate episode media via Cloudflare Workers AI.
# Verified shapes 2026-09-25 (account 049ff5e84ecf636b53b162cbb580aae6):
#   TTS:   POST /accounts/<id>/ai/run/@cf/deepgram/aura-1  {text:<s>} → MP3
#   Image: POST /accounts/<id>/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0 {prompt:<s>} → PNG
# Idempotent: skips files that exist. Requires CF_API_TOKEN in env.
# Usage: bash tools/genmedia.sh [episode-N]   (default: episode-1)
set -euo pipefail
A="${CF_ACCOUNT_ID:-049ff5e84ecf636b53b162cbb580aae6}"
BASE="https://api.cloudflare.com/client/v4/accounts/$A/ai/run"
H="Authorization: Bearer $CF_API_TOKEN"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EP="${1:-episode-1}"
cd "$ROOT/$EP"

mkdir -p voice assets
nums=$(grep -oE '^S[0-9]+' script.md | tr -d 'S' | sort -n | uniq)
for n in $nums; do
  if [ ! -s "voice/s$n.mp3" ]; then
    line=$(awk -v RS= -v n="$n" '$0 ~ "^S" n " "' script.md | tail -n +2 | tr '\n' ' ')
    printf '== %s voice/s%s: %s\n' "$EP" "$n" "${line:0:60}"
    jq -n --arg t "$line" '{text:$t}' | curl -sf -m 90 -X POST -H "$H" -H 'Content-Type: application/json' -d @- "$BASE/@cf/deepgram/aura-1" -o "voice/s$n.mp3"
  fi
done
if [ ! -s assets/narrator.png ]; then
  if [ -f ../episode-1/assets/narrator.png ]; then
    cp ../episode-1/assets/narrator.png assets/narrator.png   # series narrator, reuse
  else
    jq -n --arg p "a small cheerful hermit crab with three claws sitting at a single glowing spreadsheet cell on the dark abyssal seafloor, deep-sea teal and warm amber bioluminescence, flat editorial illustration, Dieter Rams meets Moebius, no gradients, no text" '{prompt:$p}' \
    | curl -sf -m 180 -X POST -H "$H" -H 'Content-Type: application/json' -d @- "$BASE/@cf/stabilityai/stable-diffusion-xl-base-1.0" -o assets/narrator.png
  fi
fi
echo "media done: $(ls voice assets)"
