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
const Config = imports.misc.config;
const Gettext = imports.gettext.domain('gnome-shell-extension-cpupower');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.src.convenience;
const CPUFreqProfile = Me.imports.src.profile.CPUFreqProfile;
const EXTENSIONDIR = Me.dir.get_path();
const CONFIG = Me.imports.src.config;
const attempt_uninstallation = Me.imports.src.utils.attempt_uninstallation;

const GLADE_FILE = EXTENSIONDIR + "/data/cpupower-preferences.glade";
const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.cpupower';

var CPUPowerPreferences = class CPUPowerPreferences {
    constructor() {
        this.Builder = new Gtk.Builder();
        this.Builder.set_translation_domain("gnome-shell-extension-cpupower");
        this.Builder.add_objects_from_file(GLADE_FILE, ["MainWidget"]);
        this.Builder.connect_signals_full((builder, object, signal, handler) => {
            object.connect(signal, this[handler].bind(this));
        });
        this._loadWidgets(
            "MainWidget",
            "ShowIconSwitch",
            "ShowArrowSwitch",
            "ShowCurrentFrequencySwitch",
            "UseGHzInsteadOfMHzSwitch",
            "DefaultACComboBox",
            "DefaultBatComboBox",
            "ProfilesListBox",
            "ProfilesAddToolButton",
            "ProfilesRemoveToolButton",
            "ProfilesMoveUpToolButton",
            "ProfilesMoveDownToolButton",
            "ProfileStack",
            "CpufreqctlPathLabel",
            "PolicykitRulePathLabel",
            "InstallationWarningLabel",
            "UninstallButton"
        );
        this.ProfilesMap = new Map();
    }

    status() {
        global.log('status', arguments[0]);
    }

    _updateSettings() {
        let value = this._settings.get_boolean("show-freq-in-taskbar");
        this.ShowCurrentFrequencySwitch.set_active(value);

        value = this._settings.get_boolean("taskbar-freq-unit-ghz");
        this.UseGHzInsteadOfMHzSwitch.set_active(value);

        value = this._settings.get_boolean("show-icon-in-taskbar");
        this.ShowIconSwitch.set_active(value);

        value = this._settings.get_boolean("show-arrow-in-taskbar");
        this.ShowArrowSwitch.set_active(value);

        let id = this._settings.get_string("default-ac-profile");
        this.DefaultACComboBox.set_active_id(id);

        id = this._settings.get_string("default-battery-profile");
        this.DefaultBatComboBox.set_active_id(id);

        if (CONFIG.IS_USER_INSTALL) {
            this.InstallationWarningLabel.set_visible(false);
            this.UninstallButton.set_sensitive(true);
        } else {
            this.InstallationWarningLabel.set_visible(true);
            this.UninstallButton.set_sensitive(false);
        }

        this.CpufreqctlPathLabel.set_text(CONFIG.CPUFREQCTL);
        this.PolicykitRulePathLabel.set_text(CONFIG.POLKIT);

        // Backward compatibility:
        // for the new Settings UI we introduced a profile-id, which is not present in the older versions.
        // gesettings allows us to update the schema without conflicts.

        // CPUFreqProfile checks if an ID is present at load time, if not or an empty one was given, it will generate one
        // if any profile needed a new ID, we save all profiles and reload the UI.

        let _profiles = this._settings.get_value("profiles");
        _profiles = _profiles.deep_unpack();
        let _tmpProfiles = [];
        let _needsUpdate = false;
        for(let j in _profiles) {
            let profile = new CPUFreqProfile();
            _needsUpdate |= profile.load(_profiles[j]);
            _tmpProfiles.push(profile);
        }

        if (_needsUpdate) {
            let _saved = [];
            for (let p in _tmpProfiles) {
                _saved.push(_tmpProfiles[p].save());
            }
            this.status("Needed ID refresh, reloading");
            this._saveProfiles(_saved);
            this._updateSettings();
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
                    TurboBoostStatusLabel: null,
                    AutoSwitchACIcon: null,
                    AutoSwitchBatIcon: null
                }
            };

            let profileSettingsBuilder = new Gtk.Builder();
            profileSettingsBuilder.set_translation_domain("gnome-shell-extension-cpupower");
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
            profileListItemBuilder.set_translation_domain("gnome-shell-extension-cpupower");
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
            profileContext.ListItem.AutoSwitchACIcon = profileListItemBuilder.get_object(
                "ProfileRowACIcon"
            );
            profileContext.ListItem.AutoSwitchBatIcon = profileListItemBuilder.get_object(
                "ProfileRowBatIcon"
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
        else
        {
            // update profile context with given profile
            profileContext.Profile = profile;
        }

        profileContext.Settings.NameEntry.set_text(profileContext.Profile.Name);
        profileContext.Settings.MinimumFrequencyScale.set_value(profileContext.Profile.MinimumFrequency);
        profileContext.Settings.MaximumFrequencyScale.set_value(profileContext.Profile.MaximumFrequency);
        profileContext.Settings.TurboBoostSwitch.set_active(profileContext.Profile.TurboBoost);
        profileContext.ListItem.NameLabel.set_text(profileContext.Profile.Name);
        profileContext.ListItem.MinimumFrequencyLabel.set_text(profileContext.Profile.MinimumFrequency.toString());
        profileContext.ListItem.MaximumFrequencyLabel.set_text(profileContext.Profile.MaximumFrequency.toString());
        profileContext.ListItem.TurboBoostStatusLabel.set_text(profileContext.Profile.TurboBoost ? _("Yes") : _("No"));

        this._settings.get_string("default-ac-profile") == profileContext.Profile.UUID ? 
            profileContext.ListItem.AutoSwitchACIcon.set_visible(true) : profileContext.ListItem.AutoSwitchACIcon.set_visible(false);
        this._settings.get_string("default-battery-profile") == profileContext.Profile.UUID ? 
            profileContext.ListItem.AutoSwitchBatIcon.set_visible(true) : profileContext.ListItem.AutoSwitchBatIcon.set_visible(false);

        profileContext.Settings.DiscardButton.sensitive = false;
        profileContext.Settings.SaveButton.sensitive = false;
    }

    removeProfile(profile) {
        let profileContext = this.ProfilesMap.get(profile.UUID);

        // set default profile to none if the removed profile was selected 
        if (this.DefaultACComboBox.get_active_id() == profileContext.Profile.UUID)
        {
            this._settings.set_string("default-ac-profile", "");
        }
        if (this.DefaultBatComboBox.get_active_id() == profileContext.Profile.UUID)
        {
            this._settings.set_string("default-battery-profile", "");
        }

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

    onMainWidgetSwitchPage(mainWidget) {
        if (mainWidget.get_current_page() == 1)
        {
            this.refreshAutoSwitchComboBoxes();
        }
    }

    /**
     * Refreshes the entries of default profile ComboBoxes from ProfilesMap and
     * sets the active entries from gsettings
     */
    refreshAutoSwitchComboBoxes() {
        this.DefaultACComboBox.remove_all();
        this.DefaultBatComboBox.remove_all();

        this.DefaultACComboBox.append("", _("None"));
        this.DefaultBatComboBox.append("", _("None"));

        let profileArray = Array.from(this.ProfilesMap.values());
        profileArray.sort((p1,p2) => this.getProfileIndex(p1.Profile) - this.getProfileIndex(p2.Profile));
        for(let i in profileArray) {
            let profile = profileArray[i].Profile;

            this.DefaultACComboBox.append(profile.UUID, profile.Name);
            this.DefaultBatComboBox.append(profile.UUID, profile.Name);
        }

        let id = this._settings.get_string("default-ac-profile");
        this.DefaultACComboBox.set_active_id(id);

        id = this._settings.get_string("default-battery-profile");
        this.DefaultBatComboBox.set_active_id(id);
    }

    onMainWidgetRealize(mainWidget) {
        mainWidget.expand = true;
        mainWidget.parent.border_width = 0;

        //let window = mainWidget.get_parent_window();
        //window.set_events(EventMask.BUTTON_RELEASE_MASK);

        this._settings = Convenience.getSettings(SETTINGS_SCHEMA);
        this._settings.connect("changed", this._updateSettings.bind(this));
        this._updateSettings();

        this.refreshAutoSwitchComboBoxes();

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
    onShowIconSwitchActiveNotify(switchButton) {
        let state = switchButton.active;
        this._settings.set_boolean("show-icon-in-taskbar", state);
        this.status("ShowIcon: " + state);
    }
    onShowArrowSwitchActiveNotify(switchButton) {
        let state = switchButton.active;
        this._settings.set_boolean("show-arrow-in-taskbar", state);
        this.status("ShowArrow: " + state);
    }

    onDefaultACComboBoxActiveNotify(comboBox) {
        let id = comboBox.get_active_id();
        this._settings.set_string("default-ac-profile", id);
        this.status("Default AC profile: " + comboBox.get_active_text());
    }

    onDefaultBatComboBoxActiveNotify(comboBox) {
        let id = comboBox.get_active_id();
        this._settings.set_string("default-battery-profile", id);
        this.status("Default battery profile: " + comboBox.get_active_text());
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
        let aboutBuilder = new Gtk.Builder();
        aboutBuilder.set_translation_domain("gnome-shell-extension-cpupower");
        aboutBuilder.add_objects_from_file(GLADE_FILE, ["AboutDialog"]);
        let dialog = aboutBuilder.get_object("AboutDialog");
        let parentWindow = this.MainWidget.get_toplevel();
        dialog.set_transient_for(parentWindow);
        dialog.run();
        dialog.hide();
    }

    onUninstallButtonClicked(button) {
        let uninstallDialogBuilder = new Gtk.Builder();
        uninstallDialogBuilder.set_translation_domain("gnome-shell-extension-cpupower");
        uninstallDialogBuilder.add_objects_from_file(GLADE_FILE, ["UninstallMessageDialog"]);
        let dialog = uninstallDialogBuilder.get_object("UninstallMessageDialog");
        let uninstallButton = uninstallDialogBuilder.get_object("UninstallDialogUninstall");
        let cancelButton = uninstallDialogBuilder.get_object("UninstallDialogCancel");
        let parentWindow = this.MainWidget.get_toplevel();
        dialog.set_transient_for(parentWindow);
        uninstallButton.connect("clicked", () => {
            attempt_uninstallation(success => {
                dialog.close();

                if (success) {
                    if (parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.32) {
                        GLib.spawn_sync(
                            null,
                            [
                                'gnome-extensions',
                                'disable',
                                'cpupower@mko-sl.de',
                            ],
                            null,
                            GLib.SpawnFlags.SEARCH_PATH,
                            null,
                        );
                        GLib.spawn_sync(
                            null,
                            [
                                'gnome-extensions',
                                'enable',
                                'cpupower@mko-sl.de',
                            ],
                            null,
                            GLib.SpawnFlags.SEARCH_PATH,
                            null,
                        );
                    } else {
                        GLib.spawn_sync(
                            null,
                            [
                                'gnome-shell-extension-tool',
                                '--disable-extension',
                                'cpupower@mko-sl.de',
                            ],
                            null,
                            GLib.SpawnFlags.SEARCH_PATH,
                            null,
                        );
                        GLib.spawn_sync(
                            null,
                            [
                                'gnome-shell-extension-tool',
                                '--enable-extension',
                                'cpupower@mko-sl.de',
                            ],
                            null,
                            GLib.SpawnFlags.SEARCH_PATH,
                            null,
                        );
                    }
                    this.MainWidget.get_toplevel().get_application().quit();
                }
            });
        });
        cancelButton.connect("clicked", () => {
            dialog.close();
        });
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

    onProfileDefaultBatChecktoggled(profileContext, checkButton) {
        profileContext.Settings.DiscardButton.sensitive = true;
        profileContext.Settings.SaveButton.sensitive = true;
    }

    onProfileDefaultACChecktoggled(profileContext, checkButton) {
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

        this._saveProfiles(_saved);
    }

    /**
     * Saves a profile array in iibssbb-form
     * @param {Array} saved 
     */
    _saveProfiles(saved) {
        saved = GLib.Variant.new("a(iibss)", saved);
        this._settings.set_value("profiles", saved);
    }
}
