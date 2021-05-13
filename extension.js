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

const utils = Me.imports.src.utils;
const checkInstalled = Me.imports.src.utils.checkInstalled;
const notinstalled = Me.imports.src.notinstalled;
const update = Me.imports.src.update;
const indicator = Me.imports.src.indicator;


let indicatorInstance;
/* exported init */
function init(_meta) {
    Convenience.initTranslations("gnome-shell-extension-cpupower");
}

function enableIndicator() {
    Main.panel.addToStatusArea("cpupower", indicatorInstance.mainButton);
    indicatorInstance.enable();
}

/* exported enable */
function enable() {
    try {
        checkInstalled((installed, exitCode) => {
            if (!installed) {
                switch (exitCode) {
                case utils.INSTALLER_NEEDS_UPDATE:
                    indicatorInstance = new update.UpdateIndicator(update.UPDATE, function (success) {
                        if (success) {
                            // reenable the extension to allow immediate operation.
                            disable();
                            enable();
                        }
                    });
                    break;
                case utils.INSTALLER_NEEDS_SECURITY_UPDATE:
                    indicatorInstance = new update.UpdateIndicator(update.SECURITY_UPDATE, function (success) {
                        if (success) {
                            // reenable the extension to allow immediate operation.
                            disable();
                            enable();
                        }
                    });
                    break;
                default:
                    indicatorInstance = new notinstalled.NotInstalledIndicator(exitCode, function (success) {
                        if (success) {
                            // reenable the extension to allow immediate operation.
                            disable();
                            enable();
                        }
                    });
                    break;
                }
            } else {
                indicatorInstance = new indicator.CPUFreqIndicator();
            }
            enableIndicator();
        });
    } catch (e) {
        logError(e.message);
    }
}

/* exported disable */
function disable() {
    if (indicatorInstance !== null) {
        indicatorInstance.disable();
        indicatorInstance.destroy();
    }
}
