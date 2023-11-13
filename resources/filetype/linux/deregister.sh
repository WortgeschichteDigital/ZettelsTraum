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

      $(echo -e "\033[48;5;254;38;5;63m  *.ztj deregistrieren  \033[0m")


EOF

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
if ! test -e "$dir/x-ztj.xml"; then
  echo -e "x-ztj.xml nicht gefunden!\n"
  exit 1
fi

if ! command -v xdg-mime >/dev/null 2>&1; then
  echo -e "xdg-mime nicht gefunden!\n"
  echo "Sie müssen die xdg-utils installieren:"
  echo -e "  apt install xdg-utils\n"
  exit 1
fi

cd "$dir"

echo "* MIME-Typ deinstallieren"
xdg-mime uninstall x-ztj.xml
if (( $? > 0 )); then
  echo -e "\nDeinstallation fehlgeschlagen!\n"
  exit 1
fi

echo -e "\n* Icons deinstallieren"
xdg-icon-resource uninstall --context mimetypes --size 16 application-x-ztj
xdg-icon-resource uninstall --context mimetypes --size 22 application-x-ztj
xdg-icon-resource uninstall --context mimetypes --size 32 application-x-ztj
xdg-icon-resource uninstall --context mimetypes --size 48 application-x-ztj
xdg-icon-resource uninstall --context mimetypes --size 64 application-x-ztj
xdg-icon-resource uninstall --context mimetypes --size 128 application-x-ztj
if (( $? > 0 )); then
  echo -e "\nDeinstallation fehlgeschlagen!\n"
  exit 1
fi

echo -e "\nDer MIME-Typ application/x-ztj wurde erfolgreich entfernt!\n"

exit 0
