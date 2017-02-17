#!/bin/bash

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" #stackoverflow 59895
CFC=$DIR/cpufreqctl
POLICY=mko.cpupower.setcpufreq
RULEIN=$DIR/mko.cpupower.policy.in
RULEDIR=/usr/share/polkit-1/actions
RULEOUT=$RULEDIR/$POLICY.policy

if [ $# -lt 1 ]
then
	echo "Usage: installer.sh {supported|install|check}"
	exit1
fi

if [ $1 = "supported" ]
then
	ls /sys/devices/system/cpu/intel_pstate > /dev/null 2>&1 || (echo "Unsupported" && exit 5) && echo "Supported"
	exit $?
fi

if [ $1 = "check" ]
then
	pkaction --action-id mko.cpupower.setcpufreq 2>/dev/null | grep $POLICY > /dev/null 2>&1 || (echo "Not installed" && exit 6) && echo "Installed"
	exit $?
fi

if [ $1 = "install" ]
then
	echo -n "Installing policykit action... "
	sed "s:xxxPATHxxx:$CFC:g" "$RULEIN" > "$RULEOUT" 2>/dev/null || (echo "Failed" && exit 2)
	echo "Success"
	
	echo -n "Fixing permissions... "
	chown root:root "$CFC" || (echo "Failed to change owner" && exit 3)
	chmod 0555 "$CFC" || (echo "Failed to set permissions" && exit 4)
	echo "Success"

	exit 0
fi

echo "Unknown parameter. see usage"
exit 1;
