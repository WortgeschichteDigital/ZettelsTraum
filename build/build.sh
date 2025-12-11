#!/bin/bash

# Presets
presets=(
  "GitHub"
  "Test (Linux)"
  "Test (alle)"
)
preset1=(
  "type=installer|os=linux|pkg=deb|clean=j"
  "type=installer|os=linux|pkg=appImage|clean=j"
  "type=installer|os=win|pkg=nsis|clean=j"
  "type=packager|os=linux|arch=gz|clean=j"
  "type=packager|os=mac|arch=gz|clean=j"
  "type=packager|os=win|arch=zip|clean=j"
  "type=tarball|clean=n"
)
preset2=(
  "type=packager|os=linux|arch=-|clean=j"
)
preset3=(
  "type=packager|os=linux|arch=-|clean=j"
  "type=packager|os=win|arch=-|clean=j"
  "type=packager|os=mac|arch=gz|clean=j"
)

# Mail-Adressen der Maintainer
declare -A adressen
adressen["Nico Dorn"]="nico.dorn adwgoe de"

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

      $(echo -e "\033[48;5;254;38;5;63m          Build         \033[0m")
EOF
echo -e "\n"

# Script Directory ermitteln
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# package.json nicht gefunden
if ! test -e "${dir}/../package.json"; then
  echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"package.json\" nicht gefunden"
  exit 1
fi

# Node nicht installiert
if ! command -v node >/dev/null 2>&1; then
  echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"node\" nicht installiert"
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

# App-Version ermitteln
appVersion() {
  packageJson="${dir}/../package.json"
  echo $(grep '"version":' "$packageJson" | sed -r 's/.+: "(.+?)",/\1/')
}

# Systembezeichnung für Node
sysName() {
  declare -A sys
  sys[linux]="linux"
  sys[mac]="darwin"
  sys[win]="win32"
  echo ${sys[$os]}
}

# testen, ob auf Daten aus einem Repository zurückgegriffen werden kann
gitOkay() {
  local okay=0
  if command -v git >/dev/null 2>&1; then # git installiert?
    git status &> /dev/null # Repository vorhanden?
    if (( $? == 0 )); then
      git describe --abbrev=0 &> /dev/null # Tags vorhanden?
      if (( $? == 0 )); then
        okay=1
      fi
    fi
  fi
  echo $okay
}

# Mail-Adresse des Maintainers ermitteln
getMail() {
  local mail=""

  # Maintainer im Repository suchen
  local okay=$(gitOkay)
  if (( okay > 0 )); then
    local tagger=$(git show $(git describe --abbrev=0) | head -n 2 | tail -n 1)
    local name=$(echo "$tagger" | sed -r 's/.+?:\s+(.+?)\s<.+/\1/')
    if [ ${adressen[$name]+isset} ]; then
      mail=${adressen[$name]/ /@}
      mail=${mail/ /.}
    else
      mail="no-reply@address.com"
    fi
  fi

  # keine Adresse gefunden
  if test -z "$mail"; then
    mail="no-replay@address.com"
  fi

  # Adresse zurückgeben
  echo "$mail"
}

# Script konfigurieren
konfiguration() {
  # Script-Typ
  while : ; do
    read -ep "Typ (installer/packager/tarball): " type
    if ! echo "$type" | egrep -q "^(installer|packager|tarball)$"; then
      zeilenWeg 1
      continue
    fi
    break
  done

  # Betriebssystem
  os=""
  if [ "$type" != "tarball" ]; then
    while : ; do
      read -ep "OS (linux/mac/win): " os
      if ! echo "$os" | egrep -q "^(linux|win|mac)$"; then
        zeilenWeg 1
        continue
      fi
      break
    done
  fi

  # Installer
  pkg=""
  if [ "$type" = "installer" ]; then
    # Installer-Format
    if [ "$os" = "linux" ]; then
      while : ; do
        read -ep "Format (appImage/deb/rpm): " pkg
        if ! echo "$pkg" | egrep -q "^(appImage|deb|rpm)$"; then
          zeilenWeg 1
          continue
        fi
        break
      done
    elif [ "$os" = "mac" ]; then
      while : ; do
        read -ep "Format (dmg): " -i "dmg" pkg
        if ! echo "$pkg" | egrep -q "^(dmg)$"; then
          zeilenWeg 1
          continue
        fi
        break
      done
    elif [ "$os" = "win" ]; then
      while : ; do
        read -ep "Format (nsis): " -i "nsis" pkg
        if [ "$pkg" != "nsis" ]; then
          zeilenWeg 1
          continue
        fi
        break
      done
    fi
  fi

  # Packager
  arch=""
  if [ "$type" = "packager" ]; then
    # Kompression
    while : ; do
      read -ep "Archiv (-/gz/zip): " arch
      if ! echo "$arch" | egrep -q "^(-|gz|zip)$"; then
        zeilenWeg 1
        continue
      fi
      break
    done
    # Build-Ordner
    build="../build"
    read -ep "Build-Ordner: " -i "$build" build
  fi

  # Bereinigen
  while : ; do
    read -ep "Aufräumen (j/n): " clean
    if ! echo "$clean" | egrep -q "^(j|n)$"; then
      zeilenWeg 1
      continue
    fi
    break
  done

  # Ergebnis
  job="type=${type}"
  if ! test -z "$os"; then
    job+="|os=${os}"
  fi
  if ! test -z "$pkg"; then
    job+="|pkg=${pkg}"
  fi
  if ! test -z "$arch"; then
    job+="|arch=${arch}"
  fi
  if ! test -z "$build"; then
    job+="|build=${build}"
  fi
  job+="|clean=${clean}"
}

