# Kodama Store

Themes and presets for [Kodama](https://github.com/KiyoshiTheDevil/Kodama).

Everything here is content, not code. Kodama reads `index.json` from this repo's `main` branch and
shows what it finds under Settings, Appearance. Adding something is a file and a commit: no build
of the app, no tag, no release.

## What is in here

| Folder | Status |
|---|---|
| `themes/` | Live. Installable from Kodama 1.0.0-alpha.38. |
| `visualizer/` | Live. Installable from Kodama 1.0.0-alpha.38. |
| `equalizer/` | Live, same. |
| `widgets/` | Reserved. Overlay designs from the Overlay Editor. |
| `extensions/` | Live. A manifest per extension, downloaded and installed by Kodama. |

## Adding something

1. Write the file: `themes/<id>.json`, `visualizer/<id>.json` or `equalizer/<id>.json`. Copy one
   that is already there and change the values, and read the README in that folder.
2. `node scripts/build-index.mjs`
3. Commit your file and the regenerated `index.json`, then open a pull request.

The generator checks your file and refuses to write the index if something is wrong, so a mistake
stops while you are still looking at it rather than reaching anyone's app.

Themes are reviewed before they are merged. There is no way to install one from anywhere but this
repo, and that is deliberate.

## Fields

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Lowercase letters, digits and hyphens. Must match the filename. |
| `title` | yes | Shown in the picker and in the store. |
| `mode` | yes | `dark` or `light`. Declared, never guessed: it decides which half of the component library's own colours applies, and getting it wrong gives white text on a white card. |
| `tokens` | yes | The theme itself, see below. |
| `description` | no | One line of store copy. |
| `creators` | no | Who made it. The project's own things are credited to Kodama, not to an account name. |
| `version` | no | Raise it when you change a published theme, and the app offers an update to anyone who installed the older one. Defaults to `1.0.0`. |
| `minVersion` | no | The oldest Kodama that can render it. Raise it only if you use a token that did not exist before. |
| `tags` | no | For browsing. |
| `preview` | no | The four swatches on the store card. Derived from your tokens when absent. |

## Writing the tokens

A theme lists only what it **changes**. Kodama's `:root` is the ground everything stands on: the
strokes, the fill states and the text ladder are white at fixed opacities, and they sit correctly
on any dark ground of roughly the same brightness. A dark theme is often ten to fifteen values for
that reason.

A **light** theme is not short. Every one of those white-on-dark values has to be replaced, or you
get white text on a white card. Start from `themes/paper.json` rather than from a dark theme.

Two things are worth setting even when they look fine inherited, because they were chosen against
Kodama's default grey and read as foreign objects on anything else:

- `--slider-track`
- `--scroll-thumb`, `--scroll-thumb-dim`, `--scroll-thumb-hover`

`--accent` is a **proposal**, not a setting. It applies only while the listener has not picked an
accent of their own. Theirs always wins, and "Use the theme's colour" hands it back.

## What a theme may contain

Values are checked twice: here, where a bad one fails the build, and in the app, where it is
dropped. A value is rejected if it contains `{`, `}`, `;`, `@`, `url(` or `expression(`, or if it
is longer than 200 characters. A name that is not `--something` is rejected too.

This is a security boundary, not a taste one. It stops a theme from closing the CSS rule and
writing selectors of its own, from fetching over the network, and from pulling in a stylesheet.
Kodama's content policy blocks the same thing a second time, so neither check stands alone.

It does **not** stop a theme from being unreadable: `--bg-base` and `--t1` both white passes every
check. That is what review is for.

## Extensions

An extension is its manifest: `extensions/<id>.json`. It is downloaded and kept by whoever
installs it, so nothing about it lives in Kodama's build.

Almost nothing. Permissions come in two tiers, and the ones that reach past the sandbox, creating
a window, calling a backend route, are honoured only for ids Kodama's own build lists. That is not
a second opinion about review: `backend:composer` grants access to routes that exist in a
particular Kodama version, so the build has to know about it either way. An extension asking only
for open permissions needs no release, which is the case this arrangement exists to serve.

Kodama parses the manifest with the same code it would use on a stranger's, before storing it and
again every time it reads it. An entry edited afterwards to award itself something is refused on
the next read, not merely on the first.

## Licence

CC0 1.0, and that covers **content**: themes, presets and widget designs. By opening a pull request
for one of those you place it in the public domain. Your name stays in `creators` and is shown in
the app.

It does **not** cover code. Extensions are software, they carry their own licence, and some of
Kodama's own are AGPL, so nothing here should be read as placing an extension in the public domain.
When extensions arrive, this repo will carry the index that points at them rather than their source,
and each one keeps the licence its author gave it.
