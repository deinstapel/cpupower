/*
 *
 *  CPUPower for GNOME Shell preferences 
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2012
 *     Martin Koppehel <psl.kontakt@gmail.com>,
 *
 * This file is part of the gnome-shell extension cpupower.
 *
 * gnome-shell extension cpupower is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.
 *
 * gnome-shell extension cpupower is distributed in the hope that it
 * will be useful, but WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE.  See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell extension cpupower.  If not, see
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
	global.log("init");
	this.parent(params);

	this.initWindow();

	this.add(this.MainWidget);
	},

	status : function()
	{
		global.log(arguments[0]);
	},

	Window : new Gtk.Builder(),

	initWindow : function()
	{												
	  this.status("Init window");
	  this.Window.add_from_file(EXTENSIONDIR+"/cpupower-settings.ui");					
	  this.status("CPUPower Settings UI loaded");
	  this.MainWidget = this.Window.get_object("main-widget");
	  this.liststore = this.Window.get_object("liststore");
	  this.initConfigWidget();
	  this.addLabel(_("Show current frequency"));
	  this.addSwitch("show_freq_taskbar");
	  
	  this.status("Inited config widget");
	},
	
	addLabel : function(text)
	{
	  let l = new Gtk.Label({label:text,xalign:0});
	  l.visible = 1;
	  l.can_focus = 0;
	  this.right_widget.attach(l, this.x[0],this.x[1], this.y[0],this.y[1],0,0,0,0);
	  this.inc();
	},

	addComboBox : function(a,b)
	{
	  let that = this;
	  let cf = new Gtk.ComboBoxText();
	  this.configWidgets.push([cf,b]);
	  cf.visible = 1;
	  cf.can_focus = 0;
	  cf.width_request = 100;
      for(let i in a)
	  {
		if(a[i] != 0)
		cf.append(i, a[i]);
	  }
	  cf.active_id = String(this[b]);
	  cf.connect("changed",function(){try{that[b] = Number(arguments[0].get_active_id());}catch(e){that.status(e);}});
	  this.right_widget.attach(cf, this.x[0],this.x[1], this.y[0],this.y[1],0,0,0,0);
	  this.inc();											
	  this.status("Added comboBox("+(this.configWidgets.length-1)+") "+b+" active_id : "+this[b]);
	  return 0;
	},

	addSwitch : function(a)
	{
	  let that = this;
	  let sw = new Gtk.Switch();
	  this.configWidgets.push([sw,a]);
	  sw.visible = 1;
	  sw.can_focus = 0;
	  sw.active = this[a];
	  sw.connect("notify::active",function(){that[a] = arguments[0].active;});
	  this.right_widget.attach(sw, this.x[0],this.x[1], this.y[0],this.y[1],0,0,0,0);
	  this.inc();
	},
	
	inc : function()
	{
	  if(arguments[0])
	  {
		this.x[0] = 0;
		this.x[1] = 1;
		this.y[0] = 0;
		this.y[1] = 1;
		return 0;
	  }

	  if(this.x[0] == 1)
	  {
		this.x[0] = 0;
		this.x[1] = 1;
		this.y[0] += 1;
		this.y[1] += 1;
		return 0;
	  }
	  else
	  {
		this.x[0] += 1;
		this.x[1] += 1;
		return 0;
      }
	},
	
	initConfigWidget : function()
	{
	  this.configWidgets.splice(0, this.configWidgets.length);
	  this.inc(1);
	  let a = this.Window.get_object("right-widget-table");
	  a.visible = 1;
	  a.can_focus = 0;
	  this.right_widget = a;
	  this.addb = this.Window.get_object("tree-toolbutton-add");
	  this.remb = this.Window.get_object("tree-toolbutton-remove");
	  let that = this;
	  this.addb.connect("clicked", function() {
	  	//add new profile
	  	that.status("add");
	  });
	  
	  this.remb.connect("clicked", function() {
	  	//remove selected profile
	  	that.status("remove");
	  });
	},	
	
	refreshUI : function()
	{
	  this.status("Refresh UI");
	},
	
	loadConfig : function()
	{
	  let that = this;
   	  this.Settings = Convenience.getSettings(SETTINGS_SCHEMA);	
	  this.Settings.connect("changed", function(){that.status(0); that.refreshUI();});
	},

	get show_freq_taskbar()
	{
	  if(!this.Settings)
	    this.loadConfig();
	  return this.Settings.get_boolean("show-freq-in-taskbar");
	},

	set show_freq_taskbar(v)
	{
	  if(!this.Settings)
		this.loadConfig();
	  this.Settings.set_boolean("show-freq-in-taskbar",v);
	},
	
	x : [0,1],

	y : [0,1],

	configWidgets : [],
	
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
