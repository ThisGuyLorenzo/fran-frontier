Fran & the Fernwood Frontier — Minimal Split

What changed
- The original single-file HTML was split into:
  - index.html (markup + script includes)
  - style.css (all styles)
  - src/*.js (the original JS split by the internal section headings)

How to run
Option A (simplest)
- Double-click index.html to open it in your browser.

Option B (recommended for reliable saving / localStorage)
- In this folder, run a tiny local server:
  - Python:  python -m http.server 8000
  - Then open: http://localhost:8000

Editing tips
- The JS files in /src are numbered in load order.
- When adding new features, start by locating the section you want:
  - 14_interactions.js for harvesting/interaction rules
  - 15_time_weather_day_advance.js for seasons/weather/day logic
  - 23_game_loop_update.js for per-frame updates
  - 25_render.js for drawing

Phase 2 additions in this build
- Cottage collision footprint is tighter so you can walk right up to the cottage and reach the door.
- Press E at the cottage door to fade into a one-room interior scene.
  - Interior includes: bed (Space to sleep), storage chest (E to open), and a workbench (E to craft).
  - Time continues to pass indoors; sleeping advances the day.
  - Cold does not build up indoors.
- Rain ambience: when weather is rainy, a gentle procedural rain sound plays (unlocks after your first keypress/click).
