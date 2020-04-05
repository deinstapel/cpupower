<h1 align="center">CPU Power Manager for Gnome Shell</h1>
<p align="center">
  <a href="https://extensions.gnome.org/extension/945/cpu-power-manager/">
    <img alt="Get it on GNOME Extensions" width="228" src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true"/>
  </a>
  <br>
  <a href="https://github.com/martin31821/cpupower/actions?query=workflow%3A%22latest%20build%22">
    <img src="https://github.com/martin31821/cpupower/workflows/latest%20build/badge.svg" alt="latest build">
  </a>
  <a href="https://github.com/martin31821/cpupower/actions?query=workflow%3A%22release%20build%22">
    <img src="https://github.com/martin31821/cpupower/workflows/release%20build/badge.svg" alt="release build">
  </a>
  <a href="https://github.com/martin31821/cpupower/releases">
    <img alt="Lastest release" src="https://img.shields.io/github/v/release/martin31821/cpupower?label=latest%20release&sort=semver">
  </a>
  <img alt="Gnome" src="https://img.shields.io/badge/gnome-3.36-blue?logo=gnome&logoColor=white">
  <a href="https://github.com/martin31821/cpupower/blob/master/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/martin31821/cpupower.svg">
  </a>
  <a href="http://makeapullrequest.com">
    <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" target="_blank" />
  </a>
  <br>
  <i>Gnome-Shell Extension for intel-pstate driver</i>
  <br><br>
  <a href="#prerequisites">Prerequisites</a> •
  <a href="#installation">Installation</a> •
  <a href="#translating">Translating</a> •
  <a href="#packaging">Packaging</a> •
  <a href="#developing">Developing</a>
</p>

## Prerequisites

You need to have an **Intel Core i CPU** of at least the **second Generation (2xxx Model Number)** and the following
software installed to use this extension:

- Gnome (since it's an extension)
- Policykit (ships default with gnome)
- intel_pstate needs to be enabled in the kernel (should be the default in almost all Distros)
- bash

### Installing via Makefile

In order to use the Makefile you need the following packages:

 - make
 - gettext

## Installation

The easiest way to install this extension is by using the
[Gnome extensions website](https://extensions.gnome.org/extension/945/cpu-power-manager/).

Click on the CPU icon in the top bar of your Gnome shell and follow the installation instructions.
You need to enter your root password to install a policy kit rule. This rule is used to set the clock
frequency of your CPU with your user.

### Installing for another (admin) user

Impersonate the (admin) user, clone the git repository, and run the following command:

> Note: Cloning and installing the extension while impersonating the other user, enables this user
>       to install updates for this extension from extensions.gnome.org.

```shell
$ sudo -u username bash
$ cd /tmp
$ git clone https://github.com/martin31821/cpupower.git
$ cd cpupower
$ make install PREFIX=/home/username/.local
```

Restart the gnome-shell (log out and back in) to make the extension available.

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

> Note: Using another PREFIX than `/usr` in this setup might include security risks and may not work.

Restart the gnome-shell (log out and back in) to make the extension available.

The extension will work out-of-the-box for this user only!

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

## Translating

In order to translate this extension you first need to install [`Poedit`](https://poedit.net/). You may use your distributions package manager to install it.

When finished, [fork](https://help.github.com/en/github/getting-started-with-github/fork-a-repo) this project and clone like described in the linked guide.

### Creating a new translation

Open Poedit and select `File` / `New From POT/PO File...` and select `cpupower/locale/template.pot`. Select the language you want to translate to. Now start translating.

### Edit or update an existing translation

Open Poedit and select `Open`. Navigate to the `cpupower/locale` folder and select the language file (`.po`) you want to edit/update. Now select `Catalog` / `Update from POT File...` and select `cpupower/locale/template.pot`. Now, you can start updating the translation.

### Saving your work

When finished save the file into the `locale` folder and [push](https://help.github.com/en/github/managing-files-in-a-repository/adding-a-file-to-a-repository-using-the-command-line) your changes to your fork. Now, you can create a [pull request](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request) to make your translation available in the main cpupower installation.

## Packaging

You are a package maintainer and looking into packaging this extension? Great! Below is a short summary of how to properly install this extension (run as `root`):

```shell
# make install install-tool PREFIX=/usr
```

This will install a polkit rule to `/usr/share/polkit-1/actions/mko.cpupower.setcpufreq.policy` and an executable bash script to `/usr/bin/cpufreqctl`. The extension is installed to `/usr/share/gnome-shell/extensions/cpupower@mko-sl.de`. It still includes the `scripts` folder, the policykit rule template in `data/mko.cpupower.policy.in`, a useless copy of the tool in the `tool` folder, and the `Makefile`. These are included in the distribution of the extension to enable user installation if the extension got installed over the GNOME extensions website. If you do not want to distribute those files in your package, you can safely remove them.

> If you find any issues in packaging this extension, please don't hesitate to report them!

## Developing

### Option 1

Clone the repository and run:

```shell
$ make install PREFIX=/home/username/.local
```

and reload the extension by restarting your gnome-shell.

### Option 2

Clone the respository to `~/.local/share/gnome-shell/extensions/cpupower@mko-sl.de` and reload the extension by restarting your gnome-shell.

You can now enable the extension in your extension settings.

### Viewing log output

```shell
$ journalctl /usr/bin/gnome-shell -f
```

### Creating a new release

Only core contributors to this project can make a new release. To create one, run:

```shell
$ make release
```
