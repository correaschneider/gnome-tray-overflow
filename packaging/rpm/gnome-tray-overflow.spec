Name:           gnome-tray-overflow
Version:        %{version}
Release:        1%{?dist}
Summary:        GNOME Shell extension: tray overflow for AppIndicator icons
License:        MIT
URL:            https://github.com/correaschneider/gnome-tray-overflow
Source0:        %{name}-%{version}.tar.gz
BuildArch:      noarch
BuildRequires:  glib2
Requires:       gnome-shell >= 45
Recommends:     gnome-shell-extension-appindicator

%description
Hides unpinned system tray (AppIndicator) icons behind a ⋯ button in the top
bar. Left click opens a drawer with the hidden icons; right click pins icons.

%prep
%setup -q

%install
d=%{buildroot}%{_datadir}/gnome-shell/extensions/%{uuid}
install -Dm644 src/extension.js $d/extension.js
install -Dm644 src/metadata.json $d/metadata.json
install -Dm644 src/schemas/*.gschema.xml -t $d/schemas/
glib-compile-schemas $d/schemas

%files
%license LICENSE
%doc README.md
%{_datadir}/gnome-shell/extensions/%{uuid}
