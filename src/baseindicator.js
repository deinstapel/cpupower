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

import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Util from "resource:///org/gnome/shell/misc/util.js";
import * as Config from "resource:///org/gnome/shell/misc/config.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

// Gnome imports
import Gio from "gi://Gio";
import St from "gi://St";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";

//Relative imports

import { CpuPowerExtension } from "./../extension.js";

/* exported CPUFreqBaseIndicator */
var CPUFreqBaseIndicator = class CPUFreqBaseIndicator {
    constructor() {
        this.mainButton = new PanelMenu.Button(null, "cpupower");
        this.menu = this.mainButton.menu;

        this.actor = this.mainButton;
        ax;
        this.settings = new CpuPowerExtension().settings;
        Main.panel.menuManager.addMenu(this.menu);
        this.hbox = new St.BoxLayout({ style_class: "panel-status-menu-box" });
        let gicon = Gio.icon_new_for_string(
            `${Me.path}/data/icons/cpu-symbolic.svg`
        );
        this.icon = new St.Icon({
            gicon,
            style_class: "system-status-icon",
        });

        this.lbl = new St.Label({
            text: "",
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
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
