#!/bin/sh
for room in "Make a song" "Studio" "The Booth" "Your voice" "Soundboard" "Music video" "Video desk" "Hooks" "Channel" "Live" "Podcast" "Adverts" "Collab Radar"; do
  timeout 300 node audit/deep.mjs "$room" 2>&1 | tr -d '\000-\010\013\014\016-\037'
  echo ""
done