# Changelog für DEB- oder RPM-Pakete erzeugen
makeChangelog() {
  # git nicht installiert
  if ! command -v git >/dev/null 2>&1; then
    echo "" # leeren Changelog erzeugen
    return
  fi

  # kein Repository gefunden
  git status &> /dev/null
  if (( $? > 0 )); then
    echo "" # leeren Changelog erzeugen
    return
  fi

  # Changelog erzeugen
  node build-changelog.mjs $1
}

makeArchive() {
  echo -e "  \033[1;32m*\033[0m Archiv erstellen"
  cd "$1"

  # Dateiname
  version=$(appVersion)
  system=$(sysName)
  ext=$arch
  if [ "$arch" = "gz" ]; then
    ext="tar.gz";
  fi
  file="zettelstraum_${version}_${system}_x64.${ext}"

  # altes Archiv löschen
  if test -e "$file"; then
    rm $file
  fi

  # neues Archiv erstellen
  if [ "$arch" = "gz" ]; then
    tar -c -f $file -z zettelstraum-${system}-x64
  elif [ "$arch" = "zip" ]; then
    zip -qr $file zettelstraum-${system}-x64
  fi

  cd "$dir"
}

# Job ausführen
#   $1 = String mit Variablen, Trennzeichen "|"
execJob() {
  echo -e "  \033[1;32m*\033[0m Job starten: $1"
  echo -e "    App-Version: \033[38;5;63m$(appVersion)\033[0m"

  # Variablen zurücksetzen und dann neu einlesen
  type=""
  os=""
  pkg=""
  arch=""
  clean=""
  build=""
  vars=$(echo "$1" | tr "|" "\n")
  for var in $vars; do
    eval "$var"
  done
  if echo "$build" | egrep -q "^\.\."; then
    build="${dir}/../${build}"
  elif test -z "$build" || ! test -e "$build"; then
    build="${dir}/../../build"
  fi

  # Checks
  if [ "$arch" = "zip" ] && ! command -v zip >/dev/null 2>&1; then
    echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"zip\" nicht installiert"
    return
  fi

  # Build-Ordner erstellen
  if ! test -d "$build"; then
    echo -e "  \033[1;32m*\033[0m $build erstellen"
    mkdir "$build"
    if (( $? > 0 )); then
      echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"$build\" erstellen gescheitert"
      return
    fi
  fi

  # Changelog für DEB bzw. RPM erstellen
  if echo "$pkg" | egrep -q "^(deb|rpm)$" ; then
    echo -e "  \033[1;32m*\033[0m Changelog erstellen"
    cd "$dir"
    makeChangelog $pkg > "${build}/changelog"
  fi

  # Installer
  if [ "$type" = "installer" ]; then
    echo -e "  \033[1;32m*\033[0m Installer ausführen"
    cd "${dir}/../"
    node build/build.mjs builder $(sysName) $pkg "$build" $(getMail)
    if (( $? > 0 )); then
      echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Installer-Script abgebrochen"
      cd "$dir"
      return
    fi
  fi

  # Packager
  if [ "$type" = "packager" ]; then
    echo -e "  \033[1;32m*\033[0m Packager ausführen"
    cd "${dir}/../"
    node build/build.mjs packager $(sysName) "$build"
    if (( $? > 0 )); then
      echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Installer-Script abgebrochen"
      cd "$dir"
      return
    fi
    if ! echo "$arch" | egrep -q "^(gz|zip)$"; then
      system=$(sysName)
      mv "${build}/zettelstraum-${system}-x64" "${build}/zettelstraum-${system}-x64-packed"
    fi
  fi

  # Tarball
  if [ "$type" = "tarball" ]; then
    echo -e "  \033[1;32m*\033[0m Tarball erstellen"
    cd "${dir}/../"
    if (( $(gitOkay) == 0 )); then
      echo -e "\n\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Packen abgebrochen"
      return
    fi
    version=$(appVersion)
    git archive --format=tar --prefix=zettelstraum_${version}/ HEAD | gzip > "${build}/zettelstraum_${version}.tar.gz"
  fi

  cd "$dir"

  # Archiv erstellen
  if echo "$arch" | egrep -q "^(gz|zip)$"; then
    makeArchive "$build"
  fi

  # Bereinigen
  if [ "$clean" = "j" ]; then
    echo -e "  \033[1;32m*\033[0m $build aufräumen"

    # Bereinigen
    while read f; do
      if ! echo "$f" | egrep -q "(\.blockmap|changelog|-unpacked|\.yaml|\.yml|zettelstraum-(darwin|linux|win32)-x64)\$"; then
        continue
      fi
      rm -r "$f"
    done < <(find "$build" -mindepth 1 -maxdepth 1)
  fi
}

