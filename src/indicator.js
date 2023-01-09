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
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;
const Shell = imports.gi.Shell;
const UPower = imports.gi.UPowerGlib;
const Config = imports.misc.config;

const Gettext = imports.gettext.domain("gnome-shell-extension-cpupower");
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const EXTENSIONDIR = Me.dir.get_path();
const utils = Me.imports.src.utils;
const Cpufreqctl = Me.imports.src.utils.Cpufreqctl;

const Slider = Me.imports.src.slider2;
const CPUFreqProfile = Me.imports.src.profile.CPUFreqProfile;
const baseindicator = Me.imports.src.baseindicator;
const CPUFreqProfileButton = Me.imports.src.profilebutton.CPUFreqProfileButton;

const LASTSETTINGS = `${GLib.get_user_cache_dir()}/cpupower.last-settings`;

/* exported CPUFreqIndicator */
var CPUFreqIndicator = class CPUFreqIndicator extends baseindicator.CPUFreqBaseIndicator {
  constructor(onConstructed) {
    super();
    this.cpufreq = 800;
    this.cpucount = 0;
    this.isTurboBoostActive = true;
    this.isAutoSwitchActive = true;
    this.minVal = 0;
    this.maxVal = 100;

    // read the cached settings file.
    if (GLib.file_test(LASTSETTINGS, GLib.FileTest.EXISTS)) {
      let lines = Shell.get_file_contents_utf8_sync(LASTSETTINGS).split("\n");
      if (lines.length > 3) {
        this.minVal = parseInt(lines[0]);
        this.maxVal = parseInt(lines[1]);
        this.isTurboBoostActive = lines[2].indexOf("true") > -1;
        this.isAutoSwitchActive = lines[3].indexOf("true") > -1;

        log(
          `Loaded old settings: { minVal: ${this.minVal}, maxVal: ${this.maxVal}, isTurboBoostActive: ${this.isTurboBoostActive}, isAutoSwitchActive: ${this.isAutoSwitchActive} }`
        );

        this.updateMin();
        this.updateMax();
        this.updateTurbo();
        this.updateAutoSwitch();
      }
    } else {
      log(`Cached last settings not found: ${LASTSETTINGS}`);
    }

    this.createIndicator();

    this.checkFrequencies((result) => {
      this.cpuMinLimit = result.min;
      this.cpuMaxLimit = result.max;
      this.createMenu();
      this.updateFreqMinMax(true);

      if (onConstructed) {
        onConstructed(this);
      }
    });
  }

  onSettingsChanged() {
    this.checkFrequencies((result) => {
      this.cpuMinLimit = result.min;
      this.cpuMaxLimit = result.max;
      this.createIndicator();
      this.createMenu();
      this.updateFreqMinMax(true);
    });
  }

  enable() {
    const Config = imports.misc.config;
    if (parseInt(Config.PACKAGE_VERSION) >= 43) {
      this.power =
        Main.panel.statusArea.quickSettings._system._systemItem._powerToggle;
    } else {
      this.power = Main.panel.statusArea["aggregateMenu"]._power;
    }

    this.powerState = this.power._proxy.State;
    this.powerConnectSignalId = this.power._proxy.connect(
      "g-properties-changed",
      this.onPowerChanged.bind(this)
    );
    // select the right profile at login
    this.powerActions(this.powerState, null);

    super.enable();

    this.timeout = Mainloop.timeout_add_seconds(1, () => this.updateFreq());
    this.timeoutMinMax = Mainloop.timeout_add_seconds(1, () =>
      this.updateFreqMinMax(false)
    );
  }

  onPowerChanged() {
    let newState = this.power._proxy.State;

    if (newState !== this.powerState) {
      this.powerActions(newState, null);
    }

    this.powerState = newState;
  }

  powerActions(powerState, done) {
    let doneScheduled = false;

    if (powerState === UPower.DeviceState.DISCHARGING) {
      log("Power state changed: discharging");
      // switch to battery profile if auto switching is enabled
      if (this.isAutoSwitchActive) {
        let defaultBatProfileID = this.settings.get_string(
          "default-battery-profile"
        );
        for (
          let i = 0;
          i < this.profiles.length && defaultBatProfileID !== "";
          i++
        ) {
          if (this.profiles[i].Profile.UUID === defaultBatProfileID) {
            doneScheduled = true;
            this.applyProfile(this.profiles[i].Profile, done);
            break;
          }
        }
      }
    } else if (
      powerState === UPower.DeviceState.CHARGING ||
      powerState === UPower.DeviceState.FULLY_CHARGED
    ) {
      if (powerState === UPower.DeviceState.CHARGING) {
        log("Power state changed: charging");
      } else {
        log("Power state changed: fully charged");
      }
      // switch to AC profile if auto switching is enabled
      if (this.isAutoSwitchActive) {
        let defaultACProfileID = this.settings.get_string("default-ac-profile");
        for (
          var i = 0;
          i < this.profiles.length && defaultACProfileID !== "";
          i++
        ) {
          if (this.profiles[i].Profile.UUID === defaultACProfileID) {
            doneScheduled = true;
            this.applyProfile(this.profiles[i].Profile, done);
            break;
          }
        }
      }
    }

    if (!doneScheduled && done) {
      done();
    }
  }

  showError(msg, report) {
    this.hasError = true;
    this.lbl.set_text("");
    this.mainSection.removeAll();
    this.mainSection.addMenuItem(
      new PopupMenu.PopupMenuItem(msg, { reactive: false })
    );

    if (report) {
      let reportLabel = new PopupMenu.PopupMenuItem(
        _(
          "Please consider reporting this to the developers\n" +
            "of this extension by submitting an issue on Github."
        ),
        { reactive: true }
      );
      reportLabel.connect("activate", function () {
        Gio.AppInfo.launch_default_for_uri(
          "https://github.com/deinstapel/cpupower/issues/new",
          null
        );
      });
      this.mainSection.addMenuItem(reportLabel);
    }

    this.mainSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.imPrefsBtn = new PopupMenu.PopupMenuItem(_("Preferences"));
    this.imPrefsBtn.connect("activate", this.onPreferencesActivate.bind(this));
    this.mainSection.addMenuItem(this.imPrefsBtn);
  }

  clearError() {
    if (this.hasError) {
      this.createMenu();
    }
  }

  createMenu() {
    super.createMenu();

    let profiles = this.settings.get_value("profiles");
    profiles = profiles.deep_unpack();
    this.profiles = [];
    for (var j = 0; j < profiles.length; j++) {
      var profile = new CPUFreqProfile();
      profile.load(profiles[j]);
      var profileButton = new CPUFreqProfileButton(profile);
      this.profiles.push(profileButton);
    }
    this.profiles.reverse();

    this.imMinTitle = new PopupMenu.PopupMenuItem(
      `${_("Minimum Frequency")}:`,
      { reactive: false }
    );
    this.imMinLabel = new St.Label({ text: this.getMinText() });
    this.imMinLabel.set_style("width: 3.5em; text-align: right");
    this.imMinTitle.actor.add_child(this.imMinLabel);

    this.imMaxTitle = new PopupMenu.PopupMenuItem(
      `${_("Maximum Frequency")}:`,
      { reactive: false }
    );
    this.imMaxLabel = new St.Label({ text: this.getMaxText() });
    this.imMaxLabel.set_style("width: 3.5em; text-align: right");
    this.imMaxTitle.actor.add_child(this.imMaxLabel);

    this.imTurboSwitch = new PopupMenu.PopupSwitchMenuItem(
      `${_("Turbo Boost")}:`,
      this.isTurboBoostActive
    );
    this.imTurboSwitch.connect("toggled", (item) => {
      this.isTurboBoostActive = item.state;
      this.updateTurbo();
    });

    this.imAutoSwitch = new PopupMenu.PopupSwitchMenuItem(
      `${_("Auto Switch")}:`,
      this.isAutoSwitchActive
    );
    this.imAutoSwitch.connect("toggled", (item) => {
      this.isAutoSwitchActive = item.state;
      this.updateAutoSwitch();
    });

    this.imSliderMin = new PopupMenu.PopupBaseMenuItem({ activate: false });
    this.minSlider = new Slider.Slider2(this.minVal);
    this.minSlider.x_expand = true;
    this.minSlider.maximum_value = 100;
    this.minSlider.overdrive_start = 100;
    // set max first, otherwise min will get clamped
    this.minSlider.limit_maximum = this.maxVal;
    this.minSlider.limit_minimum = this.cpuMinLimit;
    this.imSliderMin.connect("key-press-event", (_actor, event) => {
      return this.minSlider.emit("key-press-event", event);
    });
    this.minSlider.connect("notify::value", (item) => {
      this.minVal = Math.floor(item.value);
      this.imMinLabel.set_text(this.getMinText());
      this.maxSlider.limit_minimum = this.minVal;
      this.updateMin();
    });

    if (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) > 3.32) {
      this.imSliderMin.add_child(this.minSlider);
    } else {
      this.imSliderMin.actor.add(this.minSlider, { expand: true });
    }

    this.imSliderMax = new PopupMenu.PopupBaseMenuItem({ activate: false });
    this.maxSlider = new Slider.Slider2(this.maxVal);
    this.maxSlider.x_expand = true;
    this.maxSlider.maximum_value = 100;
    this.maxSlider.overdrive_start = 100;
    // set max first, otherwise min will get clamped
    this.maxSlider.limit_maximum = this.cpuMaxLimit;
    this.maxSlider.limit_minimum = this.minVal;
    this.imSliderMax.connect("key-press-event", (_actor, event) => {
      return this.maxSlider.emit("key-press-event", event);
    });
    this.maxSlider.connect("notify::value", (item) => {
      this.maxVal = Math.floor(item.value);
      this.imMaxLabel.set_text(this.getMaxText());
      this.minSlider.limit_maximum = this.maxVal;
      this.updateMax();
    });

    if (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) > 3.32) {
      this.imSliderMax.add_child(this.maxSlider);
    } else {
      this.imSliderMax.actor.add(this.maxSlider, { expand: true });
    }

    this.imCurrentTitle = new PopupMenu.PopupMenuItem(
      `${_("Current Frequency")}:`,
      { reactive: false }
    );
    this.imCurrentLabel = new St.Label({ text: this.getCurFreq() });
    this.imCurrentLabel.set_style("width: 4.5em; text-align: right");
    this.imCurrentTitle.actor.add_child(this.imCurrentLabel);

    this.mainSection.addMenuItem(this.imMinTitle);
    this.mainSection.addMenuItem(this.imSliderMin);
    this.mainSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.mainSection.addMenuItem(this.imMaxTitle);
    this.mainSection.addMenuItem(this.imSliderMax);
    this.mainSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.mainSection.addMenuItem(this.imTurboSwitch);
    this.mainSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.mainSection.addMenuItem(this.imCurrentTitle);
    this.mainSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    for (var i = 0; i < this.profiles.length; i++) {
      this.profiles[i].connect("activate", (item) =>
        this.applyProfile(item.Profile, null)
      );
      this.mainSection.addMenuItem(this.profiles[i]);
    }

    this.mainSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.mainSection.addMenuItem(this.imAutoSwitch);

    this.imPrefsBtn = new PopupMenu.PopupMenuItem(_("Preferences"));
    this.imPrefsBtn.connect("activate", this.onPreferencesActivate.bind(this));
    this.mainSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.mainSection.addMenuItem(this.imPrefsBtn);

    this.hasError = false;
    let backend = this.settings.get_string("cpufreqctl-backend");
    Cpufreqctl.backends.current(backend, (result) => {
      if (!result.ok) {
        switch (result.exitCode) {
          case utils.CPUFREQCTL_NOT_SUPPORTED:
            this.showError(
              `${_("Oh no! Something went wrong.")}\n` +
                `${_(
                  "The currently selected frequency scaling driver is not supported on your CPU!"
                )}`,
              false
            );
            break;
          default:
            this.showError(
              `${_("Oh no! Something went wrong.")}\n` +
                `${_(
                  "An internal error occurred:"
                )} ${Cpufreqctl.exitCodeToString(result.exitCode)}`,
              true
            );
        }
      } else {
        this.clearError();
      }
    });
  }

  applyProfile(profile, done) {
    this.minVal = profile.MinimumFrequency;
    this.updateMin(() => {
      this.maxVal = profile.MaximumFrequency;
      this.updateMax(() => {
        this.isTurboBoostActive = profile.TurboBoost;
        this.updateTurbo(() => {
          this.updateUi();

          if (done) {
            done();
          }
        });
      });
    });
  }

  disable() {
    this.power._proxy.disconnect(this.powerConnectSignalId);
    super.disable();
    Mainloop.source_remove(this.timeout);
    Mainloop.source_remove(this.timeoutMinMax);
  }

  getMinText() {
    return `${Math.floor(this.minVal).toString()}%`;
  }

  getMaxText() {
    return `${Math.floor(this.maxVal).toString()}%`;
  }

  updateFile() {
    let cmd =
      `${Math.floor(this.minVal)}\n` +
      `${Math.floor(this.maxVal)}\n` +
      `${this.isTurboBoostActive ? "true" : "false"}\n` +
      `${this.isAutoSwitchActive ? "true" : "false"}\n`;
    // log("Updating cpufreq settings cache file: " + LASTSETTINGS);
    GLib.file_set_contents(LASTSETTINGS, cmd);
  }

  updateMax(done) {
    let backend = this.settings.get_string("cpufreqctl-backend");
    Cpufreqctl.max.set(
      backend,
      Math.floor(this.maxVal).toString(),
      (_result) => {
        this.updateFile();

        if (done) {
          done();
        }
      }
    );
  }

  updateMin(done) {
    let backend = this.settings.get_string("cpufreqctl-backend");
    Cpufreqctl.min.set(
      backend,
      Math.floor(this.minVal).toString(),
      (_result) => {
        this.updateFile();

        if (done) {
          done();
        }
      }
    );
  }

  updateTurbo(done) {
    let backend = this.settings.get_string("cpufreqctl-backend");
    Cpufreqctl.turbo.set(
      backend,
      this.isTurboBoostActive ? "on" : "off",
      (_result) => {
        this.updateFile();

        if (done) {
          done();
        }
      }
    );
  }

  updateAutoSwitch() {
    if (this.powerState) {
      this.powerActions(this.powerState, () => {
        this.updateFile();
      });
    }
  }

  updateUi() {
    if (this.hasError) {
      return;
    }

    this.imMinLabel.set_text(this.getMinText());
    this.minSlider.value = this.minVal;

    this.imMaxLabel.set_text(this.getMaxText());
    this.maxSlider.value = this.maxVal;

    this.imTurboSwitch.setToggleState(this.isTurboBoostActive);
    this.imAutoSwitch.setToggleState(this.isAutoSwitchActive);
    for (let p of this.profiles) {
      p.setOrnament(
        this.minVal === p.Profile.MinimumFrequency &&
          this.maxVal === p.Profile.MaximumFrequency &&
          this.isTurboBoostActive === p.Profile.TurboBoost
          ? PopupMenu.Ornament.DOT
          : PopupMenu.Ornament.NONE
      );
    }
  }

  updateFreq() {
    // Only update current frequency if it is shown next to the indicator or the menu is open
    if (this.hasError || !(this.lblActive || (this.menu && this.menu.isOpen))) {
      return true;
    }

    const backend = this.settings.get_string("cpufreqctl-backend");
    Cpufreqctl.info.current(backend, (result) => {
      if (result.ok && result.exitCode === 0) {
        let value;
        switch (this.settings.get_string("frequency-sampling-mode")) {
          case "average":
            value = result.response.avg;
            break;
          case "minimum":
            value = result.response.min;
            break;
          case "maximum":
            value = result.response.max;
            break;
          case "random":
            value = result.response.rnd;
            break;
          default:
            log(
              "invalid frequency-sampling-mode provided, defaulting to 'average'..."
            );
            value = result.response.avg;
            break;
        }
        this.cpufreq = value / 1000;
        if (this.menu && this.menu.isOpen) {
          this.imCurrentLabel.set_text(this.getCurFreq());
        }
        this.lbl.set_text(this.getCurFreq());
      }
    });

    return true;
  }

  updateFreqMinMax(force) {
    const menuOpen = this.menu && this.menu.isOpen;
    if (!force && !menuOpen) {
      return true;
    }

    // merging multiple async callbacks in js is a pain...
    let counter = 0;
    const updateUi = () => {
      counter += 1;
      if ((force || menuOpen) && counter >= 3) {
        this.updateUi();
      }
    };

    const backend = this.settings.get_string("cpufreqctl-backend");
    Cpufreqctl.turbo.get(backend, (result) => {
      if (result.ok && result.exitCode === 0) {
        this.isTurboBoostActive = result.response === "on";
      }
      updateUi();
    });

    Cpufreqctl.min.get(backend, (result) => {
      if (result.ok && result.exitCode === 0) {
        this.minVal = result.response;
      }
      updateUi();
    });

    Cpufreqctl.max.get(backend, (result) => {
      if (result.ok && result.exitCode === 0) {
        this.maxVal = result.response;
      }
      updateUi();
    });

    return true;
  }

  checkFrequencies(cb) {
    Cpufreqctl.info.frequencies(
      this.settings.get_string("cpufreqctl-backend"),
      (result) => {
        if (!result.ok || result.exitCode !== 0) {
          let exitReason = Cpufreqctl.exitCodeToString(result.exitCode);
          log(
            `Failed to query supported frequency ranges from cpufreqctl, reason ${exitReason}! ` +
              "Assuming full range..."
          );
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
          log(
            `Cpufreqctl signaled unsupported frequency mode ${result.response.mode}! ` +
              "Assuming full range..."
          );
          cb({
            min: 0,
            max: 100,
          });
        }
      }
    );
  }

  getCurFreq() {
    if (this.lblUnit) {
      return `${(this.cpufreq / 1000).toFixed(2)} GHz`;
    } else {
      return `${Math.round(this.cpufreq)} MHz`;
    }
  }

  onPreferencesActivate(_item) {
    if (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) >= 40) {
      Util.trySpawnCommandLine(`${EXTENSIONDIR}/src/prefs40/main.js`);
    } else if (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) > 3.32) {
      Util.trySpawnCommandLine("gnome-extensions prefs cpupower@mko-sl.de");
    } else {
      Util.trySpawnCommandLine(
        "gnome-shell-extension-prefs cpupower@mko-sl.de"
      );
    }
    return 0;
  }
};
