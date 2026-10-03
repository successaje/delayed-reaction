#!/usr/bin/env bash
# Builds the landing page's demo clip: the CC0 penalty from the 2021 Beach Soccer World Cup
# final (Wikimedia Commons, Voltmetro). Small enough to commit (~1 MB, 640x360, no audio).
#
#   scripts/build-hero-clip.sh
set -euo pipefail

OUT="apps/web/public/demo"
SRC="https://upload.wikimedia.org/wikipedia/commons/7/7e/2021-08-29_-_FIFA_Beach_Soccer_World_Cup_-_Match_32_-_Russian_Football_Union_v_Japan_-_Akaguma_scores_a_penalty_kick.ogv"
UA="DelayedReaction/0.1 (https://github.com/successaje/delayed-reaction)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$OUT"
curl -fsSL -A "$UA" "$SRC" -o "$WORK/penalty.ogv"
ffmpeg -loglevel error -y -i "$WORK/penalty.ogv" -an \
  -vf "scale=640:360:force_original_aspect_ratio=increase,crop=640:360,fps=30,format=yuv420p" \
  -c:v libx264 -preset slow -crf 27 -movflags +faststart "$OUT/penalty.mp4"
ffmpeg -loglevel error -y -ss 1 -i "$OUT/penalty.mp4" -frames:v 1 -q:v 4 "$OUT/penalty.jpg"
ls -la "$OUT"
