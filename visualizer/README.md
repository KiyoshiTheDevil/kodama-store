# Visualizer presets

Live. Installable from Kodama 1.0.0-alpha.38.

A preset lists only what it **changes**. Kodama merges it over its own defaults, so a preset that
sets a shape and a bar count is complete, not unfinished. Keys it does not name keep their default.

    {
      "id": "neon-pulse",
      "title": "Neon Pulse",
      "description": "One line about what it looks like.",
      "version": "1.0.0",
      "tags": ["linear", "loud"],
      "config": { "shape": "linear", "barCount": 40, "peakHold": true }
    }

Keys Kodama does not know are dropped at install time rather than stored, so a typo costs you the
setting and nothing else. The full list of keys is `src/visualizer/defaults.js` in the app.

Raise `version` when you change a published preset and the app offers an update to anyone who has
the older one.
