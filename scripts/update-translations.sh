#!/bin/bash

set -e

for po in locale/*.po
do
    lang="${po%.po}"
    mkdir -p "${lang/_??/}/LC_MESSAGES"
    "${MSGFMT}" --output "${lang/_??/}/LC_MESSAGES/gnome-shell-extension-cpupower.mo" "$po"
done
