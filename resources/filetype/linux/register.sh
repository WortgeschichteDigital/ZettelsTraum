#!/bin/bash

cat <<- EOF


      ZZZZZZZZZZZZTTTTTTTTTTTT
      ZZZZZZZZZZZZTTTTTTTTTTTT
              ZZZ      TT
             ZZZ       TT
            ZZZ        TT
           ZZZ         TT
          ZZZ          TT
         ZZZ           TT
        ZZZ            TT
       ZZZ             TT
      ZZZZZZZZZZZZ     TT
      ZZZZZZZZZZZZ     TT

      $(echo -e "\033[48;5;254;38;5;63m   *.wgd registrieren   \033[0m")


EOF

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
if ! test -e "$dir/zdl-wgd.xml"; then
	echo -e "zdl-wgd.xml nicht gefunden!\n"
	exit 1
fi

if ! command -v xdg-mime >/dev/null 2>&1; then
	echo -e "\nxdg-mime nicht gefunden!\n"
	echo "Sie müssen die xdg-utils installieren:"
	echo -e "  apt install xdg-utils\n"
	exit 1
fi

if ! test -e /usr/share/applications/zettelstraum.desktop; then
	echo -e "\"Zettel’s Traum\" ist nicht installiert!\n"
	exit 1
fi

cd "$dir"

echo "* MIME-Typ installieren"
xdg-mime install zdl-wgd.xml
if (( $? > 0 )); then
	echo -e "\nInstallation fehlgeschlagen!\n"
	exit 1
fi

echo -e "\n* Icons installieren"
xdg-icon-resource install --context mimetypes --size 16 wgd_16px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 22 wgd_22px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 32 wgd_32px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 48 wgd_48px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 64 wgd_64px.png application-x-wgd
xdg-icon-resource install --context mimetypes --size 128 wgd_128px.png application-x-wgd
if (( $? > 0 )); then
	echo -e "\nInstallation fehlgeschlagen!\n"
	exit 1
fi

echo -e "\n* \"Zettel's Traum\" als Standard-Anwendung registrieren"
xdg-mime default zettelstraum.desktop application/x-wgd
if (( $? > 0 )); then
	echo -e "\nRegistrierung fehlgeschlagen!\n"
	exit 1
fi

echo -e "\nDer MIME-Typ application/x-wgd wurde erfolgreich registriert!\n"

exit 0
