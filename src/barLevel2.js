/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
/* exported BarLevel */

const { Atk, Clutter, GObject, St } = imports.gi;
const Config = imports.misc.config;

var BarLevel2 = GObject.registerClass({
    GTypeName: 'BarLevel2',
    Properties: {
        'value': GObject.ParamSpec.double(
            'value', 'value', 'value',
            GObject.ParamFlags.READWRITE,
            0, 2, 0),
        'maximum-value': GObject.ParamSpec.double(
            'maximum-value', 'maximum-value', 'maximum-value',
            GObject.ParamFlags.READWRITE,
            1, 2, 1),
        'overdrive-start': GObject.ParamSpec.double(
            'overdrive-start', 'overdrive-start', 'overdrive-start',
            GObject.ParamFlags.READWRITE,
            1, 2, 1),
        'blocked-minimum': GObject.ParamSpec.double(
            'blocked-minimum', 'blocked-minimum', 'blocked-minimum',
            GObject.ParamFlags.READWRITE,
            0, 2, 0),
        'blocked-maximum': GObject.ParamSpec.double(
            'blocked-maximum', 'blocked-maximum', 'blocked-maximum',
            GObject.ParamFlags.READWRITE,
            0, 2, 1),
    },
}, class BarLevel2 extends St.DrawingArea {
    _init(params) {
        this._maxValue = 1;
        this._value = 0;
        this._overdriveStart = 1;
        this._barLevelWidth = 0;
        this._blockedMin = 0;
        this._blockedMax = this._maxValue;

        let defaultParams = {
            style_class: 'barlevel',
            accessible_role: Atk.Role.LEVEL_BAR,
        };
        super._init(Object.assign(defaultParams, params));
        this.connect('notify::allocation', () => {
            this._barLevelWidth = this.allocation.get_width();
        });

        this._customAccessible = St.GenericAccessible.new_for_actor(this);
        this.set_accessible(this._customAccessible);

        this._customAccessible.connect('get-current-value', this._getCurrentValue.bind(this));
        this._customAccessible.connect('get-minimum-value', this._getMinimumValue.bind(this));
        this._customAccessible.connect('get-maximum-value', this._getMaximumValue.bind(this));
        this._customAccessible.connect('set-current-value', this._setCurrentValue.bind(this));

        this.connect('notify::value', this._valueChanged.bind(this));
    }

    get value() {
        return this._value;
    }

    set value(value) {
        value = Math.max(Math.min(value, this._maxValue), 0);

        if (this._value == value)
            return;

        this._value = value;
        this.notify('value');
        this.queue_repaint();
    }

    get blocked_minimum() {
        return this._blockedMin
    }

    set blocked_minimum(value) {
        value = Math.max(Math.min(value, this.blocked_maximum), 0);

        if (this._blockedMin == value)
            return;
        
        this._blockedMin = value;
        this.notify('blocked-minimum');
        this.queue_repaint();
    }

    get blocked_maximum() {
        return this._blockedMax
    }

    set blocked_maximum(value) {
        value = Math.max(Math.min(value, this._maxValue), this.blocked_minimum);

        if (this._blockedMax == value)
            return;
        
        this._blockedMax = value;
        this.notify('blocked-maximum');
        this.queue_repaint();
    }

    // eslint-disable-next-line camelcase
    get maximum_value() {
        return this._maxValue;
    }

    // eslint-disable-next-line camelcase
    set maximum_value(value) {
        value = Math.max(value, 1);

        if (this._maxValue == value)
            return;

        this._maxValue = value;
        this._overdriveStart = Math.min(this._overdriveStart, this._maxValue);
        this.notify('maximum-value');
        this.queue_repaint();
    }

    // eslint-disable-next-line camelcase
    get overdrive_start() {
        return this._overdriveStart;
    }

    // eslint-disable-next-line camelcase
    set overdrive_start(value) {
        if (this._overdriveStart == value)
            return;

        if (value > this._maxValue) {
            throw new Error(`Tried to set overdrive value to ${value}, ` +
                `which is a number greater than the maximum allowed value ${this._maxValue}`);
        }

        this._overdriveStart = value;
        this.notify('overdrive-start');
        this.queue_repaint();
    }

    vfunc_repaint() {
        let cr = this.get_context();
        let themeNode = this.get_theme_node();
        let [width, height] = this.get_surface_size();

        // fix for old Gnome releases
        let prefix = parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.29 ? "-barlevel" : "-slider";

        let barLevelHeight = themeNode.get_length(prefix + '-height');
        let barLevelBorderRadius = Math.min(width, barLevelHeight) / 2;
        let fgColor = themeNode.get_foreground_color();

        let barLevelColor = themeNode.get_color(prefix + '-background-color');
        let barLevelActiveColor = themeNode.get_color(prefix + '-active-background-color');
        let barLevelOverdriveColor;
        if (parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.29) {
            barLevelOverdriveColor = themeNode.get_color('-barlevel-overdrive-color');
        }

        let barLevelBorderWidth = Math.min(themeNode.get_length(prefix + '-border-width'), 1);
        let [hasBorderColor, barLevelBorderColor] =
            themeNode.lookup_color(prefix + '-border-color', false);
        if (!hasBorderColor)
            barLevelBorderColor = barLevelColor;
        let [hasActiveBorderColor, barLevelActiveBorderColor] =
            themeNode.lookup_color(prefix + '-active-border-color', false);
        if (!hasActiveBorderColor)
            barLevelActiveBorderColor = barLevelActiveColor;
        if (parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.29) {
            let [hasOverdriveBorderColor, barLevelOverdriveBorderColor] =
                themeNode.lookup_color('-barlevel-overdrive-border-color', false);
            if (!hasOverdriveBorderColor)
                barLevelOverdriveBorderColor = barLevelOverdriveColor;
        }

        const TAU = Math.PI * 2;

        let endX = 0;
        if (this._maxValue > 0)
            endX = barLevelBorderRadius + (width - 2 * barLevelBorderRadius) * this._value / this._maxValue;

        let overdriveSeparatorX = barLevelBorderRadius + (width - 2 * barLevelBorderRadius) * this._overdriveStart / this._maxValue;
        let overdriveActive = this._overdriveStart !== this._maxValue && parseFloat(Config.PACKAGE_VERSION.substring(0,4)) > 3.29;
        let overdriveSeparatorWidth = 0;
        if (overdriveActive)
            overdriveSeparatorWidth = themeNode.get_length('-barlevel-overdrive-separator-width');

        let deadBarColor = barLevelColor;
        let deadBarBorderColor = barLevelBorderColor;

        // performance optimization
        let barLevelTop = (height - barLevelHeight) / 2;
        let barLevelBottom = (height + barLevelHeight) / 2;

        /* background bar */
        let bx = (barLevelBorderRadius + (width - 2 * barLevelBorderRadius) * this._blockedMax / this._maxValue) + barLevelBorderRadius;
        let startBlockedMax = this._blockedMax < this._maxValue ? bx : width - barLevelBorderRadius - barLevelBorderWidth
        if (this._blockedMax < this._maxValue)
            cr.lineTo(startBlockedMax, barLevelBottom);
        else
            cr.arc(startBlockedMax, height / 2, barLevelBorderRadius, TAU * (3 / 4), TAU * (1 / 4));
        cr.lineTo(endX, barLevelBottom);
        cr.lineTo(endX, barLevelTop);
        cr.lineTo(startBlockedMax, barLevelTop);
        Clutter.cairo_set_source_color(cr, barLevelColor);
        cr.fillPreserve();
        Clutter.cairo_set_source_color(cr, barLevelBorderColor);
        cr.setLineWidth(barLevelBorderWidth);
        cr.stroke();

        // blocked minimum
        bx = 0;
        if (this._blockedMin > 0) {
            bx = barLevelBorderRadius + (width - 2 * barLevelBorderRadius) * this._blockedMin / this._maxValue;
            // bx = Math.min(bx, overdriveSeparatorX - overdriveSeparatorWidth / 2);
            cr.arc(barLevelBorderRadius + barLevelBorderWidth, height / 2, barLevelBorderRadius, TAU * (1 / 4), TAU * (3 / 4));
            cr.lineTo(bx, barLevelTop);
            cr.lineTo(bx, barLevelBottom);
            cr.lineTo(barLevelBorderRadius + barLevelBorderWidth, barLevelBottom);
            if (this._value > 0)
                Clutter.cairo_set_source_color(cr, deadBarColor);
            cr.fillPreserve();
            Clutter.cairo_set_source_color(cr, deadBarBorderColor);
            cr.setLineWidth(barLevelBorderWidth);
            cr.stroke();
        }

        /* normal progress bar */
        let x = Math.min(endX, overdriveSeparatorX - overdriveSeparatorWidth / 2);
        let startX = this._blockedMin > 0 ? bx : barLevelBorderRadius + barLevelBorderWidth + bx;
        if (this._blockedMin > 0)
            cr.lineTo(startX, barLevelTop);
        else
            cr.arc(startX, height / 2, barLevelBorderRadius, TAU * (1 / 4), TAU * (3 / 4));
        cr.lineTo(x, barLevelTop);
        cr.lineTo(x, barLevelBottom);
        cr.lineTo(startX, barLevelBottom);
        if (this._value > 0)
            Clutter.cairo_set_source_color(cr, barLevelActiveColor);
        cr.fillPreserve();
        Clutter.cairo_set_source_color(cr, barLevelActiveBorderColor);
        cr.setLineWidth(barLevelBorderWidth);
        cr.stroke();

        /* overdrive progress barLevel */
        x = Math.min(endX, overdriveSeparatorX) + overdriveSeparatorWidth / 2;
        if (this._value > this._overdriveStart) {
            cr.moveTo(x, barLevelTop);
            cr.lineTo(endX, barLevelTop);
            cr.lineTo(endX, barLevelBottom);
            cr.lineTo(x, barLevelBottom);
            cr.lineTo(x, barLevelTop);
            Clutter.cairo_set_source_color(cr, barLevelOverdriveColor);
            cr.fillPreserve();
            Clutter.cairo_set_source_color(cr, barLevelOverdriveBorderColor);
            cr.setLineWidth(barLevelBorderWidth);
            cr.stroke();
        }

        /* end progress bar arc */
        if (this._value > 0) {
            if (this._value <= this._overdriveStart)
                Clutter.cairo_set_source_color(cr, barLevelActiveColor);
            else
                Clutter.cairo_set_source_color(cr, barLevelOverdriveColor);
            cr.arc(endX, height / 2, barLevelBorderRadius, TAU * (3 / 4), TAU * (1 / 4));
            cr.lineTo(Math.floor(endX), barLevelBottom);
            cr.lineTo(Math.floor(endX), barLevelTop);
            cr.lineTo(endX, barLevelTop);
            cr.fillPreserve();
            cr.setLineWidth(barLevelBorderWidth);
            cr.stroke();
        }

        // blocked maximum
        if (this._blockedMax < this._maxValue) {
            bx = (barLevelBorderRadius + (width - 2 * barLevelBorderRadius) * this._blockedMax / this._maxValue) + barLevelBorderRadius;
            // bx = Math.min(bx, overdriveSeparatorX - overdriveSeparatorWidth / 2);
            cr.arc(width - barLevelBorderRadius - barLevelBorderWidth, height / 2, barLevelBorderRadius, TAU * (3 / 4), TAU * (1 / 4));
            cr.lineTo(bx, barLevelBottom);
            cr.lineTo(bx, barLevelTop);
            cr.lineTo(width - barLevelBorderRadius - barLevelBorderWidth, barLevelTop);
            Clutter.cairo_set_source_color(cr, deadBarColor);
            cr.fillPreserve();
            Clutter.cairo_set_source_color(cr, deadBarBorderColor);
            cr.setLineWidth(barLevelBorderWidth);
            cr.stroke();
        }

        /* draw overdrive separator */
        if (overdriveActive) {
            cr.moveTo(overdriveSeparatorX - overdriveSeparatorWidth / 2, barLevelTop);
            cr.lineTo(overdriveSeparatorX + overdriveSeparatorWidth / 2, barLevelTop);
            cr.lineTo(overdriveSeparatorX + overdriveSeparatorWidth / 2, barLevelBottom);
            cr.lineTo(overdriveSeparatorX - overdriveSeparatorWidth / 2, barLevelBottom);
            cr.lineTo(overdriveSeparatorX - overdriveSeparatorWidth / 2, barLevelTop);
            if (this._value <= this._overdriveStart)
                Clutter.cairo_set_source_color(cr, fgColor);
            else
                Clutter.cairo_set_source_color(cr, barLevelColor);
            cr.fill();
        }

        let blocked_sep_height = height / 4;
        let blocked_sep_width = Math.max(2, barLevelHeight / 2);
        
        // draw blocked minimum region seperator
        if (this._blockedMin > 0) {
            bx = barLevelBorderRadius + (width - 2 * barLevelBorderRadius) * this._blockedMin / this._maxValue;
            bx = Math.round(bx); // let borders appear as sharp as other seperator (maybe bad idea) 1/2
            cr.moveTo(bx, barLevelTop - blocked_sep_height);
            cr.lineTo(bx, barLevelBottom + blocked_sep_height);
            cr.lineTo(bx - blocked_sep_width, barLevelBottom + blocked_sep_height);
            cr.lineTo(bx - blocked_sep_width, barLevelTop - blocked_sep_height);
            cr.lineTo(bx, barLevelTop - blocked_sep_height);
            Clutter.cairo_set_source_color(cr, deadBarColor);
            cr.fillPreserve();
            Clutter.cairo_set_source_color(cr, deadBarBorderColor);
            cr.setLineWidth(barLevelBorderWidth)
            cr.stroke();
        }

        // draw blocked maximum region seperator
        if (this._blockedMax < this._maxValue) {
            bx = (barLevelBorderRadius + (width - 2 * barLevelBorderRadius) * this._blockedMax / this._maxValue) + barLevelBorderRadius;
            bx = Math.round(bx); // let borders appear as sharp as other seperator (maybe bad idea) 2/2
            cr.moveTo(bx, barLevelTop - blocked_sep_height);
            cr.lineTo(bx, barLevelBottom + blocked_sep_height);
            cr.lineTo(bx + blocked_sep_width, barLevelBottom + blocked_sep_height);
            cr.lineTo(bx + blocked_sep_width, barLevelTop - blocked_sep_height);
            cr.lineTo(bx, barLevelTop - blocked_sep_height);
            Clutter.cairo_set_source_color(cr, deadBarColor);
            cr.fillPreserve();
            Clutter.cairo_set_source_color(cr, deadBarBorderColor);
            cr.setLineWidth(barLevelBorderWidth)
            cr.stroke();
        }

        cr.$dispose();
    }

    _getCurrentValue() {
        return this._value;
    }

    _getOverdriveStart() {
        return this._overdriveStart;
    }

    _getMinimumValue() {
        return 0;
    }

    _getMaximumValue() {
        return this._maxValue;
    }

    _setCurrentValue(_actor, value) {
        this._value = value;
    }

    _valueChanged() {
        this._customAccessible.notify("accessible-value");
    }
});
