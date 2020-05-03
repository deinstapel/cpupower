/*
 *
 *  CPUPower for GNOME Shell preferences
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2017
 *     Martin Koppehel <martin.koppehel@st.ovgu.de>
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

const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const Panel = imports.ui.panel;
const PopupMenu = imports.ui.popupMenu;
const GObject = imports.gi.GObject;
const Config = imports.misc.config;

const DEFAULT_EMPTY_NAME = 'No name';

var CPUFreqProfileButton;

// Handle different sub-classing paradigm between Gnome > 3.32 and Gnome <= 3.32
if (parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.32) {
    CPUFreqProfileButton = class CPUFreqProfileButton extends PopupMenu.PopupMenuItem {
        _init(profile) {
            super._init(_(profile.Name || DEFAULT_EMPTY_NAME), { reactive:true });
            this.Profile = profile;
        }
    };
    CPUFreqProfileButton = GObject.registerClass({ GTypeName: 'CPUFreqProfileButton' }, CPUFreqProfileButton);
} else {
    CPUFreqProfileButton = class CPUFreqProfileButton extends PopupMenu.PopupMenuItem {
        constructor(profile) {
            super(_(profile.Name || DEFAULT_EMPTY_NAME), { reactive:true });
            this.Profile = profile;
        }
    };
}
