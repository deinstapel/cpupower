import Gio from "gi://Gio";
import Gtk from "gi://Gtk?version=4.0";

import {
    ExtensionUtils,
    gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

/* exported extensionUtils */
var extensionUtils = ExtensionUtils.getCurrentExtension();

/* exported config */
var Config = {
    PACKAGE_VERSION: "45.0",
};
