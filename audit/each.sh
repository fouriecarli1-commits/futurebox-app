#!/bin/sh
# One browser per room. Pressing things in one room can leave the app in a
# state the next room cannot be reached from — a picker open over the rail, a
# recorder holding the page — and that is a fact about the harness rather than
# about the app, so each room gets a clean start.
for room in "The Booth" "Your voice" "Soundboard" "Music video" "Video desk" "Hooks" "Channel" "Live" "Podcast" "Adverts" "Collab Radar"; do
  node audit/buttons.mjs "$room" 2>&1 | tr -d '\000-\010\013\014\016-\037'
done
