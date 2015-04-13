/*
 *
 *  Weather extension for GNOME Shell preferences 
 *  - Creates a widget to set the preferences of the weather extension
 *
 * Copyright (C) 2012
 *     Canek Peláez <canek@ciencias.unam.mx>,
 *     Christian METZLER <neroth@xeked.com>,
 *
 * This file is part of gnome-shell-extension-weather.
 *
 * gnome-shell-extension-weather is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.
 *
 * gnome-shell-extension-weather is distributed in the hope that it
 * will be useful, but WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE.  See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-weather.  If not, see
 * <http://www.gnu.org/licenses/>.
 *
 */

const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const GtkBuilder = Gtk.Builder;
const Gio = imports.gi.Gio;
const Gettext = imports.gettext.domain('gnome-shell-extension-cpupower');
const _ = Gettext.gettext;
const Soup = imports.gi.Soup;
const GWeather = imports.gi.GWeather;

const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const EXTENSIONDIR = Me.dir.get_path();

const SETTINGS_SCHEMA = 'org.gnome.shell.extensions.cpupower';

const CPUPowerPrefsWidget = new GObject.Class(
{
Name: 'cpupower.Prefs.Widget',
GTypeName: 'CPUPowerPrefsWidget',
Extends: Gtk.Box,

	_init: function(params)
	{
	this.parent(params);

	this.initWindow();

	this.add(this.MainWidget);
	},

	status : function()
	{
		if(typeof __logfile__ == "undefined")
		{
		__logfile__ = Gio.file_new_for_path(GLib.get_user_cache_dir()+"/cpupower-extension-prefs.log");
			if(__logfile__.query_exists(null))
			__logfile__.delete(null);
		}

		if(!this.debug)
		return 0;

	let fileOutput = __logfile__.append_to(Gio.FileCreateFlags.PRIVATE,null);
		if(!arguments[0])
		fileOutput.write("\n",null);
		else
		fileOutput.write("["+new Date().toString()+"] "+arguments[0]+"\n",null);
	fileOutput.close(null);
	return 0;
	},

	Window : new Gtk.Builder(),

	initWindow : function()
	{												
	this.status("Init window");
	this.Window.add_from_file(EXTENSIONDIR+"/cpupower-settings.ui");					
	this.status("CPUPower Settings UI loaded");
	this.MainWidget = this.Window.get_object("main-widget");
						
	this.status("Inited config widget");
	},

});

function init()
{
Convenience.initTranslations('gnome-shell-extension-cpupower');
}

function buildPrefsWidget()
{
let widget = new CPUPowerPrefsWidget();
widget.show_all();
return widget;
}
