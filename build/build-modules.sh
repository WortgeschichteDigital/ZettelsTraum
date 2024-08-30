#!/bin/bash

modules=(
  "electron"
  "electron-builder"
  "@electron/packager"
)

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

      $(echo -e "\033[48;5;254;38;5;63m         Modules        \033[0m")
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

# Node nicht installiert
if ! command -v node >/dev/null 2>&1; then
  echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"node\" nicht installiert"
  exit 1
fi

# npm nicht installiert
if ! command -v npm >/dev/null 2>&1; then
  echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"npm\" nicht installiert"
  exit 1
fi

# Git-Repository vorhanden?
cd "$dir"
repository=0
if command -v git >/dev/null 2>&1; then
  git status &> /dev/null
  if (( $? == 0 )); then
    repository=1
  fi
fi

# Git-Repository vorhanden, aber nicht in Branch 'main'
if (( repository > 0 )) && [ "$(git branch --show-current)" != "main" ]; then
  echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m nicht in Branch 'main'\n"
  while : ; do
    read -ep "checkout 'main' (j/n): " checkout
    if [ "$checkout" = "j" ]; then
      echo ""
      # Working Tree nicht clean
      if [ "$(git diff --stat)" != "" ]; then
        echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Working Tree nicht clean"
        exit 1
      fi
      # checkout 'main'
      git checkout main
      if (( $? > 0 )); then
        echo -e "\n\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m checkout 'main' misslungen"
        exit 1
      fi
      break
    elif [ "$checkout" = "n" ]; then
      exit 1
    else
      zeilenWeg 1
    fi
  done
fi

# Zeilen entfernen
#   $1 = Number, die angibt, wie viele Zeilen entfernt werden sollen
zeilenWeg() {
  for (( i=0; i<$1; i++ )); do
    tput cuu1
    tput el
  done
}

# Modul-Version ermitteln
#   $1 = Pfad zur package.json
getVersion() {
  echo $(grep '"version":' "$1" | sed -r 's/.+?: "(.+?)".*/\1/')
}

# Module installieren
installModules() {
  echo -e "  \033[1;32m*\033[0m Module installieren oder updaten"

  cd "${dir}/../"

  for (( i=0; i<${#modules[@]}; i++ )); do
    moduleBase=${modules[$i]%%@*}
    echo -e "\n*** ${moduleBase} ***"

    # nicht installiert => installieren
    lokal="node_modules/${moduleBase}/package.json"
    if ! test -e "$lokal"; then
      echo -e "  \033[1;32m*\033[0m Installation\n"
      npm install --save-dev ${modules[$i]}
      continue
    fi

    # installiert => updaten
    versionPkg=$(npm show ${modules[$i]} version)
    versionInst=$(getVersion "$lokal")
    if [ "$versionPkg" != "$versionInst" ]; then
      echo -e "installiert \033[1;31m$versionInst\033[0m, online \033[1;32m$versionPkg\033[0m"
      echo -e "  \033[1;32m*\033[0m Update"
      npm install --save-dev ${modules[$i]}
    fi
    echo -e "installiert \033[1;32m$(getVersion "$lokal")\033[0m"
  done

  cd "$dir"
}

# Starter
if [ "$1" = "inc" ]; then
  installModules
else
  while : ; do
    read -ep "Module installieren oder updaten (j/n): " install
    if [ "$install" = "j" ]; then
      echo -e "\n"
      installModules
      exit 0
    elif [ "$install" = "n" ]; then
      exit 0
    else
      zeilenWeg 1
    fi
  done
fi
