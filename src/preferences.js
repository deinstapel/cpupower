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
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gettext = imports.gettext.domain("gnome-shell-extension-cpupower");
const _ = Gettext.gettext;
const ByteArray = imports.byteArray;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.src.convenience;
const CPUFreqProfile = Me.imports.src.profile.CPUFreqProfile;
const EXTENSIONDIR = Me.dir.get_path();
const CONFIG = Me.imports.src.config;
const attemptUninstallation = Me.imports.src.utils.attemptUninstallation;
const Cpufreqctl = Me.imports.src.utils.Cpufreqctl;

const GLADE_FILE = `${EXTENSIONDIR}/data/cpupower-preferences.glade`;
const SETTINGS_SCHEMA = "org.gnome.shell.extensions.cpupower";

/* exported CPUPowerPreferences */
var CPUPowerPreferences = class CPUPowerPreferences {
    constructor() {
        this.cpupowerService = null;
        this.cpupowerConnection = null;
        Gio.bus_own_name(
            Gio.BusType.SESSION,
            "io.github.martin31821.cpupower",
            Gio.BusNameOwnerFlags.NONE,
            this.onBusAcquired.bind(this),
            this.onNameAcquired.bind(this),
            this.onNameLost.bind(this),
        );

        this.Builder = new Gtk.Builder();
        this.Builder.set_translation_domain("gnome-shell-extension-cpupower");
        this.Builder.add_objects_from_file(
            GLADE_FILE,
            ["MainWidget", "AboutButton", "FrequencyScalingDriverListStore"],
        );
        this.Builder.connect_signals_full((builder, object, signal, handler) => {
            object.connect(signal, this[handler].bind(this));
        });
        this.loadWidgets(
            "MainWidget",
            "AboutButton",
            "ShowIconSwitch",
            "ShowArrowSwitch",
            "ShowCurrentFrequencySwitch",
            "UseGHzInsteadOfMHzSwitch",
            "ShowFrequencyAsComboBox",
            "FrequencyScalingDriverComboBox",
            "FrequencyScalingDriverListStore",
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
            "UninstallButton",
        );
        this.ProfilesMap = new Map();
    }

    onBusAcquired(connection, _name) {
        log("DBus bus acquired!");
        const interfaceXml = ByteArray.toString(GLib.file_get_contents(`${EXTENSIONDIR}/schemas/io.github.martin31821.cpupower.dbus.xml`)[1]);
        this.cpupowerService = Gio.DBusExportedObject.wrapJSObject(interfaceXml, {});
        this.cpupowerService.export(connection, "/io/github/martin31821/cpupower");

        // do not set connection in 'this' here, as we use it to check if name is
        // acquired
    }

    onNameAcquired(connection, _name) {
        log("DBus name acquired!");
        this.cpupowerConnection = connection;

        this.cpupowerService.emit_signal("ImAlive", null);
    }

    onNameLost(_connection, _name) {
        log("DBus name lost!");
        this.cpupowerConnection = null;
    }

    status(msg) {
        log(`[cpupower-status] ${msg}`);
    }

    checkFrequencies(cb) {
        Cpufreqctl.info.frequencies(this.settings.get_string("cpufreqctl-backend"), (result) => {
            if (!result.ok || result.exitCode !== 0) {
                let exitReason = Cpufreqctl.exitCodeToString(result.exitCode);
                log(`Failed to query supported frequency ranges from cpufreqctl, reason ${exitReason}! ` +
                    "Assuming full range...");
                log(result.response);
                cb({
                    min: 0,
                    max: 100,
                });
            } else if (result.response.mode === "continuous") {
                cb({
                    min: result.response.min,
                    max: result.response.max,
                });
            } else {
                log(`Cpufreqctl signaled unsupported frequency mode ${result.response.mode}! ` +
                    "Assuming full range...");
                cb({
                    min: 0,
                    max: 100,
                });
            }
        });
    }

    updateSettings(done) {
        let value = this.settings.get_boolean("show-freq-in-taskbar");
        this.ShowCurrentFrequencySwitch.set_active(value);

        value = this.settings.get_boolean("taskbar-freq-unit-ghz");
        this.UseGHzInsteadOfMHzSwitch.set_active(value);

        value = this.settings.get_boolean("show-icon-in-taskbar");
        this.ShowIconSwitch.set_active(value);

        value = this.settings.get_boolean("show-arrow-in-taskbar");
        this.ShowArrowSwitch.set_active(value);

        let id = this.settings.get_string("frequency-sampling-mode");
        this.ShowFrequencyAsComboBox.set_active_id(id);

        id = this.settings.get_string("cpufreqctl-backend");
        this.FrequencyScalingDriverComboBox.set_active_id(id);

        id = this.settings.get_string("default-ac-profile");
        this.DefaultACComboBox.set_active_id(id);

        id = this.settings.get_string("default-battery-profile");
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

        this.checkFrequencies((result) => {
            this.cpuMinLimit = result.min;
            this.cpuMaxLimit = result.max;

            // Backward compatibility:
            // for the new Settings UI we introduced a profile-id, which is not present in the older versions.
            // gsettings allows us to update the schema without conflicts.

            // CPUFreqProfile checks if an ID is present at load time, if not or an empty one was given, it will generate one
            // if any profile needed a new ID, we save all profiles and reload the UI.

            let profiles = this.settings.get_value("profiles");
            profiles = profiles.deep_unpack();
            let tmpProfiles = [];
            let needsUpdate = false;
            for (let j in profiles) {
                let profile = new CPUFreqProfile();
                needsUpdate |= profile.load(profiles[j]);

                if (profile.MinimumFrequency < this.cpuMinLimit) {
                    profile.MinimumFrequency = this.cpuMinLimit;
                    needsUpdate = true;
                }

                if (profile.MaximumFrequency < this.cpuMinLimit) {
                    profile.MaximumFrequency = this.cpuMinLimit;
                    needsUpdate = true;
                }

                if (profile.MaximumFrequency > this.cpuMaxLimit) {
                    profile.MaximumFrequency = this.cpuMaxLimit;
                    needsUpdate = true;
                }

                if (profile.MinimumFrequency > this.cpuMaxLimit) {
                    profile.MinimumFrequency = this.cpuMaxLimit;
                    needsUpdate = true;
                }

                tmpProfiles.push(profile);
            }

            if (needsUpdate) {
                let saved = [];
                for (let p in tmpProfiles) {
                    saved.push(tmpProfiles[p].save());
                }
                this.status("Needed ID refresh, reloading");
                this.saveProfiles(saved);
                this.updateSettings(done);
            } else {
                for (let p in tmpProfiles) {
                    this.addOrUpdateProfile(tmpProfiles[p]);
                }

                if (done) {
                    done();
                }
            }
        });
    }

    // Dat is so magic, world is exploooooooding
    loadWidgets(...args) {
        for (let i in args) {
            this[args[i]] = this.Builder.get_object(args[i]);
        }
    }

    syncOrdering() {
        for (let profileContext of this.ProfilesMap.values()) {
            let index = profileContext.ListItem.Row.get_index();
            this.ProfileStack.child_set_property(profileContext.Settings.StackItem, "position", index);
        }
    }

    selectFirstProfile() {
        for (let profileContext of this.ProfilesMap.values()) {
            let index = profileContext.ListItem.Row.get_index();
            if (index === 0) {
                this.ProfilesListBox.select_row(profileContext.ListItem.Row);
                break;
            }
        }
    }

    show() {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
            let window = this.MainWidget.get_toplevel();
            let headerbar = window.get_titlebar();

            headerbar.title = _("CPU Power Manager");
            headerbar.subtitle = _("Preferences");
            headerbar.pack_start(this.AboutButton);

            return GLib.SOURCE_REMOVE;
        });

        return this.MainWidget;
    }

    addOrUpdateProfile(profile) {
        let profileContext = this.ProfilesMap.get(profile.UUID);

        if (!profileContext) {
            profileContext = {
                Profile: profile,
                Settings: {
                    StackItem: null,
                    NameEntry: null,
                    MinimumFrequencyScale: null,
                    MaximumFrequencyScale: null,
                    MinimumFrequencyValueLabel: null,
                    MaximumFrequencyValueLabel: null,
                    MinimumFrequencyAdjustment: null,
                    MaximumFrequencyAdjustment: null,
                    TurboBoostSwitch: null,
                    CpuInfoGrid: null,
                    DiscardButton: null,
                    SaveButton: null,
                    LimitMinLabel: null,
                    LimitMaxLabel: null,
                },
                ListItem: {
                    Row: null,
                    NameLabel: null,
                    MinimumFrequencyLabel: null,
                    MaximumFrequencyLabel: null,
                    TurboBoostStatusLabel: null,
                    AutoSwitchACIcon: null,
                    AutoSwitchBatIcon: null,
                },
            };

            let profileSettingsBuilder = new Gtk.Builder();
            profileSettingsBuilder.set_translation_domain("gnome-shell-extension-cpupower");
            profileSettingsBuilder.add_objects_from_file(
                GLADE_FILE,
                [
                    "ProfileSettingsGrid",
                    "MaximumFrequencyAdjustment",
                    "MinimumFrequencyAdjustment",
                ],
            );
            profileContext.Settings.NameEntry = profileSettingsBuilder.get_object(
                "ProfileNameEntry",
            );
            profileContext.Settings.MinimumFrequencyScale = profileSettingsBuilder.get_object(
                "ProfileMinimumFrequencyScale",
            );
            profileContext.Settings.MaximumFrequencyScale = profileSettingsBuilder.get_object(
                "ProfileMaximumFrequencyScale",
            );
            profileContext.Settings.TurboBoostSwitch = profileSettingsBuilder.get_object(
                "ProfileTurboBoostSwitch",
            );
            profileContext.Settings.DiscardButton = profileSettingsBuilder.get_object(
                "ProfileDiscardButton",
            );
            profileContext.Settings.SaveButton = profileSettingsBuilder.get_object(
                "ProfileSaveButton",
            );
            profileContext.Settings.StackItem = profileSettingsBuilder.get_object(
                "ProfileSettingsGrid",
            );
            profileContext.Settings.CpuInfoGrid = profileSettingsBuilder.get_object(
                "ProfileInfoGrid",
            );
            profileContext.Settings.LimitMinLabel = profileSettingsBuilder.get_object(
                "ProfileLimitMinLabel",
            );
            profileContext.Settings.LimitMaxLabel = profileSettingsBuilder.get_object(
                "ProfileLimitMaxLabel",
            );
            profileContext.Settings.MinimumFrequencyAdjustment = profileSettingsBuilder.get_object(
                "MinimumFrequencyAdjustment",
            );
            profileContext.Settings.MaximumFrequencyAdjustment = profileSettingsBuilder.get_object(
                "MaximumFrequencyAdjustment",
            );
            profileContext.Settings.MinimumFrequencyValueLabel = profileSettingsBuilder.get_object(
                "ProfileMinimumFrequencyValueLabel",
            );
            profileContext.Settings.MaximumFrequencyValueLabel = profileSettingsBuilder.get_object(
                "ProfileMaximumFrequencyValueLabel",
            );

            let profileListItemBuilder = new Gtk.Builder();
            profileListItemBuilder.set_translation_domain("gnome-shell-extension-cpupower");
            profileListItemBuilder.add_objects_from_file(GLADE_FILE, ["ProfileListBoxRow"]);
            profileContext.ListItem.NameLabel = profileListItemBuilder.get_object(
                "ProfileRowNameLabel",
            );
            profileContext.ListItem.MinimumFrequencyLabel = profileListItemBuilder.get_object(
                "ProfileRowMinimumFrequencyLabel",
            );
            profileContext.ListItem.MaximumFrequencyLabel = profileListItemBuilder.get_object(
                "ProfileRowMaximumFrequencyLabel",
            );
            profileContext.ListItem.TurboBoostStatusLabel = profileListItemBuilder.get_object(
                "ProfileRowTurboBoostStatusLabel",
            );
            profileContext.ListItem.AutoSwitchACIcon = profileListItemBuilder.get_object(
                "ProfileRowACIcon",
            );
            profileContext.ListItem.AutoSwitchBatIcon = profileListItemBuilder.get_object(
                "ProfileRowBatIcon",
            );
            profileContext.ListItem.Row = profileListItemBuilder.get_object(
                "ProfileListBoxRow",
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
            this.syncOrdering();
        } else {
            // update profile context with given profile
            profileContext.Profile = profile;
        }

        // set limit labels
        profileContext.Settings.LimitMinLabel.set_text(`${this.cpuMinLimit}%`);
        profileContext.Settings.LimitMaxLabel.set_text(`${this.cpuMaxLimit}%`);

        // modify adjustments
        profileContext.Settings.MinimumFrequencyAdjustment.set_lower(this.cpuMinLimit);
        profileContext.Settings.MinimumFrequencyAdjustment.set_upper(profileContext.Profile.MaximumFrequency);
        profileContext.Settings.MaximumFrequencyAdjustment.set_lower(profileContext.Profile.MinimumFrequency);
        profileContext.Settings.MaximumFrequencyAdjustment.set_upper(this.cpuMaxLimit);

        profileContext.Settings.MinimumFrequencyScale.set_value(profileContext.Profile.MinimumFrequency);
        profileContext.Settings.MaximumFrequencyScale.set_value(profileContext.Profile.MaximumFrequency);
        profileContext.Settings.MinimumFrequencyValueLabel.set_text(
            `${profileContext.Profile.MinimumFrequency}%`,
        );
        profileContext.Settings.MaximumFrequencyValueLabel.set_text(
            `${profileContext.Profile.MaximumFrequency}%`,
        );

        profileContext.Settings.NameEntry.set_text(profileContext.Profile.Name);
        profileContext.Settings.TurboBoostSwitch.set_active(profileContext.Profile.TurboBoost);
        profileContext.ListItem.NameLabel.set_text(profileContext.Profile.Name);
        profileContext.ListItem.MinimumFrequencyLabel.set_text(profileContext.Profile.MinimumFrequency.toString());
        profileContext.ListItem.MaximumFrequencyLabel.set_text(profileContext.Profile.MaximumFrequency.toString());
        profileContext.ListItem.TurboBoostStatusLabel.set_text(profileContext.Profile.TurboBoost ? _("Yes") : _("No"));

        if (this.settings.get_string("default-ac-profile") === profileContext.Profile.UUID) {
            profileContext.ListItem.AutoSwitchACIcon.set_visible(true);
        } else {
            profileContext.ListItem.AutoSwitchACIcon.set_visible(false);
        }

        if (this.settings.get_string("default-battery-profile") === profileContext.Profile.UUID) {
            profileContext.ListItem.AutoSwitchBatIcon.set_visible(true);
        } else {
            profileContext.ListItem.AutoSwitchBatIcon.set_visible(false);
        }

        profileContext.Settings.DiscardButton.sensitive = false;
        profileContext.Settings.SaveButton.sensitive = false;

        this.ProfilesListBox.sensitive = true;
        this.ProfilesAddToolButton.sensitive = true;
        this.ProfilesRemoveToolButton.sensitive = true;
        this.ProfilesMoveUpToolButton.sensitive = true;
        this.ProfilesMoveDownToolButton.sensitive = true;
    }

    removeProfile(profile) {
        let profileContext = this.ProfilesMap.get(profile.UUID);

        // set default profile to none if the removed profile was selected
        if (this.DefaultACComboBox.get_active_id() === profileContext.Profile.UUID) {
            this.settings.set_string("default-ac-profile", "");
        }
        if (this.DefaultBatComboBox.get_active_id() === profileContext.Profile.UUID) {
            this.settings.set_string("default-battery-profile", "");
        }

        this.ProfilesListBox.remove(profileContext.ListItem.Row);
        this.ProfileStack.remove(profileContext.Settings.StackItem);
        this.ProfilesMap.delete(profile.UUID);
        this.syncOrdering();
    }

    setProfileIndex(profile, index) {
        let profileContext = this.ProfilesMap.get(profile.UUID);
        let profileCount = this.ProfilesMap.length;
        index = index >= profileContext ? profileCount - 1 : index;
        this.ProfilesListBox.remove(profileContext.ListItem.Row);
        this.ProfilesListBox.insert(profileContext.ListItem.Row, index);
        this.syncOrdering();
    }

    getProfileIndex(profile) {
        let profileContext = this.ProfilesMap.get(profile.UUID);
        return profileContext.ListItem.Row.get_index();
    }

    getSelectedProfileContext() {
        let selectedRow = this.ProfilesListBox.get_selected_rows()[0];
        let profileContext;

        for (let profCtx of this.ProfilesMap.values()) {
            if (profCtx.ListItem.Row === selectedRow) {
                profileContext = profCtx;
                break;
            }
        }
        return profileContext;
    }

    onMainWidgetSwitchPage(mainWidget) {
        if (mainWidget.get_current_page() === 1) {
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
        profileArray.sort((p1, p2) => this.getProfileIndex(p1.Profile) - this.getProfileIndex(p2.Profile));
        for (let i in profileArray) {
            let profile = profileArray[i].Profile;

            this.DefaultACComboBox.append(profile.UUID, profile.Name);
            this.DefaultBatComboBox.append(profile.UUID, profile.Name);
        }

        let id = this.settings.get_string("default-ac-profile");
        this.DefaultACComboBox.set_active_id(id);

        id = this.settings.get_string("default-battery-profile");
        this.DefaultBatComboBox.set_active_id(id);
    }

    loadBackendsComboBox() {
        let liststore = this.FrequencyScalingDriverListStore;
        let combobox = this.FrequencyScalingDriverComboBox;
        let backend = this.settings.get_string("cpufreqctl-backend");
        liststore.clear();
        Cpufreqctl.backends.automatic((result) => {
            let iter = liststore.append();
            let chosenBackend = result.response;
            if (!result.ok) {
                chosenBackend = _("unavailable");
            }
            liststore.set(
                iter,
                [0, 1, 2],
                [`${_("Automatic")} (${chosenBackend})`, "automatic", true],
            );
            Cpufreqctl.backends.list(backend, (result) => {
                if (!result.ok) {
                    return;
                }
                for (const backend in result.response) {
                    const supported = result.response[backend];
                    iter = liststore.append();
                    liststore.set(
                        iter,
                        [0, 1, 2],
                        [backend, backend, supported],
                    );
                }
                combobox.set_active_id(backend);
            });
        });
    }

    onMainWidgetRealize(mainWidget) {
        mainWidget.expand = true;
        mainWidget.parent.border_width = 0;

        this.settings = Convenience.getSettings(SETTINGS_SCHEMA);
        this.settings.connect("changed", this.updateSettings.bind(this, null));
        this.updateSettings(() => {
            this.refreshAutoSwitchComboBoxes();
            this.selectFirstProfile();
            this.loadBackendsComboBox();
        });
    }

    onShowCurrentFrequencySwitchActiveNotify(switchButton) {
        let state = switchButton.active;
        this.settings.set_boolean("show-freq-in-taskbar", state);
        this.status(`ShowCurrentFrequency: ${state}`);
    }

    onUseGHzInsteadOfMHzSwitchActiveNotify(switchButton) {
        let state = switchButton.active;
        this.settings.set_boolean("taskbar-freq-unit-ghz", state);
        this.status(`UseGHzInsteadOfMHz: ${state}`);
    }

    onShowIconSwitchActiveNotify(switchButton) {
        let state = switchButton.active;
        this.settings.set_boolean("show-icon-in-taskbar", state);
        this.status(`ShowIcon: ${state}`);
    }

    onShowArrowSwitchActiveNotify(switchButton) {
        let state = switchButton.active;
        this.settings.set_boolean("show-arrow-in-taskbar", state);
        this.status(`ShowArrow: ${state}`);
    }

    onShowFrequencyAsComboBoxActiveNotify(comboBox) {
        let state = comboBox.get_active_id();
        this.settings.set_string("frequency-sampling-mode", state);
        this.status(`ShowFrequencyAs: ${state}`);
    }

    onFrequencyScalingDriverComboBoxActiveNotify(comboBox) {
        let oldBackend = this.settings.get_string("cpufreqctl-backend");
        let state = comboBox.get_active_id();
        this.settings.set_string("cpufreqctl-backend", state);
        this.status(`FrequencyScalingDriver: ${state}`);

        if (oldBackend !== state) {
            Cpufreqctl.reset(oldBackend, (result) => {
                if (!result.ok) {
                    this.status(`Failed to reset frequency scaling driver of old backend ${oldBackend}: ` +
                                `${Cpufreqctl.exitCodeToString(result.exitCode)}`);
                }
            });
        }
    }

    onDefaultACComboBoxActiveNotify(comboBox) {
        let id = comboBox.get_active_id();
        this.settings.set_string("default-ac-profile", id);
        this.status(`Default AC profile: ${comboBox.get_active_text()}`);
    }

    onDefaultBatComboBoxActiveNotify(comboBox) {
        let id = comboBox.get_active_id();
        this.settings.set_string("default-battery-profile", id);
        this.status(`Default battery profile: ${comboBox.get_active_text()}`);
    }

    onProfilesAddToolButtonClicked(_button) {
        this.addOrUpdateProfile(new CPUFreqProfile());
        this.saveOrderedProfileList();
    }

    onProfilesRemoveToolButtonClicked(_button) {
        let profileContext = this.getSelectedProfileContext();
        if (profileContext) {
            this.removeProfile(profileContext.Profile);
        }
        this.saveOrderedProfileList();
    }

    onProfilesMoveUpToolButtonClicked(_button) {
        let profileContext = this.getSelectedProfileContext();
        if (profileContext) {
            let index = profileContext.ListItem.Row.get_index() - 1;
            index = index < 0 ? 0 : index;
            this.setProfileIndex(profileContext.Profile, index);
        }
        this.saveOrderedProfileList();
    }

    onProfilesMoveDownToolButtonClicked(_button) {
        let profileContext = this.getSelectedProfileContext();
        if (profileContext) {
            let index = profileContext.ListItem.Row.get_index() + 1;
            this.setProfileIndex(profileContext.Profile, index);
        }
        this.saveOrderedProfileList();
    }

    onAboutButtonClicked(_button) {
        let aboutBuilder = new Gtk.Builder();
        aboutBuilder.set_translation_domain("gnome-shell-extension-cpupower");
        aboutBuilder.add_objects_from_file(GLADE_FILE, ["AboutDialog"]);
        let dialog = aboutBuilder.get_object("AboutDialog");
        let parentWindow = this.MainWidget.get_toplevel();
        dialog.set_transient_for(parentWindow);
        dialog.run();
        dialog.hide();
    }

    onUninstallButtonClicked(_button) {
        let uninstallDialogBuilder = new Gtk.Builder();
        uninstallDialogBuilder.set_translation_domain("gnome-shell-extension-cpupower");
        uninstallDialogBuilder.add_objects_from_file(GLADE_FILE, ["UninstallMessageDialog"]);
        let dialog = uninstallDialogBuilder.get_object("UninstallMessageDialog");
        let uninstallButton = uninstallDialogBuilder.get_object("UninstallDialogUninstall");
        let cancelButton = uninstallDialogBuilder.get_object("UninstallDialogCancel");
        let parentWindow = this.MainWidget.get_toplevel();
        dialog.set_transient_for(parentWindow);

        uninstallButton.connect("clicked", () => {
            attemptUninstallation((_success) => {
                dialog.close();

                if (this.cpupowerConnection) {
                    log("reloading extension");
                    let result = this.cpupowerService.emit_signal("ExtensionReloadRequired", null);
                    log(`emit signal result: ${result}`);
                } else {
                    // hmm... extension seems not to be running, so who cares?
                    log("Could not trigger extension reload as dbus connection is offline!");
                }

                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
                    parentWindow.close();
                    return GLib.SOURCE_REMOVE;
                });
            });
        });
        cancelButton.connect("clicked", () => {
            dialog.close();
        });
        dialog.run();
        dialog.hide();
    }

    showCpuLimitInfo(profileContext) {
        if (profileContext.Settings.MinimumFrequencyScale.get_value() === this.cpuMinLimit ||
            profileContext.Settings.MaximumFrequencyScale.get_value() === this.cpuMaxLimit) {
            profileContext.Settings.CpuInfoGrid.set_visible(true);
        } else {
            profileContext.Settings.CpuInfoGrid.set_visible(false);
        }
    }

    onProfilesListBoxRowSelected(_box, _row) {
        let profileContext = this.getSelectedProfileContext();
        if (profileContext) {
            this.ProfileStack.set_visible_child(profileContext.Settings.StackItem);
        }
    }

    onProfileNameEntryChanged(profileContext, entry) {
        let changed = profileContext.Profile.Name !== entry.get_text();

        if (changed) {
            profileContext.Settings.DiscardButton.sensitive = true;
            profileContext.Settings.SaveButton.sensitive = true;

            this.ProfilesListBox.sensitive = false;
            this.ProfilesAddToolButton.sensitive = false;
            this.ProfilesRemoveToolButton.sensitive = false;
            this.ProfilesMoveUpToolButton.sensitive = false;
            this.ProfilesMoveDownToolButton.sensitive = false;
        }
    }

    onProfileMinimumFrequencyScaleValueChanged(profileContext, scale) {
        let changed = profileContext.Profile.MinimumFrequency !== scale.get_value();

        if (changed) {
            profileContext.Settings.DiscardButton.sensitive = true;
            profileContext.Settings.SaveButton.sensitive = true;
            profileContext.Settings.MaximumFrequencyAdjustment.set_lower(scale.get_value());
            profileContext.Settings.MinimumFrequencyValueLabel.set_text(`${scale.get_value()}%`);

            this.showCpuLimitInfo(profileContext);

            this.ProfilesListBox.sensitive = false;
            this.ProfilesAddToolButton.sensitive = false;
            this.ProfilesRemoveToolButton.sensitive = false;
            this.ProfilesMoveUpToolButton.sensitive = false;
            this.ProfilesMoveDownToolButton.sensitive = false;
        }
    }

    onProfileMaximumFrequencyScaleValueChanged(profileContext, scale) {
        let changed = profileContext.Profile.MaximumFrequency !== scale.get_value();

        if (changed) {
            profileContext.Settings.DiscardButton.sensitive = true;
            profileContext.Settings.SaveButton.sensitive = true;
            profileContext.Settings.MinimumFrequencyAdjustment.set_upper(scale.get_value());
            profileContext.Settings.MaximumFrequencyValueLabel.set_text(`${scale.get_value()}%`);

            this.showCpuLimitInfo(profileContext);

            this.ProfilesListBox.sensitive = false;
            this.ProfilesAddToolButton.sensitive = false;
            this.ProfilesRemoveToolButton.sensitive = false;
            this.ProfilesMoveUpToolButton.sensitive = false;
            this.ProfilesMoveDownToolButton.sensitive = false;
        }
    }

    onProfileTurboBoostSwitchActiveNotify(profileContext, switchButton) {
        let changed = profileContext.Profile.TurboBoost !== switchButton.get_active();

        if (changed) {
            profileContext.Settings.DiscardButton.sensitive = true;
            profileContext.Settings.SaveButton.sensitive = true;

            this.ProfilesListBox.sensitive = false;
            this.ProfilesAddToolButton.sensitive = false;
            this.ProfilesRemoveToolButton.sensitive = false;
            this.ProfilesMoveUpToolButton.sensitive = false;
            this.ProfilesMoveDownToolButton.sensitive = false;
        }
    }

    onProfileDiscardButtonClicked(profileContext, _button) {
        this.addOrUpdateProfile(profileContext.Profile);
    }

    onProfileSaveButtonClicked(profileContext, _button) {
        let name = profileContext.Settings.NameEntry.get_text();
        let minimumFrequency = profileContext.Settings.MinimumFrequencyScale.get_value();
        let maximumFrequency = profileContext.Settings.MaximumFrequencyScale.get_value();
        let turboBoost = profileContext.Settings.TurboBoostSwitch.get_active();

        profileContext.Profile.Name = name;
        profileContext.Profile.MinimumFrequency = minimumFrequency;
        profileContext.Profile.MaximumFrequency = maximumFrequency;
        profileContext.Profile.TurboBoost = turboBoost;

        this.addOrUpdateProfile(profileContext.Profile);
        this.saveOrderedProfileList();
    }

    saveOrderedProfileList() {
        let saved = [];
        for (let value of this.ProfilesMap.entries()) {
            this.status(`value: ${value[0]}${value[1]}`);
            let idx = this.ProfilesMap.size - 1 - this.getProfileIndex(value[1].Profile);
            this.status(`Saving: ${value[1].Profile.UUID} to idx ${idx}`);
            saved[idx] = value[1].Profile.save();
        }

        this.saveProfiles(saved);
    }

    saveProfiles(saved) {
        saved = GLib.Variant.new("a(iibss)", saved);
        this.settings.set_value("profiles", saved);
    }
};
