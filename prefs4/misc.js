const Gio = imports.gi.Gio;

var extensionUtils = {
    getCurrentExtension: () => {
        return {
            imports: imports,
            dir: Gio.File.new_for_path(imports.system.programPath).get_parent().get_parent(),
        };
    },
};

var config = {
    PACKAGE_VERSION: "40.0",
};

