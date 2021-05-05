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
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const EXTENSIONDIR = Me.dir.get_path();
const INSTALLER = EXTENSIONDIR + '/tool/installer.sh';
const PKEXEC = GLib.find_program_in_path('pkexec');
const CONFIG = Me.imports.src.config;

function spawn_process_check_exit_code(argv, callback) {
    let [ok, pid] = GLib.spawn_async(
        EXTENSIONDIR,
        argv,
        null,
        GLib.SpawnFlags.DO_NOT_REAP_CHILD,
        null,
    );
    if (!ok) {
        if (callback != null && callback != undefined) {
            callback(false);
        }
        return;
    }
    GLib.child_watch_add(200, pid, function(callback, argv, process, exitStatus) {
        GLib.spawn_close_pid(process);
        let exitCode = 0;
        try {
            GLib.spawn_check_exit_status(exitStatus);
        } catch (e) {
            exitCode = e.code;
        }

        if (callback != null && callback != undefined) {
            callback(exitCode == 0, exitCode);
        }
    }.bind(null, callback, argv));
}

var INSTALLER_SUCCESS = 0;
var INSTALLER_INVALID_ARG = 1;
var INSTALLER_FAILED = 2;
var INSTALLER_NEEDS_UPDATE = 3;
var INSTALLER_NEEDS_SECURITY_UPDATE = 4;
var INSTALLER_NOT_INSTALLED = 5;
var INSTALLER_MUST_BE_ROOT = 6;

function check_installed(callback) {
    spawn_process_check_exit_code(
        [INSTALLER, '--prefix', CONFIG.PREFIX, '--tool-suffix', CONFIG.TOOL_SUFFIX, 'check'],
        callback,
    );
}

function attempt_installation(done) {
    spawn_process_check_exit_code(
        [PKEXEC, INSTALLER, '--prefix', CONFIG.PREFIX, '--tool-suffix', CONFIG.TOOL_SUFFIX, 'install'],
        done
    );
}

function attempt_uninstallation(done) {
    spawn_process_check_exit_code(
        [PKEXEC, INSTALLER, '--prefix', CONFIG.PREFIX, '--tool-suffix', CONFIG.TOOL_SUFFIX, 'uninstall'],
        done
    );
}

function attempt_update(done) {
    spawn_process_check_exit_code(
        [PKEXEC, INSTALLER, '--prefix', CONFIG.PREFIX, '--tool-suffix', CONFIG.TOOL_SUFFIX, 'update'],
        done,
    );
}

var CPUFREQCTL_SUCCESS = 0;
var CPUFREQCTL_NO_ARGUMENTS = 3;
var CPUFREQCTL_INVALID_ARGUMENT = 4;
var CPUFREQCTL_OUT_OF_RANGE = 5;
var CPUFREQCTL_NO_BACKEND = 6;
var CPUFREQCTL_INVALID_BACKEND = 7;
var CPUFREQCTL_INTERNAL_ERROR = 8;
var CPUFREQCTL_NOT_SUPPORTED = 9;

function __cpufreqctl(pkexec_needed, backend, params, cb) {
    let args = [CONFIG.CPUFREQCTL, "--backend", backend, "--format", "json"].concat(params);
    if (pkexec_needed) {
        args.unshift(PKEXEC);
    }

    let [ok, pid, stdin, stdout, stderr] = GLib.spawn_async_with_pipes(
        EXTENSIONDIR,
        args,
        null,
        GLib.SpawnFlags.DO_NOT_REAP_CHILD,
        null,
    );
    if (!ok) {
        if (cb !== null && cb !== undefined) {
            cb({ ok: false });
        }
        return;
    }

    const out_reader = new Gio.DataInputStream({
        base_stream: new Gio.UnixInputStream({fd: stdout}),
    });
    GLib.child_watch_add(200, pid, function(cb, process, exitStatus) {
        GLib.spawn_close_pid(process);
        let exitCode = 0;
        try {
            GLib.spawn_check_exit_status(exitStatus);
        } catch (e) {
            exitCode = e.code;
        }
        const [stdout, length] = out_reader.read_upto("", 0, null);

        let response;
        if (exitCode === CPUFREQCTL_SUCCESS) {
            response = JSON.parse(stdout);
        } else {
            response = stdout;
        }

        if (cb !== null && cb !== undefined) {
            cb({
                ok: true,
                exitCode: exitCode,
                response: response,
            });
        }
    }.bind(null, cb));
}

var Cpufreqctl = {
    turbo: {
        get: function(backend, cb) {
            __cpufreqctl(false, backend, ["turbo", "get"], cb);
        },
        set: function(backend, value, cb) {
            __cpufreqctl(true, backend, ["turbo", "set", value], cb);
        },
    },
    min: {
        get: function(backend, cb) {
            __cpufreqctl(false, backend, ["min", "get"], cb);
        },
        set: function(backend, value, cb) {
            __cpufreqctl(true, backend, ["min", "set", value], cb);
        },
    },
    max: {
        get: function(backend, cb) {
            __cpufreqctl(false, backend, ["max", "get"], cb);
        },
        set: function(backend, value, cb) {
            __cpufreqctl(true, backend, ["max", "set", value], cb);
        },
    },
    info: {
        frequencies: function(backend, cb) {
            __cpufreqctl(false, backend, ["info", "frequencies"], cb);
        },
        current: function(backend, cb) {
            __cpufreqctl(false, backend, ["info", "current"], cb);
        },
    },
    exitCodeToString: function(exitCode) {
        switch (exitCode) {
        case CPUFREQCTL_SUCCESS:
            return "SUCCESS";
        case CPUFREQCTL_NO_ARGUMENTS:
            return "NO_ARGUMENTS";
        case CPUFREQCTL_INVALID_ARGUMENT:
            return "INVALID_ARGUMENT";
        case CPUFREQCTL_OUT_OF_RANGE:
            return "OUT_OF_RANGE";
        case CPUFREQCTL_NO_BACKEND:
            return "NO_BACKEND";
        case CPUFREQCTL_INVALID_BACKEND:
            return "INVALID_BACKEND";
        case CPUFREQCTL_INTERNAL_ERROR:
            return "INTERNAL_ERROR";
        case CPUFREQCTL_NOT_SUPPORTED:
            return "NOT_SUPPORTED";
        default:
            return "UNKNOWN";
        }
    },
};

