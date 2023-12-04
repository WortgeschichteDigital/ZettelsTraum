#!/bin/bash

if [ "$1" != "inc" ]; then
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

      $(echo -e "\033[48;5;254;38;5;63m         Prepare        \033[0m")
EOF
echo -e "\n"
fi

# Script Directory ermitteln
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# package.json nicht gefunden
if ! test -e "${dir}/../package.json"; then
  echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"package.json\" nicht gefunden"
  exit 1
fi

# git nicht installiert
if ! command -v git >/dev/null 2>&1; then
  echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"git\" nicht installiert"
  exit 1
fi

# kein Repository gefunden
cd "$dir"
git status &> /dev/null
if (( $? > 0 )); then
  echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m kein Repository gefunden"
  exit 1
fi

# Working Tree nicht clean
if [ "$(git diff --stat)" != "" ]; then
  echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Working Tree nicht clean"
  exit 1
fi

# Zeilen entfernen
#   $1 = Number, die angibt, wie viele Zeilen entfernt werden sollen
zeilenWeg() {
  for (( i=0; i<$1; i++ )); do
    tput cuu1
    tput el
  done
}

# Variable mit Versionen-Block
read -r -d '' versionen_block << EOF
    <main>
      <!-- Start Versionsblock 1.0.0 -->
      <div class="version">1.0.0</div>

      <div>
        <h2><span>Version 1.0.0-beta</span><time datetime="2019-12-24">24. Dezember 2019</time></h2>

        <h3>Entfernte Funktionen</h3>

        <ul>
          <li></li>
        </ul>

        <h3>Neue Funktionen</h3>

        <ul>
          <li></li>
        </ul>

        <h3>Verbesserungen</h3>

        <ul>
          <li></li>
        </ul>

        <h3>Updates</h3>

        <ul>
          <li></li>
        </ul>

        <h3>Behobene Fehler</h3>

        <p>Es wurden <i>2 Fehler</i> behoben. Details in den <a href="https://github.com/WortgeschichteDigital/ZettelsTraum/commits/master">Commit-Messages</a>.</p>

        <ul>
          <li></li>
        </ul>
      </div>\\n
EOF

# neue ZT-Version vorbereiten
prepareRelease() {
  cd "${dir}/../"

  echo -e "  \033[1;32m*\033[0m neue ZT-Version vorbereiten"

  # neuen Versionen-Block in den Changelog schreiben
  sed -i "s|<main>|${versionen_block//$'\n'/\\n}|" "win/changelog.html"

  # Commit erstellen
  git status
  echo ""
  local version=$(grep '"version":' "package.json" | sed -r 's/.+: "(.+?)",/\1/')
  git commit -am "Vorbereitung für v${version}+"
  echo ""
  git status
  echo ""

  cd "$dir"
}

# Starter
if [ "$1" = "inc" ]; then
  prepareRelease
else
  while : ; do
    read -ep "Neue ZT-Version vorbereiten (j/n): " install
    if [ "$install" = "j" ]; then
      echo -e "\n"
      prepareRelease
      exit 0
    elif [ "$install" = "n" ]; then
      exit 0
    else
      zeilenWeg 1
    fi
  done
fi
