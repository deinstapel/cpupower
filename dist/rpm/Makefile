.PHONY: clean build update-tarball

clean:
	@rm -rf BUILD BUILDROOT RPMS SRPMS
	@rm -f SOURCES/*.tar.gz

build:
	@rpmbuild --define "_topdir $(CURDIR)" --nodeps -bb SPECS/gnome-shell-extension-cpupower.spec
	@cp RPMS/*/gnome-shell-extension-cpupower-$(VERSION)-*.rpm $(CURDIR)/../../target/

update-tarball:
	@ln -sf $(CURDIR)/../../target/gnome-shell-extension-cpupower-$(VERSION).tar.gz SOURCES/
