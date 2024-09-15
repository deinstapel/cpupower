/*
 * barLevel2.js: Gjs bar level with visual limits
 *
 * This file is based on barLevel.js from the original Gnome Shell authors:
 * https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/3.38.1/js/ui/barLevel.js
 *
 * GNOME Shell is distributed under the terms of the GNU General Public License, version 2 or later.
 * See <https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/3.38.1/COPYING> for details.
 */

import Clutter from "gi://Clutter";
import Atk from "gi://Atk";
import St from "gi://St";
import GObject from "gi://GObject";

import * as Config from "resource:///org/gnome/shell/misc/config.js";

/* exported BarLevel2 */
var BarLevel2 = GObject.registerClass(
    {
        GTypeName: "BarLevel2",
        Properties: {
            value: GObject.ParamSpec.double(
                "value",
                "value",
                "value",
                GObject.ParamFlags.READWRITE,
                0,
                Number.MAX_SAFE_INTEGER,
                0
            ),
            "maximum-value": GObject.ParamSpec.double(
                "maximum-value",
                "maximum-value",
                "maximum-value",
                GObject.ParamFlags.READWRITE,
                1,
                Number.MAX_SAFE_INTEGER,
                1
            ),
            "overdrive-start": GObject.ParamSpec.double(
                "overdrive-start",
                "overdrive-start",
                "overdrive-start",
                GObject.ParamFlags.READWRITE,
                1,
                Number.MAX_SAFE_INTEGER,
                1
            ),
            "limit-minimum": GObject.ParamSpec.double(
                "limit-minimum",
                "limit-minimum",
                "limit-minimum",
                GObject.ParamFlags.READWRITE,
                0,
                Number.MAX_SAFE_INTEGER,
                0
            ),
            "limit-maximum": GObject.ParamSpec.double(
                "limit-maximum",
                "limit-maximum",
                "limit-maximum",
                GObject.ParamFlags.READWRITE,
                0,
                Number.MAX_SAFE_INTEGER,
                1
            ),
        },
    },
    class BarLevel2 extends St.DrawingArea {
        _init(params) {
            this._maxValue = 1;
            this._value = 0;
            this._overdriveStart = 1;
            this._barLevelWidth = 0;
            this._limitMin = 0;
            this._limitMax = this._maxValue;

            let defaultParams = {
                style_class: "barlevel",
                accessible_role: Atk.Role.LEVEL_BAR,
            };
            super._init(Object.assign(defaultParams, params));
            this.connect("notify::allocation", () => {
                this._barLevelWidth = this.allocation.get_width();
            });

            this._customAccessible = St.GenericAccessible.new_for_actor(this);
            this.set_accessible(this._customAccessible);

            this._customAccessible.connect(
                "get-current-value",
                this._getCurrentValue.bind(this)
            );
            this._customAccessible.connect(
                "get-minimum-value",
                this._getMinimumValue.bind(this)
            );
            this._customAccessible.connect(
                "get-maximum-value",
                this._getMaximumValue.bind(this)
            );
            this._customAccessible.connect(
                "set-current-value",
                this._setCurrentValue.bind(this)
            );

            this.connect("notify::value", this._valueChanged.bind(this));
        }

        get value() {
            return this._value;
        }

        set value(value) {
            value = Math.max(Math.min(value, this._maxValue), 0);

            if (this._value === value) {
                return;
            }

            this._value = value;
            this.notify("value");
            this.queue_repaint();
        }

        get limit_minimum() {
            return this._limitMin;
        }

        set limit_minimum(value) {
            value = Math.max(Math.min(value, this.limit_maximum), 0);

            if (this._limitMin === value) {
                return;
            }

            this._limitMin = value;
            this.notify("limit-minimum");
            this.queue_repaint();
        }

        get limit_maximum() {
            return this._limitMax;
        }

        set limit_maximum(value) {
            value = Math.max(
                Math.min(value, this._maxValue),
                this.limit_minimum
            );

            if (this._limitMax === value) {
                return;
            }

            this._limitMax = value;
            this.notify("limit-maximum");
            this.queue_repaint();
        }

        // eslint-disable-next-line camelcase
        get maximum_value() {
            return this._maxValue;
        }

        // eslint-disable-next-line camelcase
        set maximum_value(value) {
            value = Math.max(value, 1);

            if (this._maxValue === value) {
                return;
            }

            this._maxValue = value;
            this._overdriveStart = Math.min(
                this._overdriveStart,
                this._maxValue
            );
            this.notify("maximum-value");
            this.queue_repaint();
        }

        // eslint-disable-next-line camelcase
        get overdrive_start() {
            return this._overdriveStart;
        }

        // eslint-disable-next-line camelcase
        set overdrive_start(value) {
            if (this._overdriveStart === value) {
                return;
            }

            if (value > this._maxValue) {
                throw new Error(
                    `Tried to set overdrive value to ${value}, ` +
                        `which is a number greater than the maximum allowed value ${this._maxValue}`
                );
            }

            this._overdriveStart = value;
            this.notify("overdrive-start");
            this.queue_repaint();
        }

        vfunc_repaint() {
            let cr = this.get_context();
            let themeNode = this.get_theme_node();
            let [width, height] = this.get_surface_size();

            // fix for old Gnome releases
            let prefix =
                parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) > 3.29
                    ? "-barlevel"
                    : "-slider";

            let barLevelHeight = themeNode.get_length(`${prefix}-height`);
            let barLevelBorderRadius = Math.min(width, barLevelHeight) / 2;
            let fgColor = themeNode.get_foreground_color();

            let barLevelColor = themeNode.get_color(
                `${prefix}-background-color`
            );
            let barLevelActiveColor = themeNode.get_color(
                `${prefix}-active-background-color`
            );
            let barLevelOverdriveColor;
            if (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) > 3.29) {
                barLevelOverdriveColor = themeNode.get_color(
                    "-barlevel-overdrive-color"
                );
            }

            let barLevelBorderWidth = Math.min(
                themeNode.get_length(`${prefix}-border-width`),
                1
            );
            let [hasBorderColor, barLevelBorderColor] = themeNode.lookup_color(
                `${prefix}-border-color`,
                false
            );
            if (!hasBorderColor) {
                barLevelBorderColor = barLevelColor;
            }
            let [hasActiveBorderColor, barLevelActiveBorderColor] =
                themeNode.lookup_color(`${prefix}-active-border-color`, false);
            if (!hasActiveBorderColor) {
                barLevelActiveBorderColor = barLevelActiveColor;
            }

            let hasOverdriveBorderColor, barLevelOverdriveBorderColor;
            if (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) > 3.29) {
                [hasOverdriveBorderColor, barLevelOverdriveBorderColor] =
                    themeNode.lookup_color(
                        "-barlevel-overdrive-border-color",
                        false
                    );
                if (!hasOverdriveBorderColor) {
                    barLevelOverdriveBorderColor = barLevelOverdriveColor;
                }
            }

            const TAU = Math.PI * 2;

            let endX = 0;
            if (this._maxValue > 0) {
                endX =
                    barLevelBorderRadius +
                    ((width - 2 * barLevelBorderRadius) * this._value) /
                        this._maxValue;
            }

            let overdriveSeparatorX =
                barLevelBorderRadius +
                ((width - 2 * barLevelBorderRadius) * this._overdriveStart) /
                    this._maxValue;
            let overdriveActive =
                this._overdriveStart !== this._maxValue &&
                parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) > 3.29;
            let overdriveSeparatorWidth = 0;
            if (overdriveActive) {
                overdriveSeparatorWidth = themeNode.get_length(
                    "-barlevel-overdrive-separator-width"
                );
            }

            let deadBarColor = barLevelColor;
            let deadBarBorderColor = barLevelBorderColor;

            // performance optimization
            let barLevelTop = (height - barLevelHeight) / 2;
            let barLevelBottom = (height + barLevelHeight) / 2;

            /* background bar */
            let bx =
                barLevelBorderRadius +
                ((width - 2 * barLevelBorderRadius) * this._limitMax) /
                    this._maxValue +
                barLevelBorderRadius;
            let startLimitMax =
                this._limitMax < this._maxValue
                    ? bx
                    : width - barLevelBorderRadius - barLevelBorderWidth;
            if (this._limitMax < this._maxValue) {
                cr.lineTo(startLimitMax, barLevelBottom);
            } else {
                cr.arc(
                    startLimitMax,
                    height / 2,
                    barLevelBorderRadius,
                    TAU * (3 / 4),
                    TAU * (1 / 4)
                );
            }
            cr.lineTo(endX, barLevelBottom);
            cr.lineTo(endX, barLevelTop);
            cr.lineTo(startLimitMax, barLevelTop);
            Clutter.cairo_set_source_color(cr, barLevelColor);
            cr.fillPreserve();
            Clutter.cairo_set_source_color(cr, barLevelBorderColor);
            cr.setLineWidth(barLevelBorderWidth);
            cr.stroke();

            // limit minimum
            bx = 0;
            if (this._limitMin > 0) {
                bx =
                    barLevelBorderRadius +
                    ((width - 2 * barLevelBorderRadius) * this._limitMin) /
                        this._maxValue;
                cr.arc(
                    barLevelBorderRadius + barLevelBorderWidth,
                    height / 2,
                    barLevelBorderRadius,
                    TAU * (1 / 4),
                    TAU * (3 / 4)
                );
                cr.lineTo(bx, barLevelTop);
                cr.lineTo(bx, barLevelBottom);
                cr.lineTo(
                    barLevelBorderRadius + barLevelBorderWidth,
                    barLevelBottom
                );
                if (this._value > 0) {
                    Clutter.cairo_set_source_color(cr, deadBarColor);
                }
                cr.fillPreserve();
                Clutter.cairo_set_source_color(cr, deadBarBorderColor);
                cr.setLineWidth(barLevelBorderWidth);
                cr.stroke();
            }

            /* normal progress bar */
            let x = Math.min(
                endX,
                overdriveSeparatorX - overdriveSeparatorWidth / 2
            );
            let startX =
                this._limitMin > 0
                    ? bx
                    : barLevelBorderRadius + barLevelBorderWidth + bx;
            if (this._limitMin > 0) {
                cr.lineTo(startX, barLevelTop);
            } else {
                cr.arc(
                    startX,
                    height / 2,
                    barLevelBorderRadius,
                    TAU * (1 / 4),
                    TAU * (3 / 4)
                );
            }
            cr.lineTo(x, barLevelTop);
            cr.lineTo(x, barLevelBottom);
            cr.lineTo(startX, barLevelBottom);
            if (this._value > 0) {
                Clutter.cairo_set_source_color(cr, barLevelActiveColor);
            }
            cr.fillPreserve();
            Clutter.cairo_set_source_color(cr, barLevelActiveBorderColor);
            cr.setLineWidth(barLevelBorderWidth);
            cr.stroke();

            /* overdrive progress barLevel */
            x =
                Math.min(endX, overdriveSeparatorX) +
                overdriveSeparatorWidth / 2;
            if (this._value > this._overdriveStart) {
                cr.moveTo(x, barLevelTop);
                cr.lineTo(endX, barLevelTop);
                cr.lineTo(endX, barLevelBottom);
                cr.lineTo(x, barLevelBottom);
                cr.lineTo(x, barLevelTop);
                Clutter.cairo_set_source_color(cr, barLevelOverdriveColor);
                cr.fillPreserve();
                Clutter.cairo_set_source_color(
                    cr,
                    barLevelOverdriveBorderColor
                );
                cr.setLineWidth(barLevelBorderWidth);
                cr.stroke();
            }

            /* end progress bar arc */
            if (this._value > 0) {
                if (this._value <= this._overdriveStart) {
                    Clutter.cairo_set_source_color(cr, barLevelActiveColor);
                } else {
                    Clutter.cairo_set_source_color(cr, barLevelOverdriveColor);
                }
                cr.arc(
                    endX,
                    height / 2,
                    barLevelBorderRadius,
                    TAU * (3 / 4),
                    TAU * (1 / 4)
                );
                cr.lineTo(Math.floor(endX), barLevelBottom);
                cr.lineTo(Math.floor(endX), barLevelTop);
                cr.lineTo(endX, barLevelTop);
                cr.fillPreserve();
                cr.setLineWidth(barLevelBorderWidth);
                cr.stroke();
            }

            // limit maximum
            if (this._limitMax < this._maxValue) {
                bx =
                    barLevelBorderRadius +
                    ((width - 2 * barLevelBorderRadius) * this._limitMax) /
                        this._maxValue +
                    barLevelBorderRadius;
                cr.arc(
                    width - barLevelBorderRadius - barLevelBorderWidth,
                    height / 2,
                    barLevelBorderRadius,
                    TAU * (3 / 4),
                    TAU * (1 / 4)
                );
                cr.lineTo(bx, barLevelBottom);
                cr.lineTo(bx, barLevelTop);
                cr.lineTo(
                    width - barLevelBorderRadius - barLevelBorderWidth,
                    barLevelTop
                );
                Clutter.cairo_set_source_color(cr, deadBarColor);
                cr.fillPreserve();
                Clutter.cairo_set_source_color(cr, deadBarBorderColor);
                cr.setLineWidth(barLevelBorderWidth);
                cr.stroke();
            }

            /* draw overdrive separator */
            if (overdriveActive) {
                cr.moveTo(
                    overdriveSeparatorX - overdriveSeparatorWidth / 2,
                    barLevelTop
                );
                cr.lineTo(
                    overdriveSeparatorX + overdriveSeparatorWidth / 2,
                    barLevelTop
                );
                cr.lineTo(
                    overdriveSeparatorX + overdriveSeparatorWidth / 2,
                    barLevelBottom
                );
                cr.lineTo(
                    overdriveSeparatorX - overdriveSeparatorWidth / 2,
                    barLevelBottom
                );
                cr.lineTo(
                    overdriveSeparatorX - overdriveSeparatorWidth / 2,
                    barLevelTop
                );
                if (this._value <= this._overdriveStart) {
                    Clutter.cairo_set_source_color(cr, fgColor);
                } else {
                    Clutter.cairo_set_source_color(cr, barLevelColor);
                }
                cr.fill();
            }

            let limit_sep_height = height / 4;
            let limit_sep_width = Math.max(2, barLevelHeight / 2);

            // draw blocked minimum region seperator
            if (this._limitMin > 0) {
                bx =
                    barLevelBorderRadius +
                    ((width - 2 * barLevelBorderRadius) * this._limitMin) /
                        this._maxValue;
                bx = Math.round(bx);
                cr.moveTo(bx, barLevelTop - limit_sep_height);
                cr.lineTo(bx, barLevelBottom + limit_sep_height);
                cr.lineTo(
                    bx - limit_sep_width,
                    barLevelBottom + limit_sep_height
                );
                cr.lineTo(bx - limit_sep_width, barLevelTop - limit_sep_height);
                cr.lineTo(bx, barLevelTop - limit_sep_height);
                Clutter.cairo_set_source_color(cr, barLevelActiveColor);
                cr.fillPreserve();
                Clutter.cairo_set_source_color(cr, barLevelActiveBorderColor);
                cr.setLineWidth(barLevelBorderWidth);
                cr.stroke();
            }

            // draw blocked maximum region seperator
            if (this._limitMax < this._maxValue) {
                bx =
                    barLevelBorderRadius +
                    ((width - 2 * barLevelBorderRadius) * this._limitMax) /
                        this._maxValue +
                    barLevelBorderRadius;
                bx = Math.round(bx);
                cr.moveTo(bx, barLevelTop - limit_sep_height);
                cr.lineTo(bx, barLevelBottom + limit_sep_height);
                cr.lineTo(
                    bx + limit_sep_width,
                    barLevelBottom + limit_sep_height
                );
                cr.lineTo(bx + limit_sep_width, barLevelTop - limit_sep_height);
                cr.lineTo(bx, barLevelTop - limit_sep_height);
                Clutter.cairo_set_source_color(cr, barLevelActiveColor);
                cr.fillPreserve();
                Clutter.cairo_set_source_color(cr, barLevelActiveBorderColor);
                cr.setLineWidth(barLevelBorderWidth);
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
    }
);
