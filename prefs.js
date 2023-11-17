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

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {CPUPowerPreferencesContent} from './src/preferences.js';
import Gtk from 'gi://Gtk';

export default class CPUPowerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(win) {
        win._settings = this.getSettings();
        win.connect("delete-event", () => {
            Gtk.main_quit();
        });
        let headerbar = new Gtk.HeaderBar();
        headerbar.set_show_close_button(true);
        headerbar.title = "CPU Power Manager";
        let preferences = new CPUPowerPreferencesContent();
        let mainWidget = preferences.show();
        win.set_titlebar(headerbar);
        win.add(mainWidget);
    }
}
