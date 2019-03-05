# CPU Power Manager for Gnome Shell

Gnome-Shell Extension for intel-pstate driver.

## Installation

The easiest way to install this extension is by using the
[Gnome extensions website](https://extensions.gnome.org/extension/945/cpu-power-manager/).

Click on the CPU icon in the top bar of your Gnome shell and follow the installation instructions.
You need to enter your root password to install a policy kit rule. This rule is used to set the clock
frequency of your CPU with your user.

## Prerequisites

You need to have an **Intel Core i CPU** of at least the **second Generation (2xxx Model Number)** and the following
software installed to use this extension:

- Gnome (since it's an extension)
- Policykit (ships default with gnome)
- intel_pstate needs to be enabled in the kernel (should be the default in almost all Distros)
- bash
