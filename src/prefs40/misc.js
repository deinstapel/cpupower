const Gio = imports.gi.Gio;

/* exported extensionUtils */
var extensionUtils = {
    getCurrentExtension: () => {
        return {
            imports,
            dir: Gio.File.new_for_path(imports.system.programPath).get_parent().get_parent().get_parent(),
        };
    },
};

/* exported config */
var config = {
    PACKAGE_VERSION: "40.0",
};
