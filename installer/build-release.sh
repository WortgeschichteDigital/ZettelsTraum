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
git status &> /dev/null
if (( $? > 0 )); then
	echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m kein Repository gefunden"
	exit 1
fi

# nicht in Branch 'master'
if [ "$(git branch --show-current)" != "master" ]; then
	echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m nicht in Branch 'master'"
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

# Release vorbereiten
vorbereiten() {
	echo -e "  \033[1;32m*\033[0m Release vorbereiten"

	cd "${dir}/../"

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
