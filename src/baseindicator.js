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
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Clutter = imports.gi.Clutter;

// Relative and misc imports and definitions
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.src.convenience;
const SETTINGS_ID = 'org.gnome.shell.extensions.cpupower';

var CPUFreqBaseIndicator = new Lang.Class({
    Name: 'cpupower.CPUFreqBaseIndicator',
    Extends: PanelMenu.Button,
    Abstract: true,

    _init: function()
    {
        this.parent(null, 'cpupower');

        this.settings = Convenience.getSettings(SETTINGS_ID);

        Main.panel.menuManager.addMenu(this.menu);
        this.hbox = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        let gicon = Gio.icon_new_for_string(Me.path + '/data/icons/cpu.svg');
        let icon = new St.Icon({
            gicon: gicon,
            style_class: 'system-status-icon'
        });

        this.lbl = new St.Label({text: '', y_expand:true, y_align: Clutter.ActorAlign.CENTER});
        this.hbox.add_actor(this.lbl);


        this.lblActive = (this.settings.get_boolean('show-freq-in-taskbar'));
        this.lblUnit = (this.settings.get_boolean('taskbar-freq-unit-ghz'));

        this.hbox.add_actor(icon);
        this.hbox.add_actor(PopupMenu.arrowIcon(St.Side.BOTTOM));


        this.settings.connect('changed', this._createMenu.bind(this));
        this._createMenu();
    },

    _createMenu: function()
    {
        this.menu.removeAll(); // clear the menu in case we are recreating the menu
        this.section = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this.section);
    },

    _disable: function()
    {
        this.actor.remove_actor(this.hbox);
    },

    _enable: function()
    {
        this.actor.add_actor(this.hbox);
    }
});
