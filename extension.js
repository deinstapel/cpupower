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
const SETTINGS_ID = 'org.gnome.shell.extensions.cpupower';


const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

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
    return this.minFrequency.toString() + ':' + this.maxFrequency.toString() + ':' + (this.isTurboBoostActive ? 'true' : 'false') + ':' + this._name;
  },
  load: function(input)
  {
    var input2 = input.split(':');
    this.setMinFrequency(parseInt(input2[0]));
    this.setMaxFrequency(parseInt(input2[1]));
    if((input2[2] ==="true"))
      this.setTurboBoost(true);
    else
      this.setTurboBoost(false);

    this.setName(input2[3]);
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

  _init: function() 
  {
    this.settings = Convenience.getSettings(SETTINGS_ID);
    var profileString = this.settings.get_string('profiles').split(';');
    log(profileString);
    this.profiles = [];
    for(var j = 0; j < profileString.length; j++)
    {
      var profile = new CPUFreqProfile();
      profile.load(profileString[j]);
      this.profiles.push(profile);
    }

    this.cpufreq = 800;
    this.parent(null, 'cpupower');
    this.isTurboBoostActive = true;
    this.minVal = 0;
    this.maxVal = 30;
    this.pkexec_path = GLib.find_program_in_path('pkexec');
    let result = GLib.spawn_command_line_sync(this.pkexec_path + ' cpufreqctl turbo get', this.out);
    let returnCode = result[1];
    if(returnCode == 0)
      this.isTurboBoostActive = false;
    else
      this.isTurboBoostActive = true;

    let result = GLib.spawn_command_line_sync(this.pkexec_path + ' cpufreqctl min get', this.out);
    let returnCode = result[1];
    this.minVal = returnCode;

    let result = GLib.spawn_command_line_sync(this.pkexec_path + ' cpufreqctl max get', this.out);
    let returnCode = result[1];
    this.maxVal = returnCode;



    Main.panel.menuManager.addMenu(this.menu);
    this.hbox = new St.BoxLayout({style_class: 'panel-status-menu-box'});
    let gicon = Gio.icon_new_for_string(Me.path + '/icons/cpu.svg');
    let icon = new St.Icon({
        gicon: gicon,
        style_class: 'system-status-icon'
    });
    this.hbox.add_actor(icon);

    this._label = new St.Label({text: _('CPU'), y_expand: true, y_align: Clutter.ActorAlign.CENTER});
    this.hbox.add_actor(PopupMenu.arrowIcon(St.Side.BOTTOM));

    this._freqSection = new PopupMenu.PopupMenuSection();
    this.menu.addMenuItem(this._freqSection);

    this._createMenu();
  },
  _enable: function()
  {
    this.actor.add_actor(this.hbox);
    this.timeout = Mainloop.timeout_add_seconds(1, Lang.bind(this, this._updateFreq));
  },
  _createMenu: function()
  {
    this.imMinTitle = new PopupMenu.PopupMenuItem(_('Minimum Frequency:'), {reactive: false});
    this.imMinLabel = new St.Label({text: this._getMinText()});
    this.imMinTitle.actor.add_child(this.imMinLabel, {align: St.Align.END});

    this.imMaxTitle = new PopupMenu.PopupMenuItem(_('Maximum Frequency:'), {reactive: false});
    this.imMaxLabel = new St.Label({text: this._getMaxText()});
    this.imMaxTitle.actor.add_child(this.imMaxLabel, {align: St.Align.END});

    this.imTurboSwitch = new PopupMenu.PopupSwitchMenuItem(_('Turbo Boost:'), this.isTurboBoostActive);
    this.imTurboSwitch.connect('toggled', Lang.bind(this, function(item)
    {
      if(item.state)
      {
        this.isTurboBoostActive = true;
        this._updateTurbo(1);
      }
      else
      {
        this.isTurboBoostActive = false;
        this._updateTurbo(0);
      }
    }));

    this.imSliderMin = new PopupMenu.PopupBaseMenuItem({activate: false});
    this.minSlider = new Slider.Slider(this.minVal / 100);
    this.minSlider.connect('value-changed', Lang.bind(this, function(item)
    {
      this.minVal = Math.floor(item.value * 100);
      this.imMinLabel.set_text(this._getMinText());
      this._updateMin(); 
    }));
    this.imSliderMin.actor.add(this.minSlider.actor, {expand: true});

    this.imSliderMax = new PopupMenu.PopupBaseMenuItem({activate: false});
    this.maxSlider = new Slider.Slider(this.maxVal / 100);
    this.maxSlider.connect('value-changed', Lang.bind(this, function(item)
    {
      this.maxVal = Math.floor(item.value * 100);
      this.imMaxLabel.set_text(this._getMaxText());
      this._updateMax();
    }));
    this.imSliderMax.actor.add(this.maxSlider.actor, {expand: true});

    this.imCurrentTitle = new PopupMenu.PopupMenuItem(_('Current Frequency:'), {reactive:false});
    this.imCurrentLabel = new St.Label({text: this._getCurFreq()});
    this.imCurrentTitle.actor.add_child(this.imCurrentLabel, {align: St.Align.END});


    this._freqSection.addMenuItem(this.imMinTitle);
    this._freqSection.addMenuItem(this.imSliderMin);
    this._freqSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this._freqSection.addMenuItem(this.imMaxTitle);
    this._freqSection.addMenuItem(this.imSliderMax);
    this._freqSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this._freqSection.addMenuItem(this.imTurboSwitch);
    this._freqSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this._freqSection.addMenuItem(this.imCurrentTitle);
    this._freqSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    for(var i = 0; i < this.profiles.length; i++)
    {
      var uiComponent= this.profiles[i].getUiComponent();
      uiComponent.connect('activate', Lang.bind(this, function(item)
      {
        this._applyProfile(item.getProfile());
      }));
      this._freqSection.addMenuItem(uiComponent);
    }
    
    this._freqSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.imPrefsBtn = new PopupMenu.PopupMenuItem(_('Preferences'));
    this.imPrefsBtn.connect('activate', Lang.bind(this, this._onPreferencesActivate));
    
    this._freqSection.addMenuItem(this.imPrefsBtn);

  },
  _applyProfile: function(profile)
  {
    this.minVal = profile.getMinFrequency();
    this.imMinLabel.set_text(this._getMinText());
    this.minSlider.setValue(this.minVal / 100.0);
    this._updateMin();

    this.maxVal = profile.getMaxFrequency();
    this.imMaxLabel.set_text(this._getMaxText());
    this.maxSlider.setValue(this.maxVal / 100.0);
    this._updateMax();

    this.isTurboBoostActive = profile.getTurboBoost();
    this.imTurboSwitch.setToggleState(this.isTurboBoostActive);
    if(this.isTurboBoostActive)
      this._updateTurbo(1);
    else
      this._updateTurbo(0);
  },
  _disable: function()
  {
    this.actor.remove_actor(this.hbox);
    Mainloop.source_remove(this.timeout);
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
    Util.trySpawnCommandLine(this.pkexec_path + ' cpufreqctl max ' + Math.floor(this.maxVal).toString());
  },
  _updateMin: function()
  {
    Util.trySpawnCommandLine(this.pkexec_path + ' cpufreqctl min ' + Math.floor(this.minVal));
  },
  _updateTurbo: function(state)
  {
    Util.trySpawnCommandLine(this.pkexec_path + ' cpufreqctl turbo ' + state.toString());
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
      break;
    }
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
    Util.spawn(["gnome-shell-extension-prefs","cpupower@mko-sl.de"]);
	return 0;
  },
});

function init(meta) 
{
  Convenience.initTranslations('gnome-shell-extension-cpupower');
}

let _indicator;

function enable() {
	try{
    _indicator = new CPUFreqIndicator();
    Main.panel.addToStatusArea('cpupower', _indicator);
    _indicator._enable();
}   catch(e){
	global.log(e.message);
}
}

function disable() {
    _indicator._disable();
    _indicator.destroy();
}
