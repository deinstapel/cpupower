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

const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const GtkBuilder = Gtk.Builder;
const Gio = imports.gi.Gio;
const Gettext = imports.gettext.domain('gnome-shell-extension-cpupower');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.src.convenience;
const CPUFreqProfile = Me.imports.src.profile.CPUFreqProfile;
const EXTENSIONDIR = Me.dir.get_path();

const GLADE_FILE = EXTENSIONDIR + "/data/cpupower-preferences.glade";
const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.cpupower';

var CPUPowerPreferences = class CPUPowerPreferences {
    constructor() {
        this.Builder = new Gtk.Builder();
        this.Builder.add_objects_from_file(GLADE_FILE, ["MainWidget"]);
        this.Builder.connect_signals_full((builder, object, signal, handler) => {
            object.connect(signal, this[handler].bind(this));
        });
        this._loadWidgets(
            "MainWidget",
            "ShowCurrentFrequencySwitch",
            "UseGHzInsteadOfMHzSwitch",
            "ProfilesListBox",
            "ProfilesAddToolButton",
            "ProfilesRemoveToolButton",
            "ProfilesMoveUpToolButton",
            "ProfilesMoveDownToolButton",
            "ProfileStack"
        );
        this.ProfilesMap = new Map();
    }

    status() {
        global.log(arguments[0]);
    }

    _updateSettings() {
        let value = this._settings.get_boolean("show-freq-in-taskbar");
        this.ShowCurrentFrequencySwitch.set_active(value);

        value = this._settings.get_boolean("taskbar-freq-unit-ghz");
        this.UseGHzInsteadOfMHzSwitch.set_active(value);


        // Backward compatibility:
        // for the new Settings UI we introduced a profile-id, which is not present in the older versions.
        // gesettings allows us to update the schema without conflicts.

        // CPUFreqProfile checks if an ID is present at load time, if not or an empty one was given, it will generate one
        // if any profile needed a new ID, we save all profiles and reload the UI.


        let _profiles = this._settings.get_value("profiles");
        _profiles = _profiles.deep_unpack();
        let _tmpProfiles = [];
        let _needsUUIDSave = false;
        for(let j in _profiles) {
            let profile = new CPUFreqProfile();
            _needsUUIDSave |= profile.load(_profiles[j]);
            _tmpProfiles.push(profile);
        }

        if (_needsUUIDSave) {
            let _saved = [];
            for (let p in _tmpProfiles) {
                _saved.push(_tmpProfiles[p].save());
            }
            this.status("Needed ID refresh, reloading");
            _saved = GLib.Variant.new("a(iibss)", _saved);
            this._settings.set_value("profiles", _saved);
            _updateSettings();
        } else {
            for (let p in _tmpProfiles) {
                this.addOrUpdateProfile(_tmpProfiles[p]);
            }
        }
    }

    // Dat is so magic, world is exploooooooding
    _loadWidgets() {
        for (let i in arguments) {
            this[arguments[i]] = this.Builder.get_object(arguments[i]);
        }
    }

    _syncOrdering() {
        for (let profileContext of this.ProfilesMap.values()) {
            let index = profileContext.ListItem.Row.get_index();
            this.ProfileStack.child_set_property(profileContext.Settings.StackItem, "position", index);
        }
    }

    _selectFirstProfile() {
        for (let profileContext of this.ProfilesMap.values()) {
            let index = profileContext.ListItem.Row.get_index();
            if (index == 0) {
                this.ProfilesListBox.select_row(profileContext.ListItem.Row);
                break;
            }
        }
    }

    addOrUpdateProfile(profile) {
        let profileContext = this.ProfilesMap.get(profile.UUID);

        if (profileContext == undefined) {
            profileContext = {
                Profile: profile,
                Settings: {
                    StackItem: null,
                    NameEntry: null,
                    MinimumFrequencyScale: null,
                    MaximumFrequencyScale: null,
                    TurboBoostSwitch: null,
                    DiscardButton: null,
                    SaveButton: null
                },
                ListItem: {
                    Row: null,
                    NameLabel: null,
                    MinimumFrequencyLabel: null,
                    MaximumFrequencyLabel: null,
                    TurboBoostStatusLabel: null
                }
            };

            let profileSettingsBuilder = new Gtk.Builder();
            profileSettingsBuilder.add_objects_from_file(
                GLADE_FILE,
                [
                    "ProfileSettingsGrid",
                    "MaximumFrequencyAdjustment",
                    "MinimumFrequencyAdjustment"
                ]
            );
            profileContext.Settings.NameEntry = profileSettingsBuilder.get_object(
                "ProfileNameEntry"
            );
            profileContext.Settings.MinimumFrequencyScale = profileSettingsBuilder.get_object(
                "ProfileMinimumFrequencyScale"
            );
            profileContext.Settings.MaximumFrequencyScale = profileSettingsBuilder.get_object(
                "ProfileMaximumFrequencyScale"
            );
            profileContext.Settings.TurboBoostSwitch = profileSettingsBuilder.get_object(
                "ProfileTurboBoostSwitch"
            );
            profileContext.Settings.DiscardButton = profileSettingsBuilder.get_object(
                "ProfileDiscardButton"
            );
            profileContext.Settings.SaveButton = profileSettingsBuilder.get_object(
                "ProfileSaveButton"
            );
            profileContext.Settings.StackItem = profileSettingsBuilder.get_object(
                "ProfileSettingsGrid"
            );

            let profileListItemBuilder = new Gtk.Builder();
            profileListItemBuilder.add_objects_from_file(GLADE_FILE, ["ProfileListBoxRow"]);
            profileContext.ListItem.NameLabel = profileListItemBuilder.get_object(
                "ProfileRowNameLabel"
            );
            profileContext.ListItem.MinimumFrequencyLabel = profileListItemBuilder.get_object(
                "ProfileRowMinimumFrequencyLabel"
            );
            profileContext.ListItem.MaximumFrequencyLabel = profileListItemBuilder.get_object(
                "ProfileRowMaximumFrequencyLabel"
            );
            profileContext.ListItem.TurboBoostStatusLabel = profileListItemBuilder.get_object(
                "ProfileRowTurboBoostStatusLabel"
            );
            profileContext.ListItem.Row = profileListItemBuilder.get_object(
                "ProfileListBoxRow"
            );

            profileSettingsBuilder.connect_signals_full((builder, object, signal, handler) => {
                object.connect(signal, this[handler].bind(this, profileContext));
            });

            profileListItemBuilder.connect_signals_full((builder, object, signal, handler) => {
                object.connect(signal, this[handler].bind(this, profileContext));
            });

            this.ProfilesListBox.prepend(profileContext.ListItem.Row);
            this.ProfileStack.add_named(profileContext.Settings.StackItem, profileContext.Profile.UUID.toString(16));
            this.ProfilesMap.set(profileContext.Profile.UUID, profileContext);
            this._syncOrdering();
        }

        profileContext.Settings.NameEntry.set_text(profileContext.Profile.Name);
        profileContext.Settings.MinimumFrequencyScale.set_value(profileContext.Profile.MinimumFrequency);
        profileContext.Settings.MaximumFrequencyScale.set_value(profileContext.Profile.MaximumFrequency);
        profileContext.Settings.TurboBoostSwitch.set_active(profileContext.Profile.TurboBoost);
        profileContext.ListItem.NameLabel.set_text(profileContext.Profile.Name);
        profileContext.ListItem.MinimumFrequencyLabel.set_text(profileContext.Profile.MinimumFrequency.toString());
        profileContext.ListItem.MaximumFrequencyLabel.set_text(profileContext.Profile.MaximumFrequency.toString());
        profileContext.ListItem.TurboBoostStatusLabel.set_text(profileContext.Profile.TurboBoost ? _("Yes") : _("No"));

        profileContext.Settings.DiscardButton.sensitive = false;
        profileContext.Settings.SaveButton.sensitive = false;
    }

    removeProfile(profile) {
        let profileContext = this.ProfilesMap.get(profile.UUID);
        this.ProfilesListBox.remove(profileContext.ListItem.Row);
        this.ProfileStack.remove(profileContext.Settings.StackItem);
        this.ProfilesMap.delete(profile.UUID);
        this._syncOrdering();
    }

    setProfileIndex(profile, index) {
        let profileContext = this.ProfilesMap.get(profile.UUID);
        let profileCount = this.ProfilesMap.length;
        index = index >= profileContext ? profileCount - 1 : index;
        this.ProfilesListBox.remove(profileContext.ListItem.Row);
        this.ProfilesListBox.insert(profileContext.ListItem.Row, index);
        this._syncOrdering();
    }

    getProfileIndex(profile) {
        let profileContext = this.ProfilesMap.get(profile.UUID);
        return profileContext.ListItem.Row.get_index();
    }

    getSelectedProfileContext() {
        let selectedRow = this.ProfilesListBox.get_selected_rows()[0];
        let profileContext = null;

        for (let profCtx of this.ProfilesMap.values()) {
            if (profCtx.ListItem.Row == selectedRow) {
                profileContext = profCtx;
                break;
            }
        }
        return profileContext;
    }

    onMainWidgetRealize(mainWidget) {
        mainWidget.expand = true;
        mainWidget.parent.border_width = 0;

        //let window = mainWidget.get_parent_window();
        //window.set_events(EventMask.BUTTON_RELEASE_MASK);

        this._settings = Convenience.getSettings(SETTINGS_SCHEMA);
        this._settings.connect("changed", this._updateSettings.bind(this));
        this._updateSettings();

        this._selectFirstProfile();
    }

    onShowCurrentFrequencySwitchActiveNotify(switchButton) {
        let state = switchButton.active;
        this._settings.set_boolean("show-freq-in-taskbar", state);
        this.status("ShowCurrentFrequency: " + state);
    }

    onUseGHzInsteadOfMHzSwitchActiveNotify(switchButton) {
        let state = switchButton.active;
        this._settings.set_boolean("taskbar-freq-unit-ghz", state);
        this.status("UseGHzInsteadOfMHz: " + state);
    }

    onProfilesAddToolButtonClicked(button) {
        this.addOrUpdateProfile(new CPUFreqProfile());
        this._saveOrderedProfileList();
    }

    onProfilesRemoveToolButtonClicked(button) {
        let profileContext = this.getSelectedProfileContext();
        if (!!profileContext) {
            this.removeProfile(profileContext.Profile);
        }
        this._saveOrderedProfileList();
    }

    onProfilesMoveUpToolButtonClicked(button) {
        let profileContext = this.getSelectedProfileContext();
        if (!!profileContext) {
            let index = profileContext.ListItem.Row.get_index() - 1;
            index = index < 0 ? 0 : index;
            this.setProfileIndex(profileContext.Profile, index);
        }
        this._saveOrderedProfileList();
    }

    onProfilesMoveDownToolButtonClicked(button) {
        let profileContext = this.getSelectedProfileContext();
        if (!!profileContext) {
            let index = profileContext.ListItem.Row.get_index() + 1;
            this.setProfileIndex(profileContext.Profile, index);
        }
        this._saveOrderedProfileList();
    }

    onAboutButtonClicked(button) {
        let profileListItemBuilder = new Gtk.Builder();
        profileListItemBuilder.add_objects_from_file(GLADE_FILE, ["AboutDialog"]);
        let dialog = profileListItemBuilder.get_object("AboutDialog");
        let parentWindow = this.MainWidget.get_toplevel();
        dialog.set_transient_for(parentWindow);
        dialog.run();
        dialog.hide();
    }

    onProfilesListBoxRowSelected(box, row) {
        let profileContext = this.getSelectedProfileContext();
        if (!!profileContext) {
            this.ProfileStack.set_visible_child(profileContext.Settings.StackItem);
        }
    }

    onProfileNameEntryChanged(profileContext, entry) {
        profileContext.Settings.DiscardButton.sensitive = true;
        profileContext.Settings.SaveButton.sensitive = true;
    }

    onProfileMinimumFrequencyScaleValueChanged(profileContext, scale) {
        profileContext.Settings.DiscardButton.sensitive = true;
        profileContext.Settings.SaveButton.sensitive = true;
    }

    onProfileMaximumFrequencyScaleValueChanged(profileContext, scale) {
        profileContext.Settings.DiscardButton.sensitive = true;
        profileContext.Settings.SaveButton.sensitive = true;
    }

    onProfileTurboBoostSwitchActiveNotify(profileContext, switchButton) {
        profileContext.Settings.DiscardButton.sensitive = true;
        profileContext.Settings.SaveButton.sensitive = true;
    }

    onProfileDiscardButtonClicked(profileContext, button) {
        this.addOrUpdateProfile(profileContext.Profile);
    }

    onProfileSaveButtonClicked(profileContext, button) {
        let name = profileContext.Settings.NameEntry.get_text();
        let minimumFrequency = profileContext.Settings.MinimumFrequencyScale.get_value();
        let maximumFrequency = profileContext.Settings.MaximumFrequencyScale.get_value();
        let turboBoost = profileContext.Settings.TurboBoostSwitch.get_active();

        profileContext.Profile.Name = name;
        profileContext.Profile.MinimumFrequency = minimumFrequency;
        profileContext.Profile.MaximumFrequency = maximumFrequency;
        profileContext.Profile.TurboBoost = turboBoost;

        this.addOrUpdateProfile(profileContext.Profile);
        this._saveOrderedProfileList();
    }

    _saveOrderedProfileList() {
        let _saved = [];
        for (let value of this.ProfilesMap.entries()) {
            this.status("value: " + value[0] + value[1]);
            let idx = this.ProfilesMap.size - 1 - this.getProfileIndex(value[1].Profile);
            this.status("Saving: " + value[1].Profile.UUID + "to idx: " + idx);
            _saved[idx] = value[1].Profile.save();
        }

        _saved = GLib.Variant.new("a(iibss)", _saved);
        this._settings.set_value("profiles", _saved);
    }
}
