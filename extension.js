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

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import * as utils from './src/utils.js';
import {checkInstalled} from './src/utils.js';
import {NotInstalledIndicator} from './src/notinstalled.js';
import * as update from './src/update.js';
import * as indicator from './src/indicator.js';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const EXTENSIONDIR = import.meta.url.substr('file://'.length, import.meta.url.lastIndexOf('/') - 'file://'.length);

export default class CPUPowerExtension extends Extension {
    constructor(...args) {
        super(...args);
        this.indicatorInstance = null;
        this.cpupowerProxy = null;
        this.extensionReloadSignalHandler = null;
    }

    enableIndicator(instance) {
        Main.panel.addToStatusArea("cpupower", instance.mainButton);
        instance.enable();
    }

    /* exported enable */
    enable() {
        globalThis.cpupowerExtension = this;
        const interfaceBinary = GLib.file_get_contents(`${EXTENSIONDIR}/schemas/io.github.martin31821.cpupower.dbus.xml`)[1];
        let decoder = new TextDecoder('utf-8');
        let interfaceXml = decoder.decode(interfaceBinary);
        const CpupowerProxy = Gio.DBusProxy.makeProxyWrapper(interfaceXml);

        this.cpupowerProxy = new CpupowerProxy(
            Gio.DBus.session,
            "io.github.martin31821.cpupower",
            "/io/github/martin31821/cpupower",
        );

        this.extensionReloadSignalHandler = this.cpupowerProxy.connectSignal("ExtensionReloadRequired", () => {
            log("Reloading cpupower");
            this.disable();
            this.enable();
        });

        try {
            checkInstalled((installed, exitCode) => {
                if (!installed) {
                    switch (exitCode) {
                    case utils.INSTALLER_NEEDS_UPDATE:
                        this.indicatorInstance = new update.UpdateIndicator(update.UPDATE, function (success) {
                            if (success) {
                                // reenable the extension to allow immediate operation.
                                this.disable();
                                this.enable();
                            }
                        }.bind(this), (inst) => this.enableIndicator(inst));
                        break;
                    case utils.INSTALLER_NEEDS_SECURITY_UPDATE:
                        this.indicatorInstance = new update.UpdateIndicator(update.SECURITY_UPDATE, function (success) {
                            if (success) {
                                // reenable the extension to allow immediate operation.
                                this.disable();
                                this.enable();
                            }
                        }.bind(this), (inst) => this.enableIndicator(inst));
                        break;
                    default:
                        this.indicatorInstance = new NotInstalledIndicator(exitCode, function (success) {
                            if (success) {

                                this.disable();
                                this.enable();
                            }
                        }.bind(this), (inst) => this.enableIndicator(inst));
                        break;
                    }
                } else {
                    this.indicatorInstance = new indicator.CPUFreqIndicator((inst) => this.enableIndicator(inst));
                }
            });
        } catch (e) {
            logError(e);
        }
    }

    /* exported disable */
    disable() {
        if (this.indicatorInstance) {
            this.indicatorInstance.disable();
            this.indicatorInstance.destroy();
        }

        if (this.cpupowerProxy && this.extensionReloadSignalHandler) {
            this.cpupowerProxy.disconnectSignal(this.extensionReloadSignalHandler);

            this.cpupowerProxy = null;
            this.extensionReloadSignalHandler = null;
        }
        delete globalThis.cpupowerExtension;
    }
}
