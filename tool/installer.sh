#!/bin/bash

# installer.sh - This script installs a policykit action for the cpu power gnome-shell extension.
#
# Copyright (C) 2017-2020
#     Martin Koppehel <psl.kontakt@gmail.com>,
#     Fin Christensen <christensen.fin@gmail.com>,
#
# This file is part of the gnome-shell extension cpupower.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

set -e

EXIT_SUCCESS=0
EXIT_INVALID_ARG=1
EXIT_FAILED=2
EXIT_NEEDS_UPDATE=3
EXIT_NEEDS_SECURITY_UPDATE=4
EXIT_NOT_INSTALLED=5
EXIT_MUST_BE_ROOT=6

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" #stackoverflow 59895
PREFIX="/usr" # default install prefix is /usr

function usage() {
    echo "Usage: installer.sh [options] {supported,install,check,update,uninstall}"
    echo
    echo "Available options:"
    echo "  --prefix PREFIX        Set the install prefix (default: /usr)"
    echo "  --tool-suffix SUFFIX   Set the tool name suffix (default: <empty>)"
    echo
    exit ${EXIT_INVALID_ARG}
}

if [ $# -lt 1 ]
then
    usage
fi

ACTION=""
while [[ $# -gt 0 ]]
do
    key="$1"

    # we have to use command line arguments here as pkexec does not support
    # setting environment variables
    case $key in
        --prefix)
            PREFIX="$2"
            shift
            shift
            ;;
        --tool-suffix)
            TOOL_SUFFIX="$2"
            shift
            shift
            ;;
        supported|install|check|update|uninstall)
            if [ -z "$ACTION" ]
            then
                ACTION="$1"
            else
                echo "Too many actions specified. Please give at most 1."
                usage
            fi
            shift
            ;;
        *)
            echo "Unknown argument $key"
            usage
            ;;
    esac
done

ACTION_IN="${DIR}/../data/mko.cpupower.policy.in"
ACTION_DIR="${PREFIX}/share/polkit-1/actions"
RULE_IN="${DIR}/../data/10-mko.cpupower.setcpufreq.rules"
RULE_DIR="${PREFIX}/share/polkit-1/rules.d"
RULE_OUT="${RULE_DIR}/10-mko.cpupower.setcpufreq.rules"
CFC_IN="${DIR}/cpufreqctl"

# if TOOL_SUFFIX is provided, install to .../local/bin
# see https://github.com/martin31821/cpupower/issues/102
# the TOOL_SUFFIX enables per-user installations on a multi-user system
# see https://github.com/martin31821/cpupower/issues/84
if [ -z "${TOOL_SUFFIX}" ]
then
    CFC_DIR="${PREFIX}/bin"
    CFC_OUT="${CFC_DIR}/cpufreqctl"
    ACTION_ID="mko.cpupower.setcpufreq"
    ACTION_OUT="${ACTION_DIR}/${ACTION_ID}.policy"
else
    CFC_DIR="${PREFIX}/local/bin"
    CFC_OUT="${CFC_DIR}/cpufreqctl-${TOOL_SUFFIX}"
    ACTION_ID="mko.cpupower.setcpufreq.${TOOL_SUFFIX}"
    ACTION_OUT="${ACTION_DIR}/${ACTION_ID}.policy"
fi

V7_LEGACY_OUT="/usr/share/polkit-1/actions/mko.cpupower.policy"
V8_LEGACY_OUT="/usr/share/polkit-1/actions/mko.cpupower.setcpufreq.policy"

if [ "$ACTION" = "supported" ]
then
    if [ -d /sys/devices/system/cpu/intel_pstate ]
    then
        echo "Supported"
        exit ${EXIT_SUCCESS}
    else
        echo "Unsupported"
        exit ${EXIT_FAILED}
    fi
fi

