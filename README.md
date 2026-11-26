# Tray Overflow (GNOME Shell extension)

Keeps the GNOME top bar tidy: system tray icons (AppIndicator / KStatusNotifierItem) that are
**not pinned** go behind a **⋯** button, like the Windows tray overflow (`^`) or Brave's
extensions puzzle piece.

- **Left click on ⋯** — opens a drawer, right in the bar, with the hidden icons. Each icon keeps
  working as usual (its own menu opens on click, hover switches between menus).
- The drawer **closes by itself** 3 s after the pointer leaves it, unless one of its menus is open.
- **Right click on ⋯ → Pin to bar** — one switch per icon; pinning or unpinning moves the icon
  immediately and is remembered across sessions.
- **⋯** always sits right after the last pinned tray icon.
- Disabling the extension (or locking the screen) puts every icon back where it was.

Requires GNOME Shell 45–49 and the AppIndicator extension
(`ubuntu-appindicators@ubuntu.com` on Ubuntu, `appindicatorsupport@rgcjonas.gmail.com` elsewhere).

## Install

From a [release](https://github.com/correaschneider/gnome-tray-overflow/releases):

| Distro | Command |
|---|---|
| Any (per user) | `gnome-extensions install --force tray-overflow@correaschneider.github.com.shell-extension.zip` |
| Debian / Ubuntu | `sudo apt install ./gnome-tray-overflow_<ver>_all.deb` |
| Fedora / openSUSE | `sudo dnf install ./gnome-tray-overflow-<ver>-1.noarch.rpm` |
| Arch | `makepkg -si` with the `PKGBUILD` from the release |
| From source | `git clone … && ./scripts/install.sh` |

Then reload GNOME Shell (X11: <kbd>Alt</kbd>+<kbd>F2</kbd>, `r`, <kbd>Enter</kbd>; Wayland: log out
and back in) and run:

```bash
gnome-extensions enable tray-overflow@correaschneider.github.com
```

## Pinning by prefix

Pins are stored as indicator IDs in `org.gnome.shell.extensions.tray-overflow pinned`.
An entry ending in `*` matches by prefix — useful for apps that create several indicators
(the default pins `claude-usage-*`, from [claude-usage-tray](https://github.com/correaschneider/claude-usage-tray)):

```bash
gsettings --schemadir ~/.local/share/gnome-shell/extensions/tray-overflow@correaschneider.github.com/schemas \
  set org.gnome.shell.extensions.tray-overflow pinned "['claude-usage-*', 'nm-applet']"
```

## Not supported

Drag and drop, legacy XEmbed icons.

## Build

```bash
scripts/build.sh   # dist/: .zip, .deb, .rpm (via docker fedora), .tar.gz, PKGBUILD, SHA256SUMS
```

## License

MIT
