#!/bin/sh
for tab in "Spotlight" "FutureBox Podcasts" "Masterclasses" "Creative AI Music & Video" "AI Trends Radar"; do
  timeout 280 node audit/home.mjs "$tab" 2>&1 | tr -d '\000-\010\013\014\016-\037'
done
