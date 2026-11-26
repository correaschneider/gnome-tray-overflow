# gnome-tray-overflow

GNOME Shell extension (ESM, GNOME 45+) that hides unpinned AppIndicator icons behind a ⋯ button.

## Layout
- `src/` — the extension as installed: `extension.js`, `metadata.json`, `schemas/`.
  `metadata.json` `version-name` is the single source of the version; `uuid` is used everywhere.
- `packaging/{deb,rpm,arch}` — templates; `@VERSION@`/`@UUID@`/`@SHA256@` are filled by `scripts/build.sh`.
- `scripts/build.sh` → `dist/`; `scripts/install.sh` — per-user install (also shipped in the tarball).

## How it works
- Indicators live in `Main.panel.statusArea` under `appindicator-*` keys; those keys come from the
  D-Bus address and change every session, so pins use the indicator's `_indicator.id`.
- Hidden icons go into a `St.BoxLayout` drawer **inside `Main.panel._rightBox`**, not into a popup:
  the panel `menuManager` allows one open menu, so icons inside a popup closed it when their own
  menu opened.
- Left click on ⋯ is intercepted on the `event` signal (runs before `PanelMenu.Button`'s vfunc);
  right click falls through and opens the pin menu.
- Our own moves set `_busy` so the `child-added` handler on `_rightBox` ignores them.

## Rules
- `disable()` must restore every icon and drop every signal/timeout: GNOME calls it on screen lock.
- Never touch indicators that are not `appindicator-*`.
- Code changes only load after a shell reload (X11 Alt+F2 `r`; Wayland logout). Test risky changes in
  `dbus-run-session -- gnome-shell --nested --wayland` and watch `journalctl -f /usr/bin/gnome-shell`.
- Check syntax with `gjs -m -c "import('file://$PWD/src/extension.js')"` before committing.

## Release
1. Bump `version-name` in `src/metadata.json`, commit, tag `vX.Y.Z`.
2. `scripts/build.sh`
3. `gh release create vX.Y.Z dist/*`
