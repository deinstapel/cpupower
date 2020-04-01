PREFIX ?= /usr

VERSION="8.0.0"
GLIB_COMPILE_SCHEMAS = $(shell $(PKGCONFIG) --variable=glib_compile_schemas gio-2.0)
EXTENSION_INSTALL_DIR = "$(PREFIX)/share/gnome-shell/extensions/cpupower@mko-sl.de"
EXTENSION_FILES="$(shell find . -path './.git' -prune -o -path './target' -prune -o -print)"

build:
	@echo Compiling schemas...
	@glib-compile-schemas ./schemas
	@echo Updating translations...
	@./scripts/update-translations.sh

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

reload:
	@echo Reloading extension 'cpupower@mko-sl.de'...
	@gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell  --method org.gnome.Shell.Extensions.ReloadExtension cpupower@mko-sl.de
