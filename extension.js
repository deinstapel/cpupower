/*
 *
 *  CPUPower for GNOME Shell preferences
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2015
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

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.src.convenience;
const Main = imports.ui.main;

const check_supported = Me.imports.src.utils.check_supported;
const unsupported = Me.imports.src.unsupported;

const check_installed = Me.imports.src.utils.check_installed;
const notinstalled = Me.imports.src.notinstalled;
const update = Me.imports.src.update;

const indicator = Me.imports.src.indicator;


let _indicator = null;
var init = (meta) => {
    Convenience.initTranslations('gnome-shell-extension-cpupower');
};


const _enableIndicator = () => {
    Main.panel.addToStatusArea('cpupower', _indicator._mainButton);
    _indicator.enable();
};

var enable = () => {
    try {
        check_supported(supported => {
            if (!supported) {
                _indicator = new unsupported.UnsupportedIndicator();
                _enableIndicator();
                return;
            }

            check_installed((installed, exitCode) => {
                if (!installed) {
                    switch (exitCode) {
                    case 3:
                        _indicator = new update.UpdateIndicator(update.UPDATE, function (success) {
                            if (success) {
                                // reenable the extension to allow immediate operation.
                                disable();
                                enable();
                            }
                        });
                        break;
                    case 4:
                        _indicator = new update.UpdateIndicator(update.SECURITY_UPDATE, function (success) {
                            if (success) {
                                // reenable the extension to allow immediate operation.
                                disable();
                                enable();
                            }
                        });
                        break;
                    default:
                        _indicator = new notinstalled.NotInstalledIndicator(function (success) {
                            if (success)
                            {
                                // reenable the extension to allow immediate operation.
                                disable();
                                enable();
                            }
                        });
                        break;
                    }
                } else {
                    _indicator = new indicator.CPUFreqIndicator();
                }
                _enableIndicator();
            });
        });
    } catch (e) {
        global.logError(e.message);
    }
};

var disable = () => {
    if (_indicator != null) {
        _indicator.disable();
        _indicator.destroy();
    }
};
