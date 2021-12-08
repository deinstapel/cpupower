PREFIX ?= /usr

VERSION="10.0.1"

MSGFMT = /usr/bin/msgfmt
GLIB_COMPILE_SCHEMAS = /usr/bin/glib-compile-schemas
EXTENSION_INSTALL_DIR = "$(PREFIX)/share/gnome-shell/extensions/cpupower@mko-sl.de"
EXTENSION_FILES="$(shell find . \
	-path './.git' -prune -o \
  -path './img' -prune -o \
	-path './target' -prune -o \
	-path './node_modules' -prune -o \
	-path ./.github -prune -o \
	-path './scripts' -prune -o \
  -path './dist' -prune -o \
	-path './schemas/org.gnome.shell.extensions.cpupower.gschema.xml' -prune -o \
	-name 'package-lock.json' -prune -o \
	-name 'Makefile' -prune -o \
	-name 'README.md' -prune -o \
	-name '.gitignore' -prune -o \
	-name '*~' -prune -o \
	-name '*.yml' -prune -o \
	-name '*.po' -prune -o \
	-name '*.pot' -prune -o \
	-type f -print)"
DIST_FILES="$(shell find . \
	-path './.git' -prune -o \
  -path './img' -prune -o \
	-path './target' -prune -o \
	-path './node_modules' -prune -o \
	-path ./.github -prune -o \
  -path './dist/rpm/BUILD' -prune -o \
  -path './dist/rpm/BUILDROOT' -prune -o \
  -path './dist/rpm/RPMS' -prune -o \
  -path './dist/rpm/SRPMS' -prune -o \
	-path './dist/deb/gnome-shell-extension-cpupower-*' -prune -o \
  -path './dist/deb/gnome-shell-extension-cpupower_*' -prune -o \
	-name 'package-lock.json' -prune -o \
	-name '.gitignore' -prune -o \
	-name '*~' -prune -o \
	-name '*.yml' -prune -o \
	-name '*.pot' -prune -o \
	-type f -print)"

build:
	@echo Compiling schemas...
	@$(GLIB_COMPILE_SCHEMAS) ./schemas
	@echo Updating translations...
	@MSGFMT="$(MSGFMT)" ./scripts/update-translations.sh

clean:
	@rm -rf target
	@find dist -mindepth 1 -maxdepth 1 -type d -exec $(MAKE) -C {} VERSION=$(VERSION) clean \;

package: build
	@mkdir -p target
	@rm -f target/cpupower-${VERSION}.zip
	@zip target/cpupower-${VERSION}.zip "$(EXTENSION_FILES)"
	@tar czf target/gnome-shell-extension-cpupower-${VERSION}.tar.gz "$(DIST_FILES)"
	@find dist -mindepth 1 -maxdepth 1 -type d -exec $(MAKE) -C {} VERSION=$(VERSION) update-tarball \;

dist: package
	@find dist -mindepth 1 -maxdepth 1 -type d -exec $(MAKE) -C {} VERSION=$(VERSION) build \;

install: package
	@mkdir -p "$(EXTENSION_INSTALL_DIR)"
	@unzip -o target/cpupower-${VERSION}.zip -d "$(EXTENSION_INSTALL_DIR)"

uninstall:
	@rm -r "$(EXTENSION_INSTALL_DIR)"

install-tool:
	@./tool/installer.sh --prefix "$(PREFIX)" --tool-suffix "$(TOOL_SUFFIX)" install

uninstall-tool:
	@./tool/installer.sh --prefix "$(PREFIX)" --tool-suffix "$(TOOL_SUFFIX)" uninstall

release:
	@./scripts/release.sh "$(VERSION)"
