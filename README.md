# CPU Power Manager for Gnome Shell

Gnome-Shell Extension for intel-pstate driver.

## Installation

The easiest way to install this extension is by using the
[Gnome extensions website](https://extensions.gnome.org/extension/945/cpu-power-manager/).

Click on the CPU icon in the top bar of your Gnome shell and follow the installation instructions.
You need to enter your root password to install a policy kit rule. This rule is used to set the clock
frequency of your CPU with your user.

### Installing for another (admin) user

Clone the git repository and run the following command:

```shell
$ make install PREFIX=/home/username/.local
```

The user can enable the extension in his settings and install the polkit rule and `cpufreqctl` tool by using the included installation guide.

#### Uninstalling

The user can uninstall the tools in the settings of this extension. The extension itself can be removed from withing the extension settings or with this command:

```shell
$ make uninstall PREFIX=/home/username/.local
```

### Installing for another (non-admin) user

Clone the git repository and run the following command:

```shell
$ make install PREFIX=/home/username/.local
$ sudo make install-tool TOOL_SUFFIX=username
```

The extension will work out-of-the-box for the specified user only!

> Note: Using another PREFIX than `/usr` in this setup might include security risks and may not work.

#### Uninstalling

```shell
$ make uninstall PREFIX=/home/username/.local
$ sudo make uninstall-tool TOOL_SUFFIX=username
```

### Installing for all users

Clone the git repository and run the following command:

```shell
$ sudo make install install-tool
```

This will install the extensions, polkit rule, and the tool for all users on the system.

#### Uninstalling

Run the following command to uninstall:

```shell
$ sudo make uninstall uninstall-tool
```

## Prerequisites

You need to have an **Intel Core i CPU** of at least the **second Generation (2xxx Model Number)** and the following
software installed to use this extension:

- Gnome (since it's an extension)
- Policykit (ships default with gnome)
- intel_pstate needs to be enabled in the kernel (should be the default in almost all Distros)
- bash
