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

      $(echo -e "\033[48;5;254;38;5;63m         Release        \033[0m")
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

# nicht in Branch 'main'
if [ "$(git branch --show-current)" != "main" ]; then
  echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m nicht in Branch 'main'"
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

# aktuelle App-Version ermitteln
appVersion() {
  packageJson="${dir}/../package.json"
  echo $(grep '"version":' "$packageJson" | sed -r 's/.+: "(.+?)",/\1/')
}

# HTML-Update
updateHtml() {
  # Copyright-Jahr in "Über App" updaten
  local htmlUeber="${dir}/../win/ueberApp.html"
  local copyrightJahr="2019"
  if [ "$(date +%Y)" != "$copyrightJahr" ]; then
    copyrightJahr+="–$(date +%Y)"
  fi
  local copyrightJahrUeber=$(grep "id=\"copyright-jahr\"" "$htmlUeber" | sed -r 's/.+"copyright-jahr">(.+?)<.+/\1/')
  if [ "$copyrightJahrUeber" != "$copyrightJahr" ]; then
    echo -e "  \033[1;32m*\033[0m Copyright-Jahr auffrischen"
    sed -i "s/copyright-jahr\">.*<\/span>/copyright-jahr\">${copyrightJahr}<\/span>/" "$htmlUeber"
  fi
}

# Release-Notes erstellen
#   $1 = Versionsnummer
makeReleaseNotes() {
  cd "./build"
  node build-notes.mjs $1 > "../../releases/v${1}.md"
  cd ".."
}

# Release vorbereiten
vorbereiten() {
  echo -e "  \033[1;32m*\033[0m Release vorbereiten\n"
  cd "${dir}/../"

  # Version festlegen
  read -p "  Nächste Aufgabe \"Version festlegen\" (Enter) . . ."
  echo -e "\n  \033[1;32m*\033[0m Version festlegen\n"
  while : ; do
    read -ep "Version: " -i "$(appVersion)" version
    if ! echo "$version" | egrep -q "^[0-9]+\.[0-9]+\.[0-9]+$"; then
      echo -e "\n\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Versionsformat falsch"
      sleep 1
      zeilenWeg 4
      continue
    else
      zeilenWeg 1
      echo -e "Version: \033[1;33m${version}\033[0m"
      # Version in package.json eintragen
      local zeile="  \"version\": \"${version}\","
      sed -i "s/  \"version\".*/${zeile}/" "package.json"
      echo ""
      break
    fi
  done

  # HTML-Update
  read -p "  Nächste Aufgabe \"HTML-Update\" (Enter) . . ."
  echo ""
  updateHtml
  echo ""

  # Release-Commit erstellen
  read -p "  Nächste Aufgabe \"Release-Commit erstellen\" (Enter) . . ."
  echo -e "\n  \033[1;32m*\033[0m Release-Commit erstellen\n"
  git status
  echo ""
  git commit -am "release prepared"
  echo ""
  git status
  echo ""

  # Release-Notes erstellen
  read -p "  Nächste Aufgabe \"Release-Notes erstellen\" (Enter) . . ."
  echo -e "\n  \033[1;32m*\033[0m Release-Notes erstellen"
  makeReleaseNotes $version
  echo ""

  # Release taggen
  read -p "  Nächste Aufgabe \"Release taggen\" (Enter) . . ."
  echo -e "\n  \033[1;32m*\033[0m Release taggen\n"
  typen[1]="Feature-Release v${version}"
  typen[2]="Maintenance-Release v${version}"
  typen[3]="Bug-Fix-Release v${version}"
  for j in ${!typen[@]}; do
    echo " [${j}] ${typen[$j]}"
  done
  while : ; do
    read -ep "  " releaseTyp
    if echo "$releaseTyp" | egrep -q "^[1-4]$"; then
      break
    else
      zeilenWeg 1
    fi
  done
  echo ""
  git tag -a v${version} -m "${typen[$releaseTyp]}"
  echo ""
  git log HEAD^..HEAD
  echo ""

  # Repository aufräumen
  read -p "  Nächste Aufgabe \"Repository aufräumen\" (Enter) . . ."
  echo -e "\n  \033[1;32m*\033[0m Repository aufräumen"
  echo -e "\nGröße: $(du -sh .git | cut -d $'\t' -f 1)\n"
  git gc
  echo -e "\nGröße: $(du -sh .git | cut -d $'\t' -f 1)\n"

  # Fertig!
  echo -e "Release \033[1;32mv${version}\033[0m vorbereitet!"

  cd "$dir"
}

# Starter
if [ "$1" = "inc" ]; then
  vorbereiten
else
  while : ; do
    read -ep "Release vorbereiten (j/n): " install
    if [ "$install" = "j" ]; then
      echo -e "\n"
      vorbereiten
      exit 0
    elif [ "$install" = "n" ]; then
      exit 0
    else
      zeilenWeg 1
    fi
  done
fi
