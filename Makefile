PREFIX ?= /usr

VERSION="8.0.0"
GLIB_COMPILE_SCHEMAS = $(shell $(PKGCONFIG) --variable=glib_compile_schemas gio-2.0)
EXTENSION_INSTALL_DIR = "$(PREFIX)/share/gnome-shell/extensions/cpupower@mko-sl.de"
EXTENSION_FILES="$(shell find . -path './.git' -prune -o -path './target' -prune -o -print)"

build:
	@echo Compiling schemas...
	@glib-compile-schemas ./schemas

clean:
	@rm -r target

package: build
	@mkdir -p target
	@zip target/cpupower-${VERSION}.zip "$(EXTENSION_FILES)"

install: package
	@mkdir -p "$(EXTENSION_INSTALL_DIR)"
	@unzip target/cpupower.zip -d "$(EXTENSION_INSTALL_DIR)"

uninstall:
	@rm -r "$(EXTENSION_INSTALL_DIR)"

install-tool:
	@./tool/installer.sh install

uninstall-tool:
	@./tool/installer.sh uninstall

release:
	@./scripts/release.sh "$(VERSION)"