# Datei mit SHA-Summen erstellen
shaSummen() {
  local build="${dir}/../../build/"

  # Prüfen, ob "build" vorhanden ist
  if ! test -d "$build"; then
    echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"../../build\" nicht gefunden"
    return
  fi

  # Summen-Datei erstellen
  echo -e "  \033[1;32m*\033[0m Datei mit sha256-Summen erstellen"
  cd "$build"
  sha256sum * > sha256sums.txt

  cd "$dir"
}

# Liste der Presets ausdrucken
presetsPrint() {
  echo -e "\n"
  for (( i=0; i<${#presets[@]}; i++ )); do
    echo " [$[i + 1]] ${presets[$i]}"
  done
  echo " [x] Abbruch"
  while : ; do
    read -ep "  " preset
    if [ "$preset" = "x" ]; then
      return
    elif echo "$preset" | egrep -q "^[1-9]{1}$" && (( preset  <= ${#presets[@]} )); then
      presetsExec $preset
      break
    else
      zeilenWeg 1
    fi
  done
}

# Preset ausführen
presetsExec() {
  # Jobs durchführen
  declare -n array="preset$1"
  presetNr=$[$1 - 1]
  for (( i=0; i<${#array[@]}; i++ )); do
    echo -en "\n  \033[1;33m*\033[0m Preset \"${presets[$presetNr]}\":"
    echo -e " \033[1;33mJob $[i + 1]/${#array[@]}\033[0m\n"
    execJob "${array[$i]}"
  done

  # Jobs erledigt
  echo -e "\n  \033[1;32m*\033[0m Preset \"${presets[$presetNr]}\": \033[1;32mErledigt!\033[0m"
}

# Starter
while : ; do
  # Auswahl treffen
  read -ep "Ausführen (job/release/preset/sha/config/modules/exit): " action
  if ! echo "$action" | egrep -q "^(job|release|preset|sha|config|modules|exit)$"; then
    zeilenWeg 1
    continue
  fi

  # Job erstellen und ausführen
  if [ "$action" = "job" ]; then
    echo -e "\n"
    konfiguration
    echo -e "\n"
    execJob "$job"
    echo -e "\n"
  # Release vorbereiten
  elif [ "$action" = "release" ]; then
    echo -e "\n"
    bash "${dir}/build-release.sh" inc
    echo -e "\n"
  # Preset auswählen
  elif [ "$action" = "preset" ]; then
    presetsPrint
    echo -e "\n"
  # Datei mit SHA-Summen erstellen
  elif [ "$action" = "sha" ]; then
    shaSummen
    echo -e "\n"
  # Konfiguration anzeigen
  elif [ "$action" = "config" ]; then
    echo -e "\n"
    konfiguration
    echo -e "\n\nJob-Konfiguration:\n  \033[1;32m*\033[0m $job\n\n"
  # Module auffrischen
  elif [ "$action" = "modules" ]; then
    echo -e "\n"
    bash "${dir}/build-modules.sh" inc
    echo -e "\n"
  # Script verlassen
  elif [ "$action" = "exit" ]; then
    exit 0
  fi
done
