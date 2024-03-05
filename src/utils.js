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

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const PKEXEC = GLib.find_program_in_path("pkexec");
import * as CONFIG from './config.js';

const EXTENSIONDIR = import.meta.url.substr('file://'.length, import.meta.url.lastIndexOf('/') - 'file://'.length) + '/..';
const INSTALLER = `${EXTENSIONDIR}/tool/installer.sh`;

// FIXME: I don't know how to call linux's getuid directly...
/* exported getuid */
export function getuid() {
    return parseInt(TextDecoder.decode(GLib.spawn_sync(null, ["id", "-u"], null, GLib.SpawnFlags.SEARCH_PATH, null)[1]));
}

function spawnProcessCheckExitCode(argv, callback) {
    let [ok, pid] = GLib.spawn_async(
        EXTENSIONDIR,
        argv,
        null,
        GLib.SpawnFlags.DO_NOT_REAP_CHILD,
        null,
    );
    if (!ok) {
        if (callback) {
            callback(false);
        }
        return;
    }
    GLib.child_watch_add(200, pid, (process, exitStatus) => {
        GLib.spawn_close_pid(process);
        let exitCode = 0;
        try {
            GLib.spawn_check_exit_status(exitStatus);
        } catch (e) {
            exitCode = e.code;
        }

        if (callback) {
            callback(exitCode === 0, exitCode);
        }
    });
}

/* exported INSTALLER_SUCCESS */
export var INSTALLER_SUCCESS = 0;
/* exported INSTALLER_INVALID_ARG */
export var INSTALLER_INVALID_ARG = 1;
/* exported INSTALLER_FAILED */
export var INSTALLER_FAILED = 2;
/* exported INSTALLER_NEEDS_UPDATE */
export var INSTALLER_NEEDS_UPDATE = 3;
/* exported INSTALLER_NEEDS_SECURITY_UPDATE */
export var INSTALLER_NEEDS_SECURITY_UPDATE = 4;
/* exported INSTALLER_NOT_INSTALLED */
export var INSTALLER_NOT_INSTALLED = 5;
/* exported INSTALLER_MUST_BE_ROOT */
export var INSTALLER_MUST_BE_ROOT = 6;

/* exported checkInstalled */
export function checkInstalled(callback) {
    spawnProcessCheckExitCode(
        [INSTALLER, "--prefix", CONFIG.PREFIX, "--tool-suffix", CONFIG.TOOL_SUFFIX, "check"],
        callback,
    );
}

/* exported attemptInstallation */
export function attemptInstallation(done) {
    spawnProcessCheckExitCode(
        [PKEXEC, INSTALLER, "--prefix", CONFIG.PREFIX, "--tool-suffix", CONFIG.TOOL_SUFFIX, "install"],
        done,
    );
}

/* exported attemptUninstallation */
export function attemptUninstallation(done) {
    spawnProcessCheckExitCode(
        [PKEXEC, INSTALLER, "--prefix", CONFIG.PREFIX, "--tool-suffix", CONFIG.TOOL_SUFFIX, "uninstall"],
        done,
    );
}

/* exported attemptUpdate */
export function attemptUpdate(done) {
    spawnProcessCheckExitCode(
        [PKEXEC, INSTALLER, "--prefix", CONFIG.PREFIX, "--tool-suffix", CONFIG.TOOL_SUFFIX, "update"],
        done,
    );
}

/* exported CPUFREQCTL_SUCCESS */
export var CPUFREQCTL_SUCCESS = 0;
/* exported CPUFREQCTL_NO_ARGUMENTS */
export var CPUFREQCTL_NO_ARGUMENTS = 3;
/* exported CPUFREQCTL_INVALID_ARGUMENT */
export var CPUFREQCTL_INVALID_ARGUMENT = 4;
/* exported CPUFREQCTL_OUT_OF_RANGE */
export var CPUFREQCTL_OUT_OF_RANGE = 5;
/* exported CPUFREQCTL_NO_BACKEND */
export var CPUFREQCTL_NO_BACKEND = 6;
/* exported CPUFREQCTL_INVALID_BACKEND */
export var CPUFREQCTL_INVALID_BACKEND = 7;
/* exported CPUFREQCTL_INTERNAL_ERROR */
export var CPUFREQCTL_INTERNAL_ERROR = 8;
/* exported CPUFREQCTL_NOT_SUPPORTED */
export var CPUFREQCTL_NOT_SUPPORTED = 9;

function runCpufreqctl(pkexecNeeded, backend, params, cb) {
    let args = [
        CONFIG.CPUFREQCTL,
        "--backend", backend,
        "--format", "json",
    ].concat(params);

    if (pkexecNeeded) {
        args.unshift(PKEXEC);
    }

    let launcher = Gio.SubprocessLauncher.new(
        Gio.SubprocessFlags.STDOUT_PIPE,
    );
    launcher.set_cwd(EXTENSIONDIR);
    let proc;
    try {
        proc = launcher.spawnv(args);
    } catch (e) {
        if (cb) {
            cb({
                ok: false,
                exitCode: null,
                response: null,
            });
        }
        return;
    }

    let stdoutStream = new Gio.DataInputStream({
        base_stream: proc.get_stdout_pipe(),
        close_base_stream: true,
    });
    proc.wait_async(null, (proc, result) => {
        // this only throws if async call got cancelled, but we
        // explicitly passed null for the cancellable
        let ok = proc.wait_finish(result);
        if (!ok) {
            if (cb) {
                cb({
                    ok: false,
                    exitCode: null,
                    response: null,
                });
            }
            return;
        }

        let exitCode = proc.get_exit_status();
        let [stdout, _length] = stdoutStream.read_upto("", 0, null);

        let response;
        if (exitCode === CPUFREQCTL_SUCCESS) {
            try {
                response = JSON.parse(stdout);
            } catch (e) {
                log(e);
                log(stdout);
            }
        } else {
            response = stdout;
        }

        if (cb) {
            cb({
                ok: exitCode === 0,
                exitCode,
                response,
            });
        }
    });
}

/* exported Cpufreqctl */
export var Cpufreqctl = {
    turbo: {
        get(backend, cb) {
            runCpufreqctl(false, backend, ["turbo", "get"], cb);
        },
        set(backend, value, cb) {
            runCpufreqctl(true, backend, ["turbo", "set", value], cb);
        },
    },
    min: {
        get(backend, cb) {
            runCpufreqctl(false, backend, ["min", "get"], cb);
        },
        set(backend, value, cb) {
            runCpufreqctl(true, backend, ["min", "set", value], cb);
        },
    },
    max: {
        get(backend, cb) {
            runCpufreqctl(false, backend, ["max", "get"], cb);
        },
        set(backend, value, cb) {
            runCpufreqctl(true, backend, ["max", "set", value], cb);
        },
    },
    reset(backend, cb) {
        runCpufreqctl(true, backend, ["reset"], cb);
    },
    info: {
        frequencies(backend, cb) {
            runCpufreqctl(true, backend, ["info", "frequencies"], cb);
        },
        current(backend, cb) {
            runCpufreqctl(false, backend, ["info", "current"], cb);
        },
    },
    backends: {
        list(backend, cb) {
            runCpufreqctl(false, backend, ["backends", "list"], cb);
        },
        current(backend, cb) {
            runCpufreqctl(false, backend, ["backends", "current"], cb);
        },
        automatic(cb) {
            runCpufreqctl(false, "automatic", ["backends", "current"], cb);
        },
    },
    exitCodeToString(exitCode) {
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
