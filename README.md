# CPU Power Manager for Gnome Shell

Gnome-Shell Extension for intel-pstate driver.

## Installation

The easiest way to install this extension is by using the
[Gnome extensions website](https://extensions.gnome.org/extension/945/cpu-power-manager/).

Click on the CPU icon in the top bar of your Gnome shell and follow the installation instructions.
You need to enter your root password to install a policy kit rule. This rule is used to set the clock
frequency of your CPU with your user.

### Installing for another (admin) user

Impersonate the (non-admin) user, clone the git repository, and run the following command:

> Note: Cloning and installing the extension while impersonating the other user, enables this user
>       to install updates for this extension from extensions.gnome.org.

```shell
$ sudo -u username bash
$ cd /tmp
$ git clone https://github.com/martin31821/cpupower.git
$ cd cpupower
$ make install PREFIX=/home/username/.local
```

The user can enable the extension in his settings and install the polkit rule and `cpufreqctl` tool by using the included installation guide.

#### Uninstalling

The user can uninstall the tools in the settings of this extension. The extension itself can be removed from withing the extension settings or with this command:

```shell
$ make uninstall PREFIX=/home/username/.local
```

### Installing for another (non-admin) user

Impersonate the (non-admin) user, clone the git repository, and run the following command:

> Note: Cloning and installing the extension while impersonating the other user, enables this user
>       to install updates for this extension from extensions.gnome.org. However, the tool **must**
>       be updated and installed by an administrator. The extension may stop working after the user
>       installed an update and may need updating of the tool by an administrator.

```shell
$ sudo -u username bash
$ cd /tmp
$ git clone https://github.com/martin31821/cpupower.git
$ cd cpupower
$ make install PREFIX=/home/username/.local
```

And with an admin user run the following commands:

```shell
$ sudo make install-tool TOOL_SUFFIX=username
```

> Note: Also, use this command to update the tool for another user in an outdated installation.

The extension will work out-of-the-box for the specified user only!

> Note: Using another PREFIX than `/usr` in this setup might include security risks and may not work.

#### Uninstalling

```shell
$ sudo make uninstall PREFIX=/home/username/.local
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

## Developing

### Option 1

Clone the repository and run:

```shell
$ make install PREFIX=/home/username/.local
```

and reload the extension with:

```shell
$ make reload
```

### Option 2

Clone the respository to `~/.local/share/gnome-shell/extensions/cpupower@mko-sl.de` and reload the extension with:

```shell
$ make reload
```

You can now enable the extension in your extension settings.

### Viewing log output

```shell
$ journalctl -t gnome-shell -f
```

### Creating a new release

Only core contributors to this project can make a new release. To create one, run:

```shell
$ make release
```
