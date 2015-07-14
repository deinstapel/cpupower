#!/bin/bash
if [ $# -lt 2 ]
then
	echo "Usage: cpufreqctl.sh {turbo|min|max} {value}"
	exit
fi
if [ $1 = "turbo" ]
then
	if [ $2 = "get" ]
	then
		value=$(</sys/devices/system/cpu/intel_pstate/no_turbo)
		if [ $value -eq 0 ]
		then
			echo 1
		else
			echo 0
		fi
		exit
	fi
	if [ $2 -lt 0 ] || [ $2 -gt 1 ];
	then
		echo "{value} must be 0 or 1"
		exit
	fi

	if [ $2 -eq 1 ]
	then
		echo 0 > /sys/devices/system/cpu/intel_pstate/no_turbo
	else
		echo 1 > /sys/devices/system/cpu/intel_pstate/no_turbo
	fi
	exit
fi
if [ $1 = "max" ]
then
	if [ $2 = "get" ] 
	then
		value=$(</sys/devices/system/cpu/intel_pstate/max_perf_pct)
		echo $value
		exit
	fi
	if [ $2 -lt 0 ] || [ $2 -gt 100 ];
	then 
		echo "{value} must be between 0 and 100"
		exit
	fi
	echo $2 > /sys/devices/system/cpu/intel_pstate/max_perf_pct
	exit
fi
if [ $1 = "min" ]
then
	if [ $2 = "get" ] 
	then
		value=$(</sys/devices/system/cpu/intel_pstate/min_perf_pct)
		echo $value
		exit
	fi
	if [ $2 -lt 0 ] || [ $2 -gt 100 ];
	then
		echo "{value} must be between 0 and 100"
		exit
	fi
	echo $2 > /sys/devices/system/cpu/intel_pstate/min_perf_pct
	exit
fi
