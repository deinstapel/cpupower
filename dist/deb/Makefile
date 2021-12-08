.PHONY: clean build update-tarball

clean:
	@rm -f gnome-shell-extension-cpupower_*
	@rm -rf gnome-shell-extension-cpupower-*

build:
	@cp -arT gnome-shell-extension-cpupower gnome-shell-extension-cpupower-$(VERSION)
	@tar xzf gnome-shell-extension-cpupower_$(VERSION).orig.tar.gz -C gnome-shell-extension-cpupower-$(VERSION)
	@(cd gnome-shell-extension-cpupower-$(VERSION) && debuild -d)
	@ls -1 -t *.deb | head -n1 | xargs -I '{}' cp '{}' $(CURDIR)/../../target/gnome-shell-extension-cpupower_$(VERSION).deb

upload:
	@test -n "$(VERSION)" -a -n "$(DEBIAN_VERSION)" || (echo "VERSION or DEBIAN_VERSION is not set, set it e.g. with VERSION=10.0.0 DEBIAN_VERSION='3~focal1'" && exit 1)
	@tar xzf gnome-shell-extension-cpupower_$(VERSION).orig.tar.gz -C gnome-shell-extension-cpupower-$(VERSION)
	@(cd gnome-shell-extension-cpupower-$(VERSION) && debuild -S -sa -d)
	@dput ppa:fin1ger/cpupower gnome-shell-extension-cpupower_$(VERSION)-$(DEBIAN_VERSION)_source.changes

update-tarball:
	@ln -sf $(CURDIR)/../../target/gnome-shell-extension-cpupower-$(VERSION).tar.gz gnome-shell-extension-cpupower_$(VERSION).orig.tar.gz
