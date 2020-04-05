#!/bin/bash

set -e

for po in locale/*.po
do
    lang="${po%.po}"
    "${MSGFMT}" --output "${lang/_??/}/LC_MESSAGES/gnome-shell-extension-cpupower.mo" "$po"
done
