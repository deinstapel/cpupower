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
const Convenience = Me.imports.src.convenience;
const baseindicator = Me.imports.src.baseindicator;
const attempt_update = Me.imports.src.utils.attempt_update;

const SETTINGS_ID = 'org.gnome.shell.extensions.cpupower';
const Gettext = imports.gettext.domain('gnome-shell-extension-cpupower');
const _ = Gettext.gettext;

var UPDATE = 1;
var SECURITY_UPDATE = 2;

var UpdateIndicator = class UpdateIndicator extends baseindicator.CPUFreqBaseIndicator {
    constructor(updateType, done) {
        super();
        this._updateType = updateType;
        this._done = done;
        this.createMenu();
    }

    createMenu() {
        super.createMenu();

        let updateText = _('Your CPU Power Manager installation needs updating!');
        let securityText = _('Warning: Security issues were found with your installation!\n' +
                             'Please update immediately!');
        if (this._updateType === SECURITY_UPDATE) {
            updateText += "\n";
            updateText += securityText;
        }

        let updateLabel = new PopupMenu.PopupMenuItem(updateText, {reactive: false});
        this.section.addMenuItem(updateLabel);

        let separator = new PopupMenu.PopupSeparatorMenuItem();
        this.section.addMenuItem(separator);

        this.attemptUpdateLabel = new PopupMenu.PopupMenuItem(_('Attempt tool update'), {reactive: true});
        this.attemptUpdateLabel.connect('activate', attempt_update.bind(null, this._done));
        this.section.addMenuItem(this.attemptUpdateLabel);
    }
};
