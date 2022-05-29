Name:           gnome-shell-extension-cpupower
Version:        10.1.1
Release:        1%{?dist}
Summary:        Gnome-Shell Extension for controlling the frequency setting of your CPU
BuildArch:      noarch

License:        GPL-3.0 License
URL:            https://github.com/deinstapel/cpupower
Source0:        %{name}-%{version}.tar.gz
Patch0:         tool-install-no-root.patch

BuildRequires:  make gettext glib2 zip unzip
%if %{defined suse_version}
BuildRequires:  glib2-tools
%endif
%if %{defined mdkversion} || %{defined mgaversion}
BuildRequires:  glib2.0-common
%endif
Requires:       gnome-shell polkit gjs

%description
Manage the frequency scaling driver of your CPU (Intel Core and AMD Ryzen processors supported)

%prep
%setup -c -q
%patch0 -p1

%install
rm -rf $RPM_BUILD_ROOT
make install install-tool PREFIX=$RPM_BUILD_ROOT/usr
find $RPM_BUILD_ROOT -type f | xargs sed -i "s;$RPM_BUILD_ROOT;;g"

%clean
rm -rf $RPM_BUILD_ROOT

%files
/usr/bin/cpufreqctl
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/LICENSE
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/data/10-mko.cpupower.setcpufreq.rules
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/data/mko.cpupower.policy.in
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/data/cpupower-preferences.glade
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/data/icons/cpu-symbolic.svg
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/extension.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/af/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/ar/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/ca/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/cs/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/da/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/de/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/el/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/en/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/es/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/fi/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/fr/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/he/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/hu/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/it/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/ja/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/ko/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/nl/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/no/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/pl/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/pt/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/ro/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/ru/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/sr/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/sr@latin/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/sv/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/tr/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/uk/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/vi/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/locale/zh/LC_MESSAGES/gnome-shell-extension-cpupower.mo
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/metadata.json
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/prefs.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/schemas/gschemas.compiled
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/schemas/io.github.martin31821.cpupower.dbus.xml
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/barLevel2.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/baseindicator.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/config.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/convenience.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/indicator.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/notinstalled.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/preferences.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/prefs40/main.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/prefs40/misc.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/profile.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/profilebutton.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/slider2.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/update.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/src/utils.js
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/tool/cpufreqctl
/usr/share/gnome-shell/extensions/cpupower@mko-sl.de/tool/installer.sh
/usr/share/polkit-1/actions/mko.cpupower.setcpufreq.policy
/usr/share/polkit-1/rules.d/10-mko.cpupower.setcpufreq.rules

%license LICENSE
%doc README.md
