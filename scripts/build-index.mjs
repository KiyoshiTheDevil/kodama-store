// Writes index.json from the files in this repo.
//
// This repo is self-contained on purpose: nothing here reads Kodama's source, and Kodama reads
// nothing here except the finished index.json. Adding a theme is a file and a commit. No build of
// the app, no tag, no release.
//
//   node scripts/build-index.mjs
import { writeFileSync, readdirSync, readFileSync, existsSync } from "node:fs";

// The oldest Kodama that can install each kind of thing. An older build has no installer to
// receive it, and saying otherwise would offer it an Install button that does nothing.
const THEMES_SINCE = "1.0.0-alpha.38";
const PRESETS_SINCE = null;   // no release consumes published presets yet - see readReserved()
const WIDGETS_SINCE = null;   // same, for overlay designs

const ID_OK = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TOKEN_NAME_OK = /^--[a-z0-9-]+$/;
const TOKEN_VALUE_BAD = /[{};@]|url\s*\(|expression\s*\(/i;
const VERSION_OK = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

// ─── Reading a folder ────────────────────────────────────────────────────────

function readFolder(dir) {
  const url = new URL(`../${dir}/`, import.meta.url);
  if (!existsSync(url)) return [];
  return readdirSync(url).filter(f => f.endsWith(".json")).map(f => {
    const where = `${dir}/${f}`;
    let raw;
    try {
      raw = JSON.parse(readFileSync(new URL(f, url), "utf8"));
    } catch (e) {
      fail(where, `not valid JSON (${e.message})`);
      return null;
    }
    if (!ID_OK.test(raw.id || "")) fail(where, "id must be lowercase letters, digits and hyphens");
    else if (`${raw.id}.json` !== f) fail(where, `id "${raw.id}" does not match the filename`);
    if (!raw.title) fail(where, "no title");
    if (raw.version && !VERSION_OK.test(raw.version)) fail(where, `version "${raw.version}" is not 1.2.3 or 1.2.3-alpha.4`);
    if (raw.minVersion && !VERSION_OK.test(raw.minVersion)) fail(where, `minVersion "${raw.minVersion}" is not a version`);
    return { where, raw };
  }).filter(Boolean);
}

/** The fields every entry carries, whatever it is. */
function common(raw, since) {
  return {
    id: raw.id,
    title: raw.title || raw.id,
    description: raw.description || "",
    creators: Array.isArray(raw.creators) && raw.creators.length ? raw.creators : ["KiyoshiTheDevil"],
    version: raw.version || "1.0.0",
    minVersion: raw.minVersion || since,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}

// ─── Themes ──────────────────────────────────────────────────────────────────
//
// The same value check the app runs, but here it is a REJECTION rather than a quiet drop. The app
// drops a bad value because it must keep running with whatever it was handed; publishing has no
// such excuse, so a mistake stops the build while the author is still looking at it.

function readThemes() {
  return readFolder("themes").map(({ where, raw }) => {
    const tokens = raw.tokens || {};
    const names = Object.keys(tokens);
    if (!names.length) fail(where, "no tokens");
    for (const n of names) {
      const v = tokens[n];
      if (!TOKEN_NAME_OK.test(n)) fail(where, `"${n}" is not a --custom-property`);
      else if (typeof v !== "string") fail(where, `${n} is not a string`);
      else if (v.length > 200) fail(where, `${n} is longer than 200 characters`);
      else if (TOKEN_VALUE_BAD.test(v)) fail(where, `${n} contains { } ; @ url( or expression(`);
    }
    if (raw.mode !== "dark" && raw.mode !== "light") {
      fail(where, 'mode must be "dark" or "light" - it decides which half of HeroUI\'s own tokens applies');
    }
    return {
      ...common(raw, THEMES_SINCE),
      mode: raw.mode,
      // The swatches on the store card, so the list draws without fetching anything else. Taken
      // from the theme's own values, with Kodama's dark defaults standing in for whatever it
      // leaves to :root - which is exactly what the running app would show.
      preview: raw.preview || {
        bg:       tokens["--bg-base"]     || "#0d0d0d",
        surface:  tokens["--bg-surface"]  || "#141414",
        elevated: tokens["--bg-elevated"] || "#1c1c1c",
        text:     tokens["--t1"]          || "rgba(255,255,255,0.886)",
        accent:   tokens["--accent"]      || "#e040fb",
      },
      tokens,
    };
  });
}

// ─── Presets ─────────────────────────────────────────────────────────────────
//
// The folders exist and the index already has their arrays, so adding support later is a change in
// the app alone. Until a release can actually install one, a file here would be published to
// nobody - so it is an error rather than a silently ignored file.

function readReserved(dir, since, sinceName, payload) {
  const found = readFolder(dir);
  if (found.length && !since) {
    fail(dir, `no Kodama release installs these yet. Set ${sinceName} in scripts/build-index.mjs when one does.`);
    return [];
  }
  return found.map(({ raw }) => ({ ...common(raw, since), ...payload(raw) }));
}

// ─── Writing ─────────────────────────────────────────────────────────────────

const index = {
  schema: 1,
  generated: new Date().toISOString().slice(0, 10),
  themes: readThemes(),
  visualizer: readReserved("visualizer", PRESETS_SINCE, "PRESETS_SINCE", r => ({ config: r.config || {} })),
  equalizer: readReserved("equalizer", PRESETS_SINCE, "PRESETS_SINCE", r => ({ config: r.config || {} })),
  // An overlay design is the editor's own document, carried through as it stands.
  widgets: readReserved("widgets", WIDGETS_SINCE, "WIDGETS_SINCE", r => ({ doc: r.doc || {} })),
};

const seen = new Set();
for (const list of [index.themes, index.visualizer, index.equalizer, index.widgets]) {
  for (const e of list) {
    if (seen.has(e.id)) fail(e.id, "two entries share this id");
    seen.add(e.id);
  }
}

if (problems.length) {
  console.error(`index.json NOT written, ${problems.length} problem(s):\n` + problems.map(p => `  - ${p}`).join("\n"));
  process.exit(1);
}

writeFileSync(new URL("../index.json", import.meta.url), JSON.stringify(index, null, 2) + "\n", "utf8");
console.log(`index.json: ${index.themes.length} themes, ${index.visualizer.length} visualizer, ${index.equalizer.length} equalizer, ${index.widgets.length} widgets`);
