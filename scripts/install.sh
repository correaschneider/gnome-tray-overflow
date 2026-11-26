#!/usr/bin/env bash
# Per-user install from the tarball or a git checkout (no root).
set -euo pipefail
cd "$(dirname "$0")"
[ -d src ] || cd ..
UUID=$(sed -n 's/.*"uuid": "\(.*\)".*/\1/p' src/metadata.json)
D=~/.local/share/gnome-shell/extensions/$UUID
rm -rf "$D" && mkdir -p "$D" && cp -r src/. "$D/"
glib-compile-schemas "$D/schemas"
gnome-extensions enable "$UUID" 2>/dev/null || true
echo "Installed to $D."
echo "X11: Alt+F2, r, Enter. Wayland: log out and back in. Then: gnome-extensions enable $UUID"
