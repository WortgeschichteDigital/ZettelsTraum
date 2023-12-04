#!/bin/bash

# Link zur Binärdatei
ln -sf "/opt/zettelstraum/zettelstraum" "/usr/local/bin/zettelstraum"

# ZTJ-Dateityp registrieren
if ! command -v xdg-mime >/dev/null 2>&1; then
  exit 1
fi
cd /opt/zettelstraum/resources/filetype/linux
xdg-mime install x-ztj.xml
xdg-icon-resource install --context mimetypes --size 16 ztj_16px.png application-x-ztj
xdg-icon-resource install --context mimetypes --size 22 ztj_22px.png application-x-ztj
xdg-icon-resource install --context mimetypes --size 32 ztj_32px.png application-x-ztj
xdg-icon-resource install --context mimetypes --size 48 ztj_48px.png application-x-ztj
xdg-icon-resource install --context mimetypes --size 64 ztj_64px.png application-x-ztj
xdg-icon-resource install --context mimetypes --size 128 ztj_128px.png application-x-ztj
xdg-mime default zettelstraum.desktop application/x-ztj
