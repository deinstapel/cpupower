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

VERSION="8.0.0"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" #stackoverflow 59895
PREFIX="/usr" # default install prefix is /usr

function usage() {
    echo "Usage: installer.sh [options] {supported,install,check,update,uninstall}"
    echo
    echo "Available options:"
    echo "  --prefix PREFIX        Set the install prefix (default: /usr)"
    echo "  --tool-suffix SUFFIX   Set the tool name suffix (default: <empty>)"
    echo
    exit 1
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

RULE_IN="${DIR}/../data/mko.cpupower.policy.in"
RULE_DIR="${PREFIX}/share/polkit-1/actions"
CFC_IN="${DIR}/cpufreqctl"

# if TOOL_SUFFIX is provided, install to .../local/bin
# see https://github.com/martin31821/cpupower/issues/102
# the TOOL_SUFFIX enables per-user installations on a multi-user system
# see https://github.com/martin31821/cpupower/issues/84
if [ -z "${TOOL_SUFFIX}" ]
then
    CFC_DIR="${PREFIX}/bin"
    CFC_OUT="${CFC_DIR}/cpufreqctl"
    RULE_ID="mko.cpupower.setcpufreq"
    RULE_OUT="${RULE_DIR}/${RULE_ID}.policy"
else
    CFC_DIR="${PREFIX}/local/bin"
    CFC_OUT="${CFC_DIR}/cpufreqctl-${TOOL_SUFFIX}"
    RULE_ID="mko.cpupower.setcpufreq.${TOOL_SUFFIX}"
    RULE_OUT="${RULE_DIR}/${RULE_ID}.policy"
fi

V7_LEGACY_OUT="/usr/share/polkit-1/actions/mko.cpupower.policy"
V8_LEGACY_OUT="/usr/share/polkit-1/actions/mko.cpupower.setcpufreq.policy"

if [ "$ACTION" = "supported" ]
then
    ls /sys/devices/system/cpu/intel_pstate > /dev/null 2>&1 || \
        (echo "Unsupported" && exit 5) && echo "Supported"
    exit $?
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
        exit 5
    fi

    sed -e "s:{{PATH}}:${CFC_OUT}:g" \
        -e "s:{{VERSION}}:${VERSION}:g" \
        -e "s:{{ID}}:${RULE_ID}:g" "${RULE_IN}" | \
        cmp --silent "${RULE_OUT}" || (echo "Not installed" && exit 6) && echo "Installed"
    exit $?
fi

if [ "$ACTION" = "install" ]
then
    if [ "${EUID}" -ne 0 ]; then
        echo "The install action must be run as root for security reasons!"
        echo "Please have a look at https://github.com/martin31821/cpupower/issues/102"
        echo "for further details."
        exit 4
    fi

    echo -n "Installing cpufreqctl tool... "
    mkdir -p "${CFC_DIR}"
    install "${CFC_IN}" "${CFC_OUT}" || (echo "Failed" && exit 3)
    echo "Success"

    echo -n "Installing policykit action... "
    mkdir -p "${RULE_DIR}"
    sed -e "s:{{PATH}}:${CFC_OUT}:g" \
        -e "s:{{VERSION}}:${VERSION}:g" \
        -e "s:{{ID}}:${RULE_ID}:g" "${RULE_IN}" > "${RULE_OUT}" 2>/dev/null || \
        (echo "Failed" && exit 2)
    echo "Success"

    exit 0
fi

if [ "$ACTION" = "update" ]
then
    if [ -f "V7_LEGACY_OUT" ]
    then
        echo -n "Uninstalling legacy v7 polkit rule... "
        rm "${V7_LEGACY_OUT}" || \
            (echo "Failed - cannot remove ${V7_LEGACY_OUT}" && exit 7)
        echo "Success"
    fi

    if [ -f "${V8_LEGACY_OUT}" ] && ! grep -sq "${PREFIX}" "${V8_LEGACY_OUT}"
    then
        echo -n "Uninstalling legacy v8 polkit rule... "
        rm "${V8_LEGACY_OUT}" || \
            (echo "Failed - cannot remove ${V8_LEGACY_OUT}" && exit 7)
        echo "Success"
    fi

    "${BASH_SOURCE[0]}" --prefix "${PREFIX}" --tool-suffix "${TOOL_SUFFIX}" uninstall || exit $?
    "${BASH_SOURCE[0]}" --prefix "${PREFIX}" --tool-suffix "${TOOL_SUFFIX}" install || exit $?

    exit 0
fi

if [ "$ACTION" = "uninstall" ]
then
    echo -n "Uninstalling cpufreqctl tool... "
    if [ -f "${CFC_OUT}" ]
    then
        rm "${CFC_OUT}" || (echo "Failed - cannot remove ${CFC_OUT}" && exit 7) && echo "Success"
    else
        echo "tool not installed at ${CFC_OUT}"
    fi

    echo -n "Uninstalling policykit action... "
    if [ -f "${RULE_OUT}" ]
    then
        rm "${RULE_OUT}" || (echo "Failed - cannot remove ${RULE_OUT}" && exit 7) && echo "Success"
    else
        echo "policy not installed at ${RULE_OUT}"
    fi
    exit 0
fi

echo "Unknown parameter."
usage
