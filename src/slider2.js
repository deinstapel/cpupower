/*
 * slider2.js: Gjs slider with visual limits
 *
 * This file is based on slider.js from the original Gnome Shell authors:
 * https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/3.38.1/js/ui/slider.js
 *
 * GNOME Shell is distributed under the terms of the GNU General Public License, version 2 or later.
 * See <https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/3.38.1/COPYING> for details.
 */

import Clutter from "gi://Clutter";
import Atk from "gi://Atk";
import St from "gi://St";
import GObject from "gi://GObject";

import * as Config from "resource:///org/gnome/shell/misc/config.js";

import { barLevel2 } from "./src/barLevel2.js";
/* exported Slider2 */
var Slider2 = GObject.registerClass(
    {
        GTypeName: "Slider2",
        Signals: {
            "drag-begin": {},
            "drag-end": {},
        },
    },
    class Slider2 extends BarLevel2.BarLevel2 {
        _init(value) {
            super._init({
                value,
                style_class: "slider",
                can_focus: true,
                reactive: true,
                accessible_role: Atk.Role.SLIDER,
                x_expand: true,
            });

            this._releaseId = 0;
            this._dragging = false;

            this._customAccessible.connect(
                "get-minimum-increment",
                this._getMinimumIncrement.bind(this)
            );
        }

        vfunc_repaint() {
            super.vfunc_repaint();

            // Add handle
            let cr = this.get_context();
            let themeNode = this.get_theme_node();
            let [width, height] = this.get_surface_size();

            let handleRadius = themeNode.get_length("-slider-handle-radius");

            let handleBorderWidth = themeNode.get_length(
                "-slider-handle-border-width"
            );
            let [hasHandleColor, handleBorderColor] = themeNode.lookup_color(
                "-slider-handle-border-color",
                false
            );

            const ceiledHandleRadius = Math.ceil(
                handleRadius + handleBorderWidth
            );
            const handleX =
                ceiledHandleRadius +
                ((width - 2 * ceiledHandleRadius) * this._value) /
                    this._maxValue;
            const handleY = height / 2;

            let color = themeNode.get_foreground_color();
            Clutter.cairo_set_source_color(cr, color);
            cr.arc(handleX, handleY, handleRadius, 0, 2 * Math.PI);
            cr.fillPreserve();
            if (hasHandleColor && handleBorderWidth) {
                Clutter.cairo_set_source_color(cr, handleBorderColor);
                cr.setLineWidth(handleBorderWidth);
                cr.stroke();
            }
            cr.$dispose();
        }

        vfunc_button_press_event() {
            return this.startDragging(Clutter.get_current_event());
        }

        startDragging(event) {
            if (this._dragging) {
                return Clutter.EVENT_PROPAGATE;
            }

            this._dragging = true;

            let device = event.get_device();
            let sequence = event.get_event_sequence();

            if (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) >= 42) {
                this._grab = global.stage.grab(this);
            } else if (sequence) {
                device.sequence_grab(sequence, this);
            } else {
                device.grab(this);
            }

            this._grabbedDevice = device;
            this._grabbedSequence = sequence;

            // We need to emit "drag-begin" before moving the handle to make
            // sure that no "notify::value" signal is emitted before this one.
            this.emit("drag-begin");

            let absX, absY;
            [absX, absY] = event.get_coords();
            this._moveHandle(absX, absY);
            return Clutter.EVENT_STOP;
        }

        _endDragging() {
            if (this._dragging) {
                if (this._releaseId) {
                    this.disconnect(this._releaseId);
                    this._releaseId = 0;
                }

                if (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) >= 42) {
                    if (this._grab) {
                        this._grab.dismiss();
                        this._grab = null;
                    }
                } else if (this._grabbedSequence) {
                    this._grabbedDevice.sequence_ungrab(this._grabbedSequence);
                } else {
                    this._grabbedDevice.ungrab();
                }

                this._grabbedSequence = null;
                this._grabbedDevice = null;
                this._dragging = false;

                this.emit("drag-end");
            }
            return Clutter.EVENT_STOP;
        }

        vfunc_button_release_event() {
            if (this._dragging && !this._grabbedSequence) {
                return this._endDragging();
            }

            return Clutter.EVENT_PROPAGATE;
        }

        vfunc_touch_event() {
            let event = Clutter.get_current_event();
            let device = event.get_device();
            let sequence = event.get_event_sequence();

            if (
                !this._dragging &&
                event.type() === Clutter.EventType.TOUCH_BEGIN
            ) {
                this.startDragging(event);
                return Clutter.EVENT_STOP;
            } else if (
                (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) >= 42 &&
                    this._grabbedSequence &&
                    sequence.get_slot() === this._grabbedSequence.get_slot()) ||
                (parseFloat(Config.PACKAGE_VERSION.substring(0, 4)) < 42 &&
                    device.sequence_get_grabbed_actor(sequence) === this)
            ) {
                if (event.type() === Clutter.EventType.TOUCH_UPDATE) {
                    return this._motionEvent(this, event);
                } else if (event.type() === Clutter.EventType.TOUCH_END) {
                    return this._endDragging();
                }
            }

            return Clutter.EVENT_PROPAGATE;
        }

        scroll(event) {
            let direction = event.get_scroll_direction();

            if (event.is_pointer_emulated()) {
                return Clutter.EVENT_PROPAGATE;
            }

            let delta = this._getMinimumIncrement();
            if (direction === Clutter.ScrollDirection.DOWN) {
                delta *= -1;
            } else if (direction === Clutter.ScrollDirection.UP) {
                delta *= 1;
            } else if (direction === Clutter.ScrollDirection.SMOOTH) {
                let [, dy] = event.get_scroll_delta();
                // Even though the slider is horizontal, use dy to match
                // the UP/DOWN above.
                delta *= -dy;
            }

            this.value = Math.min(
                Math.max(this.limit_minimum, this._value + delta),
                this.limit_maximum
            );

            return Clutter.EVENT_STOP;
        }

        vfunc_scroll_event() {
            return this.scroll(Clutter.get_current_event());
        }

        vfunc_motion_event() {
            if (this._dragging && !this._grabbedSequence) {
                return this._motionEvent(this, Clutter.get_current_event());
            }

            return Clutter.EVENT_PROPAGATE;
        }

        _motionEvent(actor, event) {
            let absX, absY;
            [absX, absY] = event.get_coords();
            this._moveHandle(absX, absY);
            return Clutter.EVENT_STOP;
        }

        vfunc_key_press_event(keyPressEvent) {
            let key = keyPressEvent.keyval;
            if (key === Clutter.KEY_Right || key === Clutter.KEY_Left) {
                let delta = this._getMinimumIncrement();
                if (key === Clutter.KEY_Left) {
                    delta *= -1;
                }
                this.value = this.value = Math.min(
                    Math.max(this.limit_minimum, this._value + delta),
                    this.limit_maximum
                );
                return Clutter.EVENT_STOP;
            }
            return super.vfunc_key_press_event(keyPressEvent);
        }

        _moveHandle(absX, _absY) {
            let relX, sliderX;
            [sliderX] = this.get_transformed_position();
            relX = absX - sliderX;

            let width = this._barLevelWidth;
            let handleRadius = this.get_theme_node().get_length(
                "-slider-handle-radius"
            );

            let newvalue;
            if (relX < handleRadius) {
                newvalue = 0;
            } else if (relX > width - handleRadius) {
                newvalue = 1;
            } else {
                newvalue = (relX - handleRadius) / (width - 2 * handleRadius);
            }

            newvalue *= this._maxValue;
            this.value = Math.min(
                Math.max(this.limit_minimum, newvalue),
                this.limit_maximum
            );
        }

        _getMinimumIncrement() {
            return 0.01 * this.maximum_value;
        }
    }
);
