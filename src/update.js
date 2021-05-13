/*
 *
 *  CPUPower for GNOME Shell preferences
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2020
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
const PopupMenu = imports.ui.popupMenu;

// Relative and misc imports and definitions
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const baseindicator = Me.imports.src.baseindicator;
const attemptUpdate = Me.imports.src.utils.attemptUpdate;

const Gettext = imports.gettext.domain("gnome-shell-extension-cpupower");
const _ = Gettext.gettext;

/* eslint no-unused-vars: "off" */
const UPDATE = 1;
const SECURITY_UPDATE = 2;

/* exported UpdateIndicator */
var UpdateIndicator = class UpdateIndicator extends baseindicator.CPUFreqBaseIndicator {
    constructor(updateType, done) {
        super();
        this.updateType = updateType;
        this.done = done;
        this.createMenu();
    }

    createMenu() {
        super.createMenu();

        let updateText = _("Your CPU Power Manager installation needs updating!");
        let securityText = _("Warning: Security issues were found with your installation!\n" +
                             "Please update immediately!");
        if (this.updateType === SECURITY_UPDATE) {
            updateText += "\n";
            updateText += securityText;
        }

        let updateLabel = new PopupMenu.PopupMenuItem(updateText, {reactive: false});
        this.mainSection.addMenuItem(updateLabel);

        let separator = new PopupMenu.PopupSeparatorMenuItem();
        this.mainSection.addMenuItem(separator);

        this.attemptUpdateLabel = new PopupMenu.PopupMenuItem(_("Attempt tool update"), {reactive: true});
        this.attemptUpdateLabel.connect("activate", attemptUpdate.bind(null, this.done));
        this.mainSection.addMenuItem(this.attemptUpdateLabel);
    }
};
