#! /usr/bin/env gjs

import Gio from "gi://Gio";
// imports.gi.versions.Gtk = "3.0";
import Gtk from "gi://Gtk?version=4.0";
//import * as prefs from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

// imports.searchPath.unshift(scriptdir.get_path());
// imports.searchPath.unshift(scriptdir.get_parent().get_parent().get_path());

//const prefs = imports.prefs;

//let scriptdir = Gio.File.new_for_path(imports.system.programPath).get_parent();

Gtk.init(null);
//prefs.init();

let win = new Gtk.Window();
win.connect("delete-event", () => {
    Gtk.main_quit();
});
let headerbar = new Gtk.HeaderBar();
headerbar.set_show_close_button(true);
headerbar.title = "CPU Power Manager";
win.set_titlebar(headerbar);
let mainWidget = prefs.buildPrefsWidget();
win.add(mainWidget);
win.show_all();

Gtk.main();
