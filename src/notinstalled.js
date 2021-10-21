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
const PopupMenu = imports.ui.popupMenu;

// Relative and misc imports and definitions
const Gio = imports.gi.Gio;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const baseindicator = Me.imports.src.baseindicator;
const attemptInstallation = Me.imports.src.utils.attemptInstallation;
const utils = Me.imports.src.utils;

const Gettext = imports.gettext.domain("gnome-shell-extension-cpupower");
const _ = Gettext.gettext;

/* exported NotInstalledIndicator */
var NotInstalledIndicator = class NotInstalledIndicator extends baseindicator.CPUFreqBaseIndicator {
    constructor(exitCode, done, onConstructed) {
        super();
        this.done = done;
        this.exitCode = exitCode;
        this.createMenu();

        if (onConstructed) {
            onConstructed(this);
        }
    }

    createMenu() {
        super.createMenu();

        if (this.exitCode === utils.INSTALLER_NOT_INSTALLED) {
            let notInstalledLabel = new PopupMenu.PopupMenuItem(_("Installation required."), {reactive: false});
            this.mainSection.addMenuItem(notInstalledLabel);
        } else {
            let errorLabel = new PopupMenu.PopupMenuItem(
                _("Oh no! This should not have happened.\n" +
                  "An error occurred while checking the installation!"),
                {reactive: false},
            );
            let reportLabel = new PopupMenu.PopupMenuItem(
                _("Please consider reporting this to the developers\n" +
                  "of this extension by submitting an issue on Github."),
                {reactive: true},
            );
            reportLabel.connect("activate", function () {
                Gio.AppInfo.launch_default_for_uri("https://github.com/deinstapel/cpupower/issues/new", null);
            });
            this.mainSection.addMenuItem(errorLabel);
            this.mainSection.addMenuItem(reportLabel);
        }

        let separator = new PopupMenu.PopupSeparatorMenuItem();
        this.mainSection.addMenuItem(separator);

        this.attemptInstallationLabel = new PopupMenu.PopupMenuItem(_("Attempt installation"), {reactive: true});
        this.attemptInstallationLabel.connect("activate", attemptInstallation.bind(null, this.done));
        this.mainSection.addMenuItem(this.attemptInstallationLabel);
    }
};
