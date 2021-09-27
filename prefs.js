/*
 *
 *  CPUPower for GNOME Shell preferences
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2015
 *     Martin Koppehel <psl.kontakt@gmail.com>,
 *     Fin Christensen <christensen.fin@gmail.com>,
 *
 * This file is part of the gnome-shell extension cpupower.
 *
 * gnome-shell extension cpupower is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.
 *
 * gnome-shell extension cpupower is distributed in the hope that it
 * will be useful, but WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE.  See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell extension cpupower.  If not, see
 * <http://www.gnu.org/licenses/>.
 *
 */

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const EXTENSIONDIR = Me.dir.get_path();
const Convenience = Me.imports.src.convenience;
const CPUPowerPreferences = Me.imports.src.preferences.CPUPowerPreferences;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

/* exported init */
function init() {
    Convenience.initTranslations("gnome-shell-extension-cpupower");
}

/* exported buildPrefsWidget */
function buildPrefsWidget() {
    if (Gtk.get_major_version() === 4) {
        let dummy = new Gtk.Label();
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
            let window = dummy.get_root();
            window.close();

            GLib.spawn_sync(
                null,
                [`${EXTENSIONDIR}/src/prefs40/main.js`],
                null,
                null,
                null,
            );

            return GLib.SOURCE_REMOVE;
        });
        return dummy;
    } else {
        let preferences = new CPUPowerPreferences();

        return preferences.show();
    }
}
