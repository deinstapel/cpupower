PREFIX ?= /usr

VERSION="9.0.1"

MSGFMT = /usr/bin/msgfmt
GLIB_COMPILE_SCHEMAS = /usr/bin/glib-compile-schemas
EXTENSION_INSTALL_DIR = "$(PREFIX)/share/gnome-shell/extensions/cpupower@mko-sl.de"
EXTENSION_FILES="$(shell find . -path './.git' -prune -o -path './target' -prune -o -print)"

build:
	@echo Compiling schemas...
	@$(GLIB_COMPILE_SCHEMAS) ./schemas
	@echo Updating translations...
	@MSGFMT="$(MSGFMT)" ./scripts/update-translations.sh

clean:
	@rm -r target

package: build
	@mkdir -p target
	@zip target/cpupower-${VERSION}.zip "$(EXTENSION_FILES)"

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
