.PHONY: clean build update-tarball

clean:
	@rm -f gnome-shell-extension-cpupower_*
	@rm -rf gnome-shell-extension-cpupower-*

build:
	@cp -arT gnome-shell-extension-cpupower gnome-shell-extension-cpupower-$(VERSION)
	@tar xzf gnome-shell-extension-cpupower_$(VERSION).orig.tar.gz -C gnome-shell-extension-cpupower-$(VERSION)
	@(cd gnome-shell-extension-cpupower-$(VERSION) && debuild -d)
	@cp gnome-shell-extension-cpupower_$(VERSION)-*.deb $(CURDIR)/../../target/

update-tarball:
	@ln -sf $(CURDIR)/../../target/gnome-shell-extension-cpupower-$(VERSION).tar.gz gnome-shell-extension-cpupower_$(VERSION).orig.tar.gz
