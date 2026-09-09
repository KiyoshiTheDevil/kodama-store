# Widget designs

Overlay designs built in Kodama's Overlay Editor, published so someone can load one instead of
drawing it themselves.

Reserved. `index.json` already carries this list, so adding support is a change in the app alone.
Until a Kodama release can install one, a `.json` file here would be published to nobody, and the
index generator treats it as an error rather than ignoring it quietly.

A design is the editor's own document: `{ "version": 2, "canvas": {...}, "layers": [...] }`, the
same shape the editor saves. `version` is the document format, not the design's own version.
