#!/bin/bash

# installer.sh - This script installs a policykit action for the cpu power gnome-shell extension.
#
# Copyright (C) 2017
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

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" #stackoverflow 59895
CFC="${DIR}/cpufreqctl"
POLICY="mko.cpupower.setcpufreq"
RULEIN="${DIR}/../data/mko.cpupower.policy.in"
RULEDIR="/usr/share/polkit-1/actions"
RULEOUT="${RULEDIR}/${POLICY}.policy"

if [ $# -lt 1 ]
then
    echo "Usage: installer.sh {supported,install,check,uninstall}"
    exit 1
fi

if [ "$1" = "supported" ]
then
    ls /sys/devices/system/cpu/intel_pstate > /dev/null 2>&1 || (echo "Unsupported" && exit 5) && echo "Supported"
    exit $?
fi

if [ "$1" = "check" ]
then

    sed "s:xxxPATHxxx:${CFC}:g" "${RULEIN}" | \
        cmp --silent "${RULEOUT}" || (echo "Not installed" && exit 6) && echo "Installed"
    exit $?
fi

if [ "$1" = "install" ]
then
    echo -n "Installing policykit action... "
    sed "s:xxxPATHxxx:${CFC}:g" "${RULEIN}" > "${RULEOUT}" 2>/dev/null || (echo "Failed" && exit 2)
    echo "Success"

    echo -n "Fixing permissions... "
    chown root:root "${CFC}" || (echo "Failed to change owner" && exit 3)
    chmod 0555 "${CFC}" || (echo "Failed to set permissions" && exit 4)
    echo "Success"

    exit 0
fi

if [ "$1" = "uninstall" ]
then
    echo -n "Uninstalling policykit action... "
    if [ -f "${RULEOUT}" ]
    then
        rm "${RULEOUT}" || (echo "Fail - cannot remove" && exit 7) && echo "Success"
    else
        echo "Fail - not installed" && exit 6
    fi
    exit 0
fi

echo "Unknown parameter. See usage."
exit 1
