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

# nicht in Branch 'master' TODO Test einschalten
# if [ "$(git branch --show-current)" != "master" ]; then
# 	echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m nicht in Branch 'master'"
# 	exit 1
# fi

# Working Tree nicht clean TODO Test einschalten
# if [ "$(git diff --stat)" != "" ]; then
# 	echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Working Tree nicht clean"
# 	exit 1
# fi

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
	echo $(grep '"version":' "$packageJson" | perl -pe 's/.+: "(.+?)",/\1/')
}

# HTML-Update
updateHtml() {
	# App-Version ermitteln
	local version=$(appVersion)

	# Copyright-Jahr in "Über App" updaten
	local htmlUeber="${dir}/../win/ueberApp.html"
	local copyrightJahr="2019"
	if [ "$(date +%Y)" != "$copyrightJahr" ]; then
		copyrightJahr+="–$(date +%Y)"
	fi
	local copyrightJahrUeber=$(grep "id=\"copyright-jahr\"" "$htmlUeber" | perl -pe 's/.+"copyright-jahr">(.+?)<.+/\1/')
	if [ "$copyrightJahrUeber" != "$copyrightJahr" ]; then
		echo -e "  \033[1;32m*\033[0m Copyright-Jahr auffrischen"
		sed -i "s/copyright-jahr\">.*<\/span>/copyright-jahr\">${copyrightJahr}<\/span>/" "$htmlUeber"
	fi

	# Changelog auffrischen
	echo -e "  \033[1;32m*\033[0m Changelog auffrischen"

	local htmlChangelog="${dir}/../win/changelog.html"

	local zeileKommentar="<!-- Start Versionsblock ${version} -->"
	sed -i "0,/<!-- Start Versionsblock .* -->/s/<!-- Start Versionsblock .* -->/${zeileKommentar}/" "$htmlChangelog"

	local zeileVersion="<div class=\"version\">${version}<\/div>"
	sed -i "0,/<div class=\"version\">.*<\/div>/s/<div class=\"version\">.*<\/div>/${zeileVersion}/" "$htmlChangelog"

	local monate=(
		"Januar"
		"Februar"
		"März"
		"April"
		"Mai"
		"Juni"
		"Juli"
		"August"
		"September"
		"Oktober"
		"November"
		"Dezember"
	)
	local tag=$(date +%-d)
	local monat=$(date +%-m)
	monat=${monate[$[$monat - 1]]}
	local heute=$(date +%Y-%m-%d)
	local zeileH2="<h2><span>Version ${version}<\/span><time datetime=\"${heute}\">${tag}. ${monat} $(date +%Y)<\/time><\/h2>"
	sed -i "0,/<h2>.*<\/h2>/s/<h2>.*<\/h2>/${zeileH2}/" "$htmlChangelog"
}

# Release-Notes erstellen
# 	$1 = Versionsnummer
makeReleaseNotes() {
	local output="# Release Notes v$1\n\n"

	# Commits zusammentragen
	declare -A clCommits
	j=0
	while read z; do
		IFS=" " read -r sha1 message <<< "$z"
		clCommits[$j]="$message"
		(( j++ ))
	done < <(git log -E --grep="^(Removal|Feature|Change|Update|Fix): " --oneline $(git describe --abbrev=0)..HEAD)

	# Commits sortieren
	local commitTypen=(Removal Feature Change Update Fix)
	for typ in ${!commitTypen[@]}; do
		for commit in ${!clCommits[@]}; do
			local message=${clCommits[$commit]}
			if echo "$message" | egrep -q "^${commitTypen[$typ]}"; then
				output+="* $message\n"
			fi
		done
	done

	# Release Note schreiben
	echo -en "$output" > "../releases/v${1}.md"
}

# Release vorbereiten
vorbereiten() {
	echo -e "  \033[1;32m*\033[0m Release vorbereiten\n"

	# Module updaten
	read -p "  Nächste Aufgabe \"Module updaten\" (Enter) . . ."
	echo ""
# 	bash "${dir}/build-modules.sh" inc TODO anstellen
	cd "${dir}/../"
	echo ""
	while : ; do
		read -ep "Commit erstellen (j/n): " commit
		if [ "$commit" = "j" ]; then
			zeilenWeg 1
			git status
			echo ""
			read -p "  Nächste Aufgabe \"Commit erstellen\" (Enter) . . ."
			echo ""
			git commit -a
			echo ""
			git status
			break
		elif [ "$commit" = "n" ]; then
			zeilenWeg 1
			break
		else
			zeilenWeg 1
		fi
	done

	# Version festlegen
	read -p "  Nächste Aufgabe \"Version festlegen\" (Enter) . . ."
	echo -e "\n  \033[1;32m*\033[0m Version festlegen\n"
	while : ; do
		read -ep "Version: " -i "$(appVersion)" version
		if ! echo "$version" | egrep -q "^[0-9]+\.[0-9]+\.[0-9]+$"; then
			echo -e "\n\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Versionsformat falsch"
			sleep 2
			zeilenWeg 4
			continue
		else
			zeilenWeg 1
			echo -e "Version: \033[1;33m${version}\033[0m"
			# Version in package.json eintragen
			local zeile="\t\"version\": \"${version}\","
# 			sed -i "s/\t\"version\".*/${zeile}/" "package.json" TODO anstellen
			echo ""
			break
		fi
	done

	# HTML-Update
	read -p "  Nächste Aufgabe \"HTML-Update\" (Enter) . . ."
	echo ""
# 	updateHtml TODO anstellen
	echo ""

	# Release-Commit erstellen
	read -p "  Nächste Aufgabe \"Release-Commit erstellen\" (Enter) . . ."
	echo -e "\n  \033[1;32m*\033[0m Release-Commit erstellen\n"
	git status
	echo ""
# 	git commit -am "Release vorbereitet"
	echo ""
	git status
	echo ""

	# Release-Notes erstellen
	read -p "  Nächste Aufgabe \"Release-Notes erstellen\" (Enter) . . ."
	echo -e "\n  \033[1;32m*\033[0m Release-Notes erstellen\n"
# 	makeReleaseNotes $version TODO anstellen
	echo ""

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
