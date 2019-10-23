#!/bin/bash

# Link zur Binärdatei
ln -sf "/opt/zettelstraum/zettelstraum" "/usr/local/bin/zettelstraum"

# wgd-Icons registrieren
if ! command -v xdg-mime >/dev/null 2>&1; then
	exit 1
fi
cd /opt/zettelstraum/resources/filetype/linux
xdg-icon-resource install --context mimetypes --size 16 wgd_16px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 22 wgd_22px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 32 wgd_32px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 48 wgd_48px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 64 wgd_64px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 128 wgd_128px.png application-x-wgd
