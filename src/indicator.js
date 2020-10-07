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

const St = imports.gi.St;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;
const Shell = imports.gi.Shell;
const UPower = imports.gi.UPowerGlib;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Config = imports.misc.config;

const Gettext = imports.gettext.domain('gnome-shell-extension-cpupower');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const CPUFreqProfile = Me.imports.src.profile.CPUFreqProfile;
const baseindicator = Me.imports.src.baseindicator;
const CPUFreqProfileButton = Me.imports.src.profilebutton.CPUFreqProfileButton;

const LASTSETTINGS = GLib.get_user_cache_dir() + '/cpupower.last-settings';
const PKEXEC = GLib.find_program_in_path('pkexec');
const CONFIG = Me.imports.src.config;

var CPUFreqIndicator = class CPUFreqIndicator extends baseindicator.CPUFreqBaseIndicator {
    constructor() {
        super();
        this.cpufreq = 800;
        this.cpucount = 0;
        this.isTurboBoostActive = true;
        this.isAutoSwitchActive = true;
        this.minVal = this._getMinCheck();
        this.maxVal = 100;

        // read the cached settings file.
        if(GLib.file_test(LASTSETTINGS, GLib.FileTest.EXISTS))
        {
            let lines = Shell.get_file_contents_utf8_sync(LASTSETTINGS).split('\n');
            if(lines.length > 3)
            {
                this.minVal = parseInt(lines[0]);
                this.maxVal = parseInt(lines[1]);
                this.isTurboBoostActive = (lines[2].indexOf('true') > -1);
                this.isAutoSwitchActive = (lines[3].indexOf('true') > -1);

                this._updateMin();
                this._updateMax();
                this._updateTurbo();
                this._updateAutoSwitch();
            }
        } else {
            log('Cached last settings not found: ' + LASTSETTINGS);
        }

        this._updateFreqMm(true);
        this.createIndicator();
        this.createMenu();
    }

    enable() {
        this._power = Main.panel.statusArea["aggregateMenu"]._power;
        this._power_state = this._power._proxy.State;
        this._powerConnectSignalId = this._power._proxy.connect(
            'g-properties-changed',
            this._onPowerChanged.bind(this)
        );
        // select the right profile at login
        this.powerActions(this._power_state);

        super.enable();
        this.timeout = Mainloop.timeout_add_seconds(1, () => this._updateFreq());
        this.timeout_mm = Mainloop.timeout_add_seconds(1, () => this._updateFreqMm(false));
    }

    _onPowerChanged() {
        let new_state = this._power._proxy.State;

        if (new_state != this._power_state)
        {
            this.powerActions(new_state);
        }

        this._power_state = new_state;
    }

    powerActions(powerState) {
        if (powerState === UPower.DeviceState.DISCHARGING)
        {
            log ("Power state changed: discharging");
            // switch to battery profile if auto switching is enabled
            if (this.isAutoSwitchActive)
            {
                let defaultBatProfileID = this.settings.get_string("default-battery-profile");
                for(var i = 0; i < this.profiles.length && defaultBatProfileID != ""; i++)
                {
                    if (this.profiles[i].Profile.UUID == defaultBatProfileID)
                    {
                        this._applyProfile(this.profiles[i].Profile);
                        break;
                    }
                }
            }
        }
        else if (powerState === UPower.DeviceState.CHARGING ||
            powerState === UPower.DeviceState.FULLY_CHARGED)
        {
            if (powerState === UPower.DeviceState.CHARGING)
                log ("Power state changed: charging");
            else
                log ("Power state changed: fully charged");
            // switch to AC profile if auto switching is enabled
            if (this.isAutoSwitchActive)
            {
                let defaultACProfileID = this.settings.get_string("default-ac-profile");
                for(var i = 0; i < this.profiles.length && defaultACProfileID != ""; i++)
                {
                    if (this.profiles[i].Profile.UUID == defaultACProfileID)
                    {
                        this._applyProfile(this.profiles[i].Profile);
                        break;
                    }
                }
            }
        }
    }

    createMenu() {
        super.createMenu();

        let _profiles = this.settings.get_value('profiles');
        _profiles = _profiles.deep_unpack();
        this.profiles = [];
        for(var j = 0; j < _profiles.length; j++)
        {
            var profile = new CPUFreqProfile();
            profile.load(_profiles[j]);
            var profileButton = new CPUFreqProfileButton(profile);
            this.profiles.push(profileButton);
        }
        this.profiles.reverse();

        this.imMinTitle = new PopupMenu.PopupMenuItem(_('Minimum Frequency:'), {reactive: false});
        this.imMinLabel = new St.Label({text: this._getMinText()});
        this.imMinTitle.actor.add_child(this.imMinLabel);

        this.imMaxTitle = new PopupMenu.PopupMenuItem(_('Maximum Frequency:'), {reactive: false});
        this.imMaxLabel = new St.Label({text: this._getMaxText()});
        this.imMaxTitle.actor.add_child(this.imMaxLabel);

        this.imTurboSwitch = new PopupMenu.PopupSwitchMenuItem(_('Turbo Boost:'), this.isTurboBoostActive);
        this.imTurboSwitch.connect('toggled', item => {
            this.isTurboBoostActive = item.state;
            this._updateTurbo();
        });

        this.imAutoSwitch = new PopupMenu.PopupSwitchMenuItem(_('Auto Switch:'), this.isAutoSwitchActive);
        this.imAutoSwitch.connect('toggled', item => {
            this.isAutoSwitchActive = item.state;
            this._updateAutoSwitch();
        });

        this.imSliderMin = new PopupMenu.PopupBaseMenuItem({activate: false});
        this.minSlider = new Slider.Slider(this.minVal / 100);
        this.minSlider.x_expand = true;
        this.minSlider.connect(parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.32 ? 'notify::value' : 'value-changed', item => {
            this.minVal = Math.floor(item.value * 100);
            this.imMinLabel.set_text(this._getMinText());
            this._updateMin();
        });

        if (parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.32) {
            this.imSliderMin.add_child(this.minSlider);
        } else {
            this.imSliderMin.actor.add(this.minSlider.actor, {expand: true});
        }

        this.imSliderMax = new PopupMenu.PopupBaseMenuItem({activate: false});
        this.maxSlider = new Slider.Slider(this.maxVal / 100);
        this.maxSlider.x_expand = true;
        this.maxSlider.connect(parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.32 ? 'notify::value' : 'value-changed', item => {
            this.maxVal = Math.floor(item.value * 100);
            this.imMaxLabel.set_text(this._getMaxText());
            this._updateMax();
        });

        if (parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.32) {
            this.imSliderMax.add_child(this.maxSlider);
        } else {
            this.imSliderMax.actor.add(this.maxSlider.actor, {expand: true});
        }

        this.imCurrentTitle = new PopupMenu.PopupMenuItem(_('Current Frequency:'), {reactive:false});
        this.imCurrentLabel = new St.Label({text: this._getCurFreq()});
        this.imCurrentTitle.actor.add_child(this.imCurrentLabel);

        this.section.addMenuItem(this.imMinTitle);
        this.section.addMenuItem(this.imSliderMin);
        this.section.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.section.addMenuItem(this.imMaxTitle);
        this.section.addMenuItem(this.imSliderMax);
        this.section.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.section.addMenuItem(this.imTurboSwitch);
        this.section.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.section.addMenuItem(this.imCurrentTitle);
        this.section.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        for(var i = 0; i < this.profiles.length; i++)
        {
            this.profiles[i].connect('activate', item => this._applyProfile(item.Profile));
            this.section.addMenuItem(this.profiles[i]);
        }

        this.section.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.section.addMenuItem(this.imAutoSwitch);
        this.section.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.imPrefsBtn = new PopupMenu.PopupMenuItem(_('Preferences'));
        this.imPrefsBtn.connect('activate', this._onPreferencesActivate.bind(this));
        this.section.addMenuItem(this.imPrefsBtn);
    }

    _applyProfile(profile) {
        this.minVal = profile.MinimumFrequency;
        this._updateMin();

        this.maxVal = profile.MaximumFrequency;
        this._updateMax();

        this.isTurboBoostActive = profile.TurboBoost;
        this._updateTurbo();

        this._updateUi();
    }

    disable() {
        this._power._proxy.disconnect(this._powerConnectSignalId);
        super.disable();
        Mainloop.source_remove(this.timeout);
        Mainloop.source_remove(this.timeout_mm);
    }

    _getMinText() {
        return Math.floor(this.minVal).toString() + '%';
    }

    _getMaxText() {
        return Math.floor(this.maxVal).toString() + '%';
    }

    _updateFile() {
        if(this.menu && !this.menu.isOpen) return;
        let cmd = Math.floor(this.minVal) + '\n' + Math.floor(this.maxVal) + '\n' 
            + (this.isTurboBoostActive ? 'true':'false') + '\n' 
            + (this.isAutoSwitchActive ? 'true':'false') + '\n';
        // log('Updating cpufreq settings cache file: ' + LASTSETTINGS);
        GLib.file_set_contents(LASTSETTINGS, cmd);
    }

    _updateMax() {
        let cmd = [PKEXEC, CONFIG.CPUFREQCTL, 'max', Math.floor(this.maxVal).toString()].join(' ');
        Util.trySpawnCommandLine(cmd);
        this._updateFile();
    }

    _updateMin() {
        let cmd = [PKEXEC, CONFIG.CPUFREQCTL, 'min', Math.floor(this.minVal).toString()].join(' ');
        Util.trySpawnCommandLine(cmd);
        this._updateFile();
    }

    _updateTurbo() {
        let cmd = [PKEXEC, CONFIG.CPUFREQCTL, 'turbo', (this.isTurboBoostActive ? '1' : '0')].join(' ');
        Util.trySpawnCommandLine(cmd);
        this._updateFile();
    }

    _updateAutoSwitch() {
        if (this._power_state) this.powerActions(this._power_state);
        this._updateFile();
    }

    _updateUi() {
        this.imMinLabel.set_text(this._getMinText());
        parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.32
            ? this.minSlider.value = this.minVal / 100.0
            : this.minSlider.setValue(this.minVal / 100.0);

        this.imMaxLabel.set_text(this._getMaxText());
        parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.32
            ? this.maxSlider.value = this.maxVal / 100.0
            : this.maxSlider.setValue(this.maxVal / 100.0);

        this.imTurboSwitch.setToggleState(this.isTurboBoostActive);
        this.imAutoSwitch.setToggleState(this.isAutoSwitchActive);
        for (let p of this.profiles) {
            p.setOrnament(
                this.minVal === p.Profile.MinimumFrequency && 
                this.maxVal === p.Profile.MaximumFrequency &&
                this.isTurboBoostActive === p.Profile.TurboBoost ? 
                PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE
            );
        }
    }

    _sampleFreq() {
        let getrand = (min, max) => {
            return Math.floor(Math.random() * (max - min)) + min;
        };

        let getfreq = n => {
            let p = '/sys/devices/system/cpu/cpu' + n + '/cpufreq/scaling_cur_freq';
            let f = Gio.file_new_for_path(p);

            f.load_contents_async(null, (obj, res) => {
                let curfreq = this.cpufreq;
                let [success, contents] = obj.load_contents_finish(res);
                if (!success) {
                    return;
                }

                // log("Sampled freq for cpu#" + n + ": " + contents);

                if(success) curfreq = parseInt(String.fromCharCode.apply(null, contents)) / 1000;
                this.cpufreq = curfreq;
            });
        };

        getfreq(getrand(0, this.cpucount));
    }

    _updateFreq() {
        if(this.cpucount == 0) {
            let lines = Shell.get_file_contents_utf8_sync('/proc/cpuinfo').split('\n');
            for (let line of lines) {
                if(line.search(/cpu mhz/i) < 0)
                    continue;

                this.cpucount++;
            }
        }
        this._sampleFreq();

        if(this.menu && this.menu.isOpen) this.imCurrentLabel.set_text(this._getCurFreq());
        this.lbl.set_text(this._getCurFreq());

        return true;
    }

    _updateFreqMm(force) {
        const menuOpen = this.menu && this.menu.isOpen;
        if (!force && !menuOpen) return true;

        let [res, out] = GLib.spawn_command_line_sync(CONFIG.CPUFREQCTL + ' turbo get');
        this.isTurboBoostActive = parseInt(String.fromCharCode.apply(null, out)) == 1;

        [res, out] = GLib.spawn_command_line_sync(CONFIG.CPUFREQCTL + ' min get');
        this.minVal = parseInt(String.fromCharCode.apply(null, out));

        [res, out] = GLib.spawn_command_line_sync(CONFIG.CPUFREQCTL + ' max get');
        this.maxVal = parseInt(String.fromCharCode.apply(null, out));
        if (menuOpen) {
            this._updateUi();
        }
        return true;
    }

    _getMinCheck() {
        let [res, out, err, exitcode] = GLib.spawn_command_line_sync(PKEXEC + ' ' + CONFIG.CPUFREQCTL + ' min check');
        if (exitcode !== 0) {
            return 0;
        }
        const str = String.fromCharCode.apply(null, out);
        return parseInt(str);
    }

    _getCurFreq() {
        if(this.lblUnit)
            return (this.cpufreq.toString() / 1000).toFixed(2) + 'GHz';
        else
            return Math.round(this.cpufreq.toString()) + 'MHz';
    }

    _onPreferencesActivate(item) {
        if (parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.32) {
            Util.trySpawnCommandLine('gnome-extensions prefs cpupower@mko-sl.de');
        } else {
            Util.trySpawnCommandLine('gnome-shell-extension-prefs cpupower@mko-sl.de');
        }
        return 0;
    }
}

