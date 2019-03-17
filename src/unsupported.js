/*
 *
 *  CPUPower for GNOME Shell preferences
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2017
 *     Martin Koppehel <martin.koppehel@st.ovgu.de>,
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
const PopupMenu = imports.ui.popupMenu;

// Relative and misc imports and definitions
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const baseindicator = Me.imports.src.baseindicator;
const Gettext = imports.gettext.domain('gnome-shell-extension-cpupower');
const _ = Gettext.gettext;


var UnsupportedIndicator = class UnsupportedIndicator extends baseindicator.CPUFreqBaseIndicator {
    constructor() {
        super();
        this.createMenu();
    }

    createMenu() {
        super.createMenu();
        let unsupporedLabel = new PopupMenu.PopupMenuItem(_('Your computer does not support intel_pstate.'), {reactive: false});
        this.section.addMenuItem(unsupporedLabel);
    }
};
