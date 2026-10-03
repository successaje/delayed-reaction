#!/usr/bin/env bash
# Builds the demo program from CC0 footage of the 2021 FIFA Beach Soccer World Cup final
# (Russian Football Union v Japan, Wikimedia Commons). Media is generated, not committed.
#
#   scripts/fetch-demo-media.sh [output-dir]     (default: apps/web/public/media)
#
# Requires curl and ffmpeg.
set -euo pipefail

OUT="${1:-apps/web/public/media}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
UA="DelayedReaction/0.1 (https://github.com/successaje/delayed-reaction)"
BASE="https://upload.wikimedia.org/wikipedia/commons"

# Chronological order within the match.
CLIPS=(
  "7/7e/2021-08-29_-_FIFA_Beach_Soccer_World_Cup_-_Match_32_-_Russian_Football_Union_v_Japan_-_Akaguma_scores_a_penalty_kick.ogv"
  "7/75/2021-08-29_-_FIFA_Beach_Soccer_World_Cup_-_Match_32_-_Russian_Football_Union_v_Japan_-_The_last_minute.ogv"
  "d/de/2021-08-29_-_FIFA_Beach_Soccer_World_Cup_-_Match_32_-_Russian_Football_Union_v_Japan_-_Team_RFU_celebrates.ogv"
  "e/e7/2021-08-29_-_FIFA_Beach_Soccer_World_Cup_-_Match_32_-_Russian_Football_Union_v_Japan_-_Team_RFU_wins_the_title.webm"
)

command -v ffmpeg >/dev/null || { echo "ffmpeg is required (brew install ffmpeg)"; exit 1; }
mkdir -p "$OUT"

i=0
for clip in "${CLIPS[@]}"; do
  i=$((i + 1))
  echo "Downloading clip $i/${#CLIPS[@]}"
  curl -fsSL -A "$UA" "$BASE/$clip" -o "$WORK/src$i"
  # Normalise every clip to the same 720p30 H.264/AAC format so they concatenate cleanly
  # and play on Fire TV's W3C media pipeline.
  ffmpeg -loglevel error -y -i "$WORK/src$i" \
    -f lavfi -t 1 -i anullsrc=r=48000:cl=stereo \
    -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p[v]" \
    -map "[v]" -map "0:a?" -c:v libx264 -preset slow -crf 24 -maxrate 3000k -bufsize 6000k -g 60 \
    -c:a aac -ar 48000 -ac 2 -shortest "$WORK/part$i.mp4"
  # Clips without an audio track get silence, so the concat has consistent streams.
  if ! ffprobe -loglevel error -select_streams a -show_entries stream=index -of csv=p=0 "$WORK/part$i.mp4" | grep -q .; then
    ffmpeg -loglevel error -y -i "$WORK/part$i.mp4" -f lavfi -i anullsrc=r=48000:cl=stereo \
      -c:v copy -c:a aac -shortest "$WORK/part$i.a.mp4" && mv "$WORK/part$i.a.mp4" "$WORK/part$i.mp4"
  fi
  echo "file '$WORK/part$i.mp4'" >> "$WORK/list.txt"
done

echo "Stitching"
ffmpeg -loglevel error -y -f concat -safe 0 -i "$WORK/list.txt" -c copy -movflags +faststart \
  "$OUT/beach-final-2021.mp4"
ffmpeg -loglevel error -y -ss 30 -i "$OUT/beach-final-2021.mp4" -frames:v 1 -q:v 3 \
  "$OUT/beach-final-2021.jpg"

DURATION_MS=$(ffprobe -loglevel error -show_entries format=duration -of csv=p=0 "$OUT/beach-final-2021.mp4" | awk '{printf "%d", $1 * 1000}')
echo "Wrote $OUT/beach-final-2021.mp4 (${DURATION_MS} ms) and poster"
