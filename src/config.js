/*
 *
 *  CPUPower for GNOME Shell preferences
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2017-2020
 *     Martin Koppehel <martin.koppehel@st.ovgu.de>,
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

const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var PREFIX = '/usr';
var TOOL_SUFFIX = '';
var IS_USER_INSTALL = false;

var CPUFREQCTL = PREFIX + '/bin/cpufreqctl';
var POLKIT = PREFIX + '/share/polkit-1/actions/mko.cpupower.setcpufreq.policy';

if (Me.dir.get_path().includes('/home')) {
    // we are installed in the /home directory, let's handle tool installation
    TOOL_SUFFIX = GLib.get_user_name();
    CPUFREQCTL = PREFIX + '/local/bin/cpufreqctl-' + TOOL_SUFFIX;
    POLKIT = PREFIX + '/share/polkit-1/actions/mko.cpupower.setcpufreq.' + TOOL_SUFFIX + '.policy';
    IS_USER_INSTALL = true;
}