if [ "$ACTION" = "check" ]
then
    # pre v9 policy rules have security issues
    # cpufreqctl should always be located in /usr/local/bin or /usr/bin as of
    # https://github.com/martin31821/cpupower/issues/102
    # therefore check for occurence of prefix
    if [ -f "${V8_LEGACY_OUT}" ] && ! grep -sq "${PREFIX}" "${V8_LEGACY_OUT}" || \
               [ -f "${V7_LEGACY_OUT}" ]
    then
        echo "Your cpupower installation needs updating!"
        echo "Warning: Security issues were found with your installation! Update immediately!"
        exit ${EXIT_NEEDS_SECURITY_UPDATE}
    fi

    if ! sed -e "s:{{PATH}}:${CFC_OUT}:g" \
             -e "s:{{ID}}:${ACTION_ID}:g" "${ACTION_IN}" | \
             cmp --silent "${ACTION_OUT}"
    then
        if [ -f "${ACTION_OUT}" ]
        then
            echo "Your cpupower installation needs updating!"
            exit ${EXIT_NEEDS_UPDATE}
        else
            echo "Not installed"
            exit ${EXIT_NOT_INSTALLED}
        fi
    fi
    echo "Installed"

    exit ${EXIT_SUCCESS}
fi

if [ "$ACTION" = "install" ]
then
    if [ "${EUID}" -ne 0 ]; then
        echo "The install action must be run as root for security reasons!"
        echo "Please have a look at https://github.com/martin31821/cpupower/issues/102"
        echo "for further details."
        exit ${EXIT_MUST_BE_ROOT}
    fi

    echo -n "Installing cpufreqctl tool... "
    mkdir -p "${CFC_DIR}"
    install "${CFC_IN}" "${CFC_OUT}" || (echo "Failed" && exit ${EXIT_FAILED})
    echo "Success"

    echo -n "Installing policykit action... "
    mkdir -p "${ACTION_DIR}"
    sed -e "s:{{PATH}}:${CFC_OUT}:g" \
        -e "s:{{ID}}:${ACTION_ID}:g" "${ACTION_IN}" > "${ACTION_OUT}" 2>/dev/null || \
        (echo "Failed" && exit ${EXIT_FAILED})
    echo "Success"

    echo -n "Installing policykit rule... "
    mkdir -p "${RULE_DIR}"
    install -m 0644 "${RULE_IN}" "${RULE_OUT}" || (echo "Failed" && exit ${EXIT_FAILED})
    echo "Success"

    exit ${EXIT_SUCCESS}
fi

if [ "$ACTION" = "update" ]
then
    if [ -f "V7_LEGACY_OUT" ]
    then
        echo -n "Uninstalling legacy v7 polkit rule... "
        rm "${V7_LEGACY_OUT}" || \
            (echo "Failed - cannot remove ${V7_LEGACY_OUT}" && exit ${EXIT_FAILED})
        echo "Success"
    fi

    if [ -f "${V8_LEGACY_OUT}" ] && ! grep -sq "${PREFIX}" "${V8_LEGACY_OUT}"
    then
        echo -n "Uninstalling legacy v8 polkit rule... "
        rm "${V8_LEGACY_OUT}" || \
            (echo "Failed - cannot remove ${V8_LEGACY_OUT}" && exit ${EXIT_FAILED})
        echo "Success"
    fi

    "${BASH_SOURCE[0]}" --prefix "${PREFIX}" --tool-suffix "${TOOL_SUFFIX}" uninstall || exit $?
    "${BASH_SOURCE[0]}" --prefix "${PREFIX}" --tool-suffix "${TOOL_SUFFIX}" install || exit $?

    exit ${EXIT_SUCCESS}
fi

if [ "$ACTION" = "uninstall" ]
then
    echo -n "Uninstalling cpufreqctl tool... "
    if [ -f "${CFC_OUT}" ]
    then
        rm "${CFC_OUT}" || (echo "Failed - cannot remove ${CFC_OUT}" && exit ${EXIT_FAILED}) && echo "Success"
    else
        echo "tool not installed at ${CFC_OUT}"
    fi

    echo -n "Uninstalling policykit action... "
    if [ -f "${ACTION_OUT}" ]
    then
        rm "${ACTION_OUT}" || (echo "Failed - cannot remove ${ACTION_OUT}" && exit ${EXIT_FAILED}) && echo "Success"
    else
        echo "policy action not installed at ${ACTION_OUT}"
    fi

    echo -n "Uninstalling policykit rule... "
    if [ -f "${RULE_OUT}" ]
    then
        rm "${RULE_OUT}" || (echo "Failed - cannot remove ${RULE_OUT}" && exit ${EXIT_FAILED}) && echo "Success"
    else
        echo "policy rule not installed at ${RULE_OUT}"
    fi

    exit ${EXIT_SUCCESS}
fi

echo "Unknown parameter."
usage
