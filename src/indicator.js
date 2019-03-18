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

const Gettext = imports.gettext.domain('gnome-shell-extension-cpupower');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const CPUFreqProfile = Me.imports.src.profile.CPUFreqProfile;
const baseindicator = Me.imports.src.baseindicator;
const CPUFreqProfileButton = Me.imports.src.profilebutton.CPUFreqProfileButton;

const LASTSETTINGS = GLib.get_user_cache_dir() + '/cpupower.last-settings';
const CPUFREQCTL = Me.dir.get_path() + '/src/cpufreqctl';
const PKEXEC = GLib.find_program_in_path('pkexec');

var CPUFreqIndicator = class CPUFreqIndicator extends baseindicator.CPUFreqBaseIndicator {
    constructor() {
        super();
        this.cpufreq = 800;
        this.cpucount = 0;
        this.isTurboBoostActive = true;
        this.minVal = this._getMinCheck();
        this.maxVal = 100;

        // read the cached settings file.
        if(GLib.file_test(LASTSETTINGS, GLib.FileTest.EXISTS))
        {
            let lines = Shell.get_file_contents_utf8_sync(LASTSETTINGS).split('\n');
            if(lines.length > 2)
            {
                this.minVal = parseInt(lines[0]);
                this.maxVal = parseInt(lines[1]);
                this.isTurboBoostActive = (lines[2].indexOf('true') > -1);

                this._updateMin();
                this._updateMax();
                this._updateTurbo();
            }
        } else {
            global.log('Cached last settings not found: ' + LASTSETTINGS);
        }

        this._updateFreqMm(true);
        this.createMenu();
    }

    enable() {
        this._power = Main.panel.statusArea["aggregateMenu"]._power;
        this._power_state = this._power._proxy.State;
        this._powerConnectSignalId = this._power._proxy.connect(
            'g-properties-changed',
            this._onPowerChanged.bind(this)
        );

        super.enable();
        this.timeout = Mainloop.timeout_add_seconds(1, () => this._updateFreq());
        this.timeout_mm = Mainloop.timeout_add_seconds(1, () => this._updateFreqMm(false));
    }

    _onPowerChanged() {
        let new_state = this._power._proxy.State;

        if (new_state != this._power_state)
        {
            if (new_state === UPower.DeviceState.FULLY_CHARGED)
            {
                global.log ("Power state changed: fully charged");
            }
            else if (new_state === UPower.DeviceState.DISCHARGING)
            {
                global.log ("Power state changed: discharging");
            }
            else if (new_state === UPower.DeviceState.CHARGING)
            {
                global.log ("Power state changed: charging");
            }
        }

        this._power_state = new_state;
    }

    createMenu() {
        super.createMenu();

        this.lblActive = (this.settings.get_boolean('show-freq-in-taskbar'));
        this.lblUnit = (this.settings.get_boolean('taskbar-freq-unit-ghz'));

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

        this.imSliderMin = new PopupMenu.PopupBaseMenuItem({activate: false});
        this.minSlider = new Slider.Slider(this.minVal / 100);
        this.minSlider.connect('value-changed', item => {
            this.minVal = Math.floor(item.value * 100);
            this.imMinLabel.set_text(this._getMinText());
            this._updateMin();
        });
        this.imSliderMin.actor.add(this.minSlider.actor, {expand: true});

        this.imSliderMax = new PopupMenu.PopupBaseMenuItem({activate: false});
        this.maxSlider = new Slider.Slider(this.maxVal / 100);
        this.maxSlider.connect('value-changed', item => {
            this.maxVal = Math.floor(item.value * 100);
            this.imMaxLabel.set_text(this._getMaxText());
            this._updateMax();
        });
        this.imSliderMax.actor.add(this.maxSlider.actor, {expand: true});

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
        let cmd = Math.floor(this.minVal) + '\n' + Math.floor(this.maxVal) + '\n' + (this.isTurboBoostActive ? 'true':'false') + '\n';
        // global.log('Updating cpufreq settings cache file: ' + LASTSETTINGS);
        GLib.file_set_contents(LASTSETTINGS, cmd);
    }

    _updateMax() {
        let cmd = [PKEXEC, CPUFREQCTL, 'max', Math.floor(this.maxVal).toString()].join(' ');
        Util.trySpawnCommandLine(cmd);
        this._updateFile();
    }

    _updateMin() {
        let cmd = [PKEXEC, CPUFREQCTL, 'min', Math.floor(this.minVal).toString()].join(' ');
        Util.trySpawnCommandLine(cmd);
        this._updateFile();
    }

    _updateTurbo() {
        let cmd = [PKEXEC, CPUFREQCTL, 'turbo', (this.isTurboBoostActive ? '1' : '0')].join(' ');
        Util.trySpawnCommandLine(cmd);
        this._updateFile();
    }

    _updateUi() {
        this.imMinLabel.set_text(this._getMinText());
        this.minSlider.setValue(this.minVal / 100.0);

        this.imMaxLabel.set_text(this._getMaxText());
        this.maxSlider.setValue(this.maxVal / 100.0);

        this.imTurboSwitch.setToggleState(this.isTurboBoostActive);
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

                // global.log("Sampled freq for cpu#" + n + ": " + contents);

                if(success) curfreq = parseInt(String.fromCharCode.apply(null, contents)) / 1000;
                this.cpufreq = curfreq;
            });
        }

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

        if(this.menu && !this.menu.isOpen) this.imCurrentLabel.set_text(this._getCurFreq());
        this.lbl.set_text(this.lblActive ? this._getCurFreq() : '');

        return true;
    }

    _updateFreqMm(force) {
        const menuOpen = this.menu && !this.menu.isOpen;
        if(force || menuOpen) return true;

        let [res, out] = GLib.spawn_command_line_sync(CPUFREQCTL + ' turbo get');
        this.isTurboBoostActive = parseInt(String.fromCharCode.apply(null, out)) == 1;

        [res, out] = GLib.spawn_command_line_sync(CPUFREQCTL + ' min get');
        this.minVal = parseInt(String.fromCharCode.apply(null, out));

        [res, out] = GLib.spawn_command_line_sync(CPUFREQCTL + ' max get');
        this.maxVal = parseInt(String.fromCharCode.apply(null, out));
        if (menuOpen) {
            this._updateUi();
        }
        return true;
    }

    _getMinCheck() {
        let [res, out, err, exitcode] = GLib.spawn_command_line_sync(PKEXEC + ' ' + CPUFREQCTL + ' min check');
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
            return this.cpufreq.toString() + 'MHz';
    }

    _onPreferencesActivate(item) {
        Util.trySpawnCommandLine('gnome-shell-extension-prefs cpupower@mko-sl.de'); //ensure this will get logged
        return 0;
    }
}

