#!/bin/sh

if ! command -v xdg-mime >/dev/null 2>&1; then
	echo ""
	echo "xdg-mime nicht gefunden!"
	echo ""
	echo "Sie müssen die xdg-utils installieren:"
	echo "  apt install xdg-utils"
	echo ""
	exit 1
fi

if ! test -e zdl-wgd.xml; then
	echo ""
	echo "zdl-wgd.xml nicht gefunden!"
	echo ""
	echo "Sie müssen das Script so aufrufen:"
	echo "  cd /opt/zettelstraum/resources/filetype/linux/"
	echo "  sh register.sh"
	echo ""
	exit 1
fi

echo ""
echo "* MIME-Typ deinstallieren"
xdg-mime uninstall zdl-wgd.xml
if [ "$?" != "0" ]; then
	echo ""
	echo "Deinstallation fehlgeschlagen!"
	echo ""
	exit 1
fi

echo ""
echo "Der MIME-Typ application/x-wgd wurde erfolgreich entfernt!"
echo ""

exit 0
