# Equalizer presets

Live. Installable from Kodama 1.0.0-alpha.38.

Ten bands, at 32, 64, 125, 250, 500, 1000, 2000, 4000, 8000 and 16000 Hz, plus a preamp. Every
value is decibels and is clamped to the range the sliders travel, which is plus or minus 12.

    {
      "id": "speech",
      "title": "Speech",
      "description": "One line about what it is for.",
      "version": "1.0.0",
      "tags": ["voice"],
      "config": { "preamp": -1, "gains": [-6, -5, -3, 0, 2, 3, 3, 2, 0, -1] }
    }

`gains` must have all ten values in that order. A short list is filled with zeroes rather than
rejected, which is quieter than it sounds: write all ten.

Lifting several bands at once makes the whole thing louder, so a preset that boosts should lower
the preamp to compensate. The built-in presets use roughly minus one decibel of preamp per two
decibels of boost.

Raise `version` when you change a published preset and the app offers an update to anyone who has
the older one.
