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
const UnsupportedIndicator = Me.imports.src.unsupported.UnsupportedIndicator;

const check_installed = Me.imports.src.utils.check_installed;
const NotInstalledIndicator = Me.imports.src.notinstalled.NotInstalledIndicator;

const CPUFreqIndicator = Me.imports.src.indicator.CPUFreqIndicator;


function init(meta)
{
    Convenience.initTranslations('gnome-shell-extension-cpupower');
}

let _indicator = null;

function _enableIndicator()
{
    Main.panel.addToStatusArea('cpupower', _indicator);
    _indicator._enable();
}

function enable()
{
    try
    {
        check_supported(function(supported) {
            if (!supported)
            {
                _indicator = new UnsupportedIndicator();
                _enableIndicator();
                return;
            }

            check_installed(function(installed) {
                if (!installed)
                {
                    _indicator = new NotInstalledIndicator(function (success) {
                        if (success)
                        {
                            // reenable the extension to allow immediate operation.
                            disable();
                            enable();
                        }
                    });
                }
                else
                {
                    _indicator = new CPUFreqIndicator();
                }

                _enableIndicator();
            });
        });
    }
    catch (e)
    {
        global.logError(e.message);
    }
}

function disable()
{
    if (_indicator != null)
    {
        _indicator._disable();
        _indicator.destroy();
    }
}
