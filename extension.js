/*
 * 
 *  CPUPower for GNOME Shell preferences 
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2015
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


const St = imports.gi.St;
const Atk = imports.gi.Atk;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const Panel = imports.ui.panel;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;
const Slider = imports.ui.slider;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;
const Shell = imports.gi.Shell;

const Gettext = imports.gettext.domain('gnome-shell-extension-cpupower');
const _ = Gettext.gettext;
const SETTINGS_ID = 'org.gnome.shell.extensions.cpupower'
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const EXTENSIONDIR = Me.dir.get_path();

const CPUFreqProfileButton = new Lang.Class({
	Name: 'cpupower.CPUFreqProfileButton',
	Extends: PopupMenu.PopupMenuItem,
	_init: function(profile)
	{
		this._profile = profile;
		this.parent(_(this._profile.getName()), {reactive:true});
	},
	
	getProfile : function()
	{
		return this._profile;
	},
});


const CPUFreqProfile = new Lang.Class({
	Name: 'cpupower.CPUFreqProfile',
	
	_init: function()
	{
		this.minFrequency=0;
		this.maxFrequency=100;
		this.isTurboBoostActive=true;
		this._name = 'Default';
		this.imLabel = new CPUFreqProfileButton(this);
	},
	
	getMinFrequency: function()
	{
		return this.minFrequency;
	},
	
	getMaxFrequency: function()
	{
		return this.maxFrequency;
	},
	
	getTurboBoost: function()
	{
		return this.isTurboBoostActive;
	},
	
	getName: function()
	{
		return this._name;
	},
	
	save: function()
	{
		return new Array( this.minFrequency, this.maxFrequency, this.isTurboBoostActive, this._name);
	},
	
	load: function(input)
	{
		this.setMinFrequency(input[0]);
		this.setMaxFrequency(input[1]);
		this.setTurboBoost(input[2]);
		this.setName(input[3]);
	},
	
	setMinFrequency: function(value)
	{
		this.minFrequency = value;
	},
	
	setMaxFrequency: function(value)
	{
		this.maxFrequency = value;
	},
	
	setTurboBoost: function(value)
	{
		this.isTurboBoostActive = value;
	},
	
	setName: function(value)
	{
		this._name = value;
		this.imLabel = new CPUFreqProfileButton(this);
	},
	
	getUiComponent: function()
	{
		return this.imLabel;
	},
});

const CPUFreqIndicator = new Lang.Class({
	Name: 'cpupower.CPUFreqIndicator',
	Extends: PanelMenu.Button,
	
	_init: function(installed) 
	{
		this.installed = installed;
		let that = this;
		this.settings = Convenience.getSettings(SETTINGS_ID);

		this.cpufreq = 800;
		this.parent(null, 'cpupower');
		this.isTurboBoostActive = true;
		this.minVal = 0;
		this.maxVal = 30;
		this.pkexec_path = GLib.find_program_in_path('pkexec');
		this.cpufreqctl_path = EXTENSIONDIR + '/cpufreqctl';
		
		let result = GLib.spawn_command_line_sync(this.cpufreqctl_path + ' turbo get', this.out);
		let returnCode = result[1];
		this.isTurboBoostActive = returnCode;
		result = GLib.spawn_command_line_sync(this.cpufreqctl_path + ' min get', this.out);
		returnCode = result[1];
		this.minVal = returnCode;
		
		result = GLib.spawn_command_line_sync(this.cpufreqctl_path + ' max get', this.out);
		returnCode = result[1];
		this.maxVal = returnCode;
		
		
		
		Main.panel.menuManager.addMenu(this.menu);
		this.hbox = new St.BoxLayout({style_class: 'panel-status-menu-box'});
		let gicon = Gio.icon_new_for_string(Me.path + '/icons/cpu.svg');
		let icon = new St.Icon({
			gicon: gicon,
			style_class: 'system-status-icon'
		});
		
		this.lbl = new St.Label({text: "", y_expand:true, y_align: Clutter.ActorAlign.CENTER});
		this.hbox.add_actor(this.lbl);
		
		
		this.lblActive = (this.settings.get_boolean("show-freq-in-taskbar"))
		
		this.hbox.add_actor(icon);
		this.hbox.add_actor(PopupMenu.arrowIcon(St.Side.BOTTOM));
		
		this._createMenu(that);
		this.settings.connect("changed", function() {that._createMenu(that)});
		
		
	},
	
	_enable: function()
	{
		this.actor.add_actor(this.hbox);
		if(!this.installed && this.pkexec_path != null)
		{
		this.timeout = Mainloop.timeout_add_seconds(1, Lang.bind(this, this._updateFreq));
		this.timeout_mm = Mainloop.timeout_add_seconds(1, Lang.bind(this, this._updateFreqMm));
		}
	},
	
	
	_createMenu: function(that)
	{
		if(that._freqSection)
			that.menu.removeAll();
		
		that.lblActive = (that.settings.get_boolean("show-freq-in-taskbar"));
		
		that._freqSection = new PopupMenu.PopupMenuSection();
		that.menu.addMenuItem(that._freqSection);
		
		//Check for installed policykit
		if(that.pkexec_path == null)
		{
			that.imPkexecTitle = new PopupMenu.PopupMenuItem(_('No Policykit installed.'), {reactive: false});
			that._freqSection.addMenuItem(that.imPkexecTitle);
			return;
		}
		
		if(that.installed)
		{
			that.imInstallTitle = new PopupMenu.PopupMenuItem(_("Installation required."),{reactive:true});
			that.imInstallTitle.connect("activate", function(){
				// Notification for the installation
				global.logError("activate @Install");
				global.log("activate @Install");
				let fname = EXTENSIONDIR + "/installation.txt";
				let content = Shell.get_file_contents_utf8_sync(fname);
				let monitor = Main.layoutManager.primaryMonitor;
				let text = new St.Label({style_class: 'notification-label', text: content});
				global.stage.add_actor(text);
				text.set_position(Math.floor(monitor.width / 2 - text.width / 2), Math.floor(monitor.height / 2 - text.height / 2));
				Mainloop.timeout_add(5000, function() {text.destroy();});
			});
			that._freqSection.addMenuItem(that.imInstallTitle);
			return;
		}
		let _profiles = that.settings.get_value('profiles');
		global.log(_profiles);
		_profiles = _profiles.deep_unpack();
		that.profiles = [];
		for(var j = 0; j < _profiles.length; j++)
		{
			var profile = new CPUFreqProfile();
			profile.load(_profiles[j]);
			that.profiles.push(profile);
		}
		that.imMinTitle = new PopupMenu.PopupMenuItem(_('Minimum Frequency:'), {reactive: false});
		that.imMinLabel = new St.Label({text: that._getMinText()});
		that.imMinTitle.actor.add_child(that.imMinLabel, {align: St.Align.END});
		
		that.imMaxTitle = new PopupMenu.PopupMenuItem(_('Maximum Frequency:'), {reactive: false});
		that.imMaxLabel = new St.Label({text: that._getMaxText()});
		that.imMaxTitle.actor.add_child(that.imMaxLabel, {align: St.Align.END});
		
		that.imTurboSwitch = new PopupMenu.PopupSwitchMenuItem(_('Turbo Boost:'), that.isTurboBoostActive);
		that.imTurboSwitch.connect('toggled', Lang.bind(that, function(item)
		{
			if(item.state)
			{
				that.isTurboBoostActive = true;
				that._updateTurbo(1);
			}
			else
			{
				that.isTurboBoostActive = false;
				that._updateTurbo(0);
			}
		}));
		
		that.imSliderMin = new PopupMenu.PopupBaseMenuItem({activate: false});
		that.minSlider = new Slider.Slider(that.minVal / 100);
		that.minSlider.connect('value-changed', Lang.bind(that, function(item)
		{
			that.minVal = Math.floor(item.value * 100);
			that.imMinLabel.set_text(that._getMinText());
			that._updateMin(); 
		}));
		that.imSliderMin.actor.add(that.minSlider.actor, {expand: true});
		
		that.imSliderMax = new PopupMenu.PopupBaseMenuItem({activate: false});
		that.maxSlider = new Slider.Slider(that.maxVal / 100);
		that.maxSlider.connect('value-changed', Lang.bind(that, function(item)
		{
			that.maxVal = Math.floor(item.value * 100);
			that.imMaxLabel.set_text(that._getMaxText());
			that._updateMax();
		}));
		that.imSliderMax.actor.add(that.maxSlider.actor, {expand: true});
		
		that.imCurrentTitle = new PopupMenu.PopupMenuItem(_('Current Frequency:'), {reactive:false});
		that.imCurrentLabel = new St.Label({text: that._getCurFreq()});
		that.imCurrentTitle.actor.add_child(that.imCurrentLabel, {align: St.Align.END});
		
		that._freqSection.addMenuItem(that.imMinTitle);
		that._freqSection.addMenuItem(that.imSliderMin);
		that._freqSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		that._freqSection.addMenuItem(that.imMaxTitle);
		that._freqSection.addMenuItem(that.imSliderMax);
		that._freqSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		that._freqSection.addMenuItem(that.imTurboSwitch);
		that._freqSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		that._freqSection.addMenuItem(that.imCurrentTitle);
		that._freqSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		
		for(var i = 0; i < that.profiles.length; i++)
		{
			var uiComponent= that.profiles[i].getUiComponent();
			uiComponent.connect('activate', Lang.bind(that, function(item)
			{
				that._applyProfile(item.getProfile());
			}));
			that._freqSection.addMenuItem(uiComponent);
		}
		
		that._freqSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		that.imPrefsBtn = new PopupMenu.PopupMenuItem(_('Preferences'));
		that.imPrefsBtn.connect('activate', Lang.bind(that, that._onPreferencesActivate));
		
		that._freqSection.addMenuItem(that.imPrefsBtn);
		
	},
	
	_applyProfile: function(profile)
	{
        
		this.minVal = profile.getMinFrequency();
		this._updateMin();
		
		this.maxVal = profile.getMaxFrequency();
		this._updateMax();
		
		this.isTurboBoostActive = profile.getTurboBoost();
		if(this.isTurboBoostActive)
			this._updateTurbo(1);
		else
			this._updateTurbo(0);
		
		this._updateUi();
	},
	
	_disable: function()
	{
		this.actor.remove_actor(this.hbox);
		Mainloop.source_remove(this.timeout);
		Mainloop.source_remove(this.timeout_mm);
	},
	
	_getMinText: function()
	{
		return Math.floor(this.minVal).toString() + '%';
	},
	
	_getMaxText: function()
	{
		return Math.floor(this.maxVal).toString() + '%';
	},
	
	_updateMax: function()
	{
		if(!this.menu.isOpen) return;
		let cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' max ' + Math.floor(this.maxVal).toString();
		global.log(cmd);
		Util.trySpawnCommandLine(cmd);
	},
	
	_updateMin: function()
	{
		if(!this.menu.isOpen) return;
		let cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' min ' + Math.floor(this.minVal).toString();
		global.log(cmd);
		Util.trySpawnCommandLine(cmd);
	},
	
	_updateTurbo: function(state)
	{
		if(!this.menu.isOpen) return;
		let cmd = this.pkexec_path + ' ' + this.cpufreqctl_path + ' turbo ' + state.toString();
		global.log(cmd);
		Util.trySpawnCommandLine(cmd);
	},
	
	_updateUi: function()
	{
		this.imMinLabel.set_text(this._getMinText());
		this.minSlider.setValue(this.minVal / 100.0);
		
		this.imMaxLabel.set_text(this._getMaxText());
		this.maxSlider.setValue(this.maxVal / 100.0);
		
		this.imTurboSwitch.setToggleState(this.isTurboBoostActive);
		
		for(var i = 0; i < this.profiles.length; i++)
		{
			var o = PopupMenu.Ornament.NONE;
			var p = this.profiles[i];
			if(this.minVal == p.getMinFrequency() && this.maxVal == p.getMaxFrequency() && this.isTurboBoostActive == p.getTurboBoost())
				o = PopupMenu.Ornament.DOT;
			p.getUiComponent().setOrnament(o);
			
		}
	},
	_updateFreq: function()
	{
		let lines = Shell.get_file_contents_utf8_sync('/proc/cpuinfo').split("\n");
		for(let i = 0; i < lines.length; i++) 
		{
			let line = lines[i];
			
			if(line.search(/cpu mhz/i) < 0)
				continue;
			this.cpufreq = parseInt(line.substring(line.indexOf(':') + 2));
			this.imCurrentLabel.set_text(this._getCurFreq());
			if(this.lblActive)
				this.lbl.set_text(this._getCurFreq());
			else
				this.lbl.set_text(""); 
			break;
		}
		return true;
	},
	
	_updateFreqMm: function()
	{
		if(!this.menu.isOpen) return true;
										
		let [res, out] = GLib.spawn_command_line_sync(this.cpufreqctl_path + ' turbo get');
		this.isTurboBoostActive = parseInt(out.toString()) == 1;
		
		let [res, out] = GLib.spawn_command_line_sync(this.cpufreqctl_path + ' min get');
		this.minVal = parseInt(out.toString());
		
		let [res, out] = GLib.spawn_command_line_sync(this.cpufreqctl_path + ' max get');
		this.maxVal = parseInt(out.toString());
		this._updateUi();
		return true;
	},
	
	_getCurFreq: function()
	{
		return this.cpufreq.toString() + 'MHz';
	},
	
	destroy: function()
	{
		this.parent();
	},
	
	_onPreferencesActivate : function(item)
	{
		Util.trySpawnCommandLine("bash -c \"gnome-shell-extension-prefs cpupower@mko-sl.de >> /tmp/extlog\""); //ensure this will get logged
		return 0;
	},
});

function init(meta) 
{
	Convenience.initTranslations('gnome-shell-extension-cpupower');
}

let _indicator;
let install = false;
function enable() 
{
			
	if(!GLib.file_test(EXTENSIONDIR + '/.pgen', GLib.FileTest.EXISTS))
	{
		let sedCmd = 'sed -i \"s/xxxPATHxxx/' + EXTENSIONDIR.replace(/\//g, '\\/').replace(/\./g, '\\.') + '\\/cpufreqctl/\" ' + EXTENSIONDIR + '/mko.cpupower.policy';
		global.log(sedCmd);
		Util.trySpawnCommandLine(sedCmd);
		Util.trySpawnCommandLine('touch ' + EXTENSIONDIR + '/.pgen');
		global.logError("Installation needed. see https://github.com/martin31821/cpupower/wiki/Installation");
		install = true;
	}
	try
	{
		_indicator = new CPUFreqIndicator(install);
		Main.panel.addToStatusArea('cpupower', _indicator);
		_indicator._enable();
		shown = true;
	}
	catch(e)
	{
		global.logError(e.message);
	}
}

function disable() 
{
	_indicator._disable();
	_indicator.destroy();
}
