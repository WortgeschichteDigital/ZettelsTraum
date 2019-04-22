#!/bin/sh

dir=$PWD
if ! test -e "$dir/zdl-wgd.xml"; then
	dir=/opt/zettelstraum/resources/filetype/linux
	if ! test -e "$dir/zdl-wgd.xml"; then
		echo ""
		echo "zdl-wgd.xml nicht gefunden!"
		echo ""
		echo "Am besten rufen Sie das Script so auf:"
		echo "  cd /opt/zettelstraum/resources/filetype/linux"
		echo "  sh register.sh"
		echo ""
		exit 1
	fi
fi

if ! command -v xdg-mime >/dev/null 2>&1; then
	echo ""
	echo "xdg-mime nicht gefunden!"
	echo ""
	echo "Sie müssen die xdg-utils installieren:"
	echo "  apt install xdg-utils"
	echo ""
	exit 1
fi

if ! test -e /usr/share/applications/zettelstraum.desktop; then
	echo ""
	echo "\"Zettel's Traum\" ist nicht installiert!"
	echo ""
	exit 1
fi

cd "$dir"

echo ""
echo "* MIME-Typ installieren"
xdg-mime install zdl-wgd.xml
if [ "$?" != "0" ]; then
	echo ""
	echo "Installation fehlgeschlagen!"
	echo ""
	exit 1
fi

echo ""
echo "* Icons installieren"
xdg-icon-resource install --context mimetypes --size 16 wgd_16px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 22 wgd_22px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 32 wgd_32px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 48 wgd_48px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 64 wgd_64px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 128 wgd_128px.png application-x-wgd
if [ "$?" != "0" ]; then
	echo ""
	echo "Installation fehlgeschlagen!"
	echo ""
	exit 1
fi

echo ""
echo "* \"Zettel's Traum\" als Standard-Anwendung registrieren"
xdg-mime default zettelstraum.desktop application/x-wgd
if [ "$?" != "0" ]; then
	echo ""
	echo "Registrierung fehlgeschlagen!"
	echo ""
	exit 1
fi

echo ""
echo "Der MIME-Typ application/x-wgd wurde erfolgreich registriert!"
echo ""

exit 0
