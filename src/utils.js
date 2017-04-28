/*
 *
 *  CPUPower for GNOME Shell preferences
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2017
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
const EXTENSIONDIR = Me.dir.get_path();
const INSTALLER = EXTENSIONDIR + '/src/installer.sh';
const CPUFREQCTL = EXTENSIONDIR + '/src/cpufreqctl';
const PKEXEC = GLib.find_program_in_path('pkexec');

function spawn_process_check_exit_code(argv, callback)
{
    let [ok, pid] = GLib.spawn_async(EXTENSIONDIR, argv, null, GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);
    if (!ok)
    {
        if (callback != null && callback != undefined)
            callback(false);
        return;
    }
    GLib.child_watch_add(200, pid, function(callback, argv, process, exitCode) {
        GLib.spawn_close_pid(process);
        if (callback != null && callback != undefined)
            callback(exitCode == 0, exitCode); //GLib.spawn_check_exit_code will throw an exception... so we check against unix style exit codes here.
    }.bind(null, callback, argv));
}

function check_supported(callback)
{
    spawn_process_check_exit_code([INSTALLER, 'supported'], callback);
}

function check_installed(callback)
{
    spawn_process_check_exit_code([INSTALLER, 'check'], callback);
}

function get_min_hardware_frequency(callback)
{
    spawn_process_check_exit_code([PKEXEC, CPUFREQCTL, 'min', 'check'], function (success, exitCode) {
        callback(exitCode);
    });
}

function attempt_installation(done)
{
    spawn_process_check_exit_code([PKEXEC, INSTALLER, 'install'], done);
}
