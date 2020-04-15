/*
 *  CPUPower for GNOME Shell preferences
 *  - Creates a widget to set the preferences of the cpupower extension
 *
 * Copyright (C) 2017
 *     Martin Koppehel <psl.kontakt@gmail.com>,
 *     Fin Christensen <christensen.fin@gmail.com>,
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
// 32bit random number without 0
const GenerateUUID = () => Math.floor(1 + Math.random() * 0xFFFFFFFE).toString();

var CPUFreqProfile = class CPUFreqProfile {
    constructor() {
        this.UUID = GenerateUUID();
        this.MinimumFrequency = 0;
        this.MaximumFrequency = 100;
        this.TurboBoost = true;
        this.Name = 'Default';
    }

    save() {
        return [this.MinimumFrequency, this.MaximumFrequency, this.TurboBoost, this.Name, this.UUID];
    }

    load(input) {
        this.MinimumFrequency = input[0];
        this.MaximumFrequency = input[1];
        this.TurboBoost = input[2];
        this.Name = input[3];

        if (input.length < 5 || !input[4])
        {
            this.UUID = GenerateUUID();
            // log("Generated UUID: " + this.UUID);
            return true;
        }
        else
        {
            this.UUID = input[4];
            return false;
        }
    }
}
