#!/bin/bash

# Link zur Binärdatei entfernen
rm -f "/usr/local/bin/zettelstraum"

# ZTJ-Dateityp entfernen
if ! command -v xdg-mime >/dev/null 2>&1; then
  exit 1
fi
xml=/tmp/x-ztj.xml
cat > $xml <<EOF
<?xml version="1.0"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="application/x-ztj">
    <comment>Zettel’s Traum JSON-Datei</comment>
    <glob pattern="*.ztj"/>
  </mime-type>
</mime-info>
EOF
xdg-mime uninstall $xml
rm $xml
xdg-icon-resource uninstall --context mimetypes --size 16 application-x-ztj
xdg-icon-resource uninstall --context mimetypes --size 22 application-x-ztj
xdg-icon-resource uninstall --context mimetypes --size 32 application-x-ztj
xdg-icon-resource uninstall --context mimetypes --size 48 application-x-ztj
xdg-icon-resource uninstall --context mimetypes --size 64 application-x-ztj
xdg-icon-resource uninstall --context mimetypes --size 128 application-x-ztj
