#!/bin/bash

# Link zur Binärdatei entfernen
rm -f "/usr/local/bin/zettelstraum"

# wgd-Icons entfernen
if ! command -v xdg-mime >/dev/null 2>&1; then
	exit 1
fi
xdg-icon-resource uninstall --context mimetypes --size 16 application-x-wgd
xdg-icon-resource uninstall --context mimetypes --size 22 application-x-wgd
xdg-icon-resource uninstall --context mimetypes --size 32 application-x-wgd
xdg-icon-resource uninstall --context mimetypes --size 48 application-x-wgd
xdg-icon-resource uninstall --context mimetypes --size 64 application-x-wgd
xdg-icon-resource uninstall --context mimetypes --size 128 application-x-wgd
