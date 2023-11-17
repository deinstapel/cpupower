/*
 *
 *  CPUPower for GNOME Shell preferences
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2017
 *     Martin Koppehel <martin.koppehel@st.ovgu.de>,
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

// Gnome imports
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

// Relative and misc imports and definitions
import * as Convenience from './convenience.js';
const SETTINGS_ID = "org.gnome.shell.extensions.cpupower";
const EXTENSIONDIR = import.meta.url.substr('file://'.length, import.meta.url.lastIndexOf('/') - 'file://'.length) + '/..';

/* exported CPUFreqBaseIndicator */
export class CPUFreqBaseIndicator {
    constructor() {
        this.mainButton = new PanelMenu.Button(null, "cpupower");
        this.menu = this.mainButton.menu;

        if (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) > 3.32) {
            this.actor = this.mainButton;
        } else {
            this.actor = this.mainButton.actor;
        }

        this.settings = Convenience.getSettings(SETTINGS_ID);

        Main.panel.menuManager.addMenu(this.menu);
        this.hbox = new St.BoxLayout({style_class: "panel-status-menu-box"});
        let gicon = Gio.icon_new_for_string(EXTENSIONDIR + '/data/icons/cpu-symbolic.svg');
        this.icon = new St.Icon({
            gicon,
            style_class: "system-status-icon",
        });

        this.lbl = new St.Label({text: "", y_expand: true, y_align: Clutter.ActorAlign.CENTER});
        this.arrow = PopupMenu.arrowIcon(St.Side.BOTTOM);

        this.createIndicator();

        this.settings.connect("changed", this.onSettingsChanged.bind(this));
    }

    onSettingsChanged() {
        this.createIndicator();
        this.createMenu();
    }

    createIndicator() {
        this.lblActive = this.settings.get_boolean("show-freq-in-taskbar");
        this.lblUnit = this.settings.get_boolean("taskbar-freq-unit-ghz");
        this.iconActive = this.settings.get_boolean("show-icon-in-taskbar");
        this.arrowActive = this.settings.get_boolean("show-arrow-in-taskbar");
        this.hbox.remove_all_children();
        if (this.iconActive) {
            this.hbox.add_actor(this.icon);
        }
        if (this.lblActive) {
            this.hbox.add_actor(this.lbl);
        }
        if (this.arrowActive) {
            this.hbox.add_actor(this.arrow);
        }
    }

    createMenu() {
        this.menu.removeAll(); // clear the menu in case we are recreating the menu
        this.mainSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this.mainSection);
    }

    disable() {
        this.actor.remove_actor(this.hbox);
    }

    enable() {
        this.actor.add_actor(this.hbox);
    }

    destroy() {
        this.mainButton.destroy();
    }
};
