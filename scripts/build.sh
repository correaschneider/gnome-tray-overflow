#!/usr/bin/env bash
# Builds dist/: extension .zip (gnome-extensions pack), .deb (dpkg-deb), .rpm (rpmbuild in the
# official fedora image), .tar.gz and an Arch PKGBUILD.
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=gnome-tray-overflow
UUID=$(sed -n 's/.*"uuid": "\(.*\)".*/\1/p' src/metadata.json)
VERSION=$(sed -n 's/.*"version-name": "\(.*\)".*/\1/p' src/metadata.json)
rm -rf dist build && mkdir -p dist build

# .zip installable with: gnome-extensions install --force <zip>
gnome-extensions pack src --force --out-dir dist --schema=schemas/org.gnome.shell.extensions.tray-overflow.gschema.xml 2>/dev/null \
  || (cd src && glib-compile-schemas schemas && zip -qr "../dist/$UUID.shell-extension.zip" . && rm schemas/gschemas.compiled)

stage() {  # $1 = root dir
  local d="$1/usr/share/gnome-shell/extensions/$UUID"
  install -Dm644 src/extension.js "$d/extension.js"
  install -Dm644 src/metadata.json "$d/metadata.json"
  install -Dm644 src/schemas/*.gschema.xml -t "$d/schemas/"
  glib-compile-schemas "$d/schemas"
  install -Dm644 LICENSE "$1/usr/share/doc/$NAME/copyright"
}

# .deb
R=build/deb; stage $R; mkdir -p $R/DEBIAN
sed "s/@VERSION@/$VERSION/" packaging/deb/control > $R/DEBIAN/control
fakeroot dpkg-deb --build -Zxz $R dist/${NAME}_${VERSION}_all.deb

# .tar.gz (install.sh inside)
T=build/$NAME-$VERSION; mkdir -p $T
cp -r src LICENSE README.md scripts/install.sh $T/
tar -C build -czf dist/$NAME-$VERSION.tar.gz $NAME-$VERSION

# .rpm
docker run --rm -v "$PWD":/w -w /w fedora:latest bash -c "
  dnf -qy install rpm-build glib2-devel >/dev/null &&
  mkdir -p /root/rpmbuild/SOURCES && cp dist/$NAME-$VERSION.tar.gz /root/rpmbuild/SOURCES/ &&
  rpmbuild -bb --define 'version $VERSION' --define 'uuid $UUID' packaging/rpm/$NAME.spec >/dev/null &&
  cp /root/rpmbuild/RPMS/noarch/*.rpm dist/ && chown $(id -u):$(id -g) dist/*.rpm"

# Arch PKGBUILD with the tarball checksum
sed -e "s/@VERSION@/$VERSION/" -e "s/@UUID@/$UUID/" \
  -e "s/@SHA256@/$(sha256sum dist/$NAME-$VERSION.tar.gz | cut -d' ' -f1)/" \
  packaging/arch/PKGBUILD > dist/PKGBUILD
(cd dist && sha256sum * > SHA256SUMS)
ls -la dist
