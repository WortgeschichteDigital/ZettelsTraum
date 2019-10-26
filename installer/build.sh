#!/bin/bash

presets=(
	"GitHub"
	"Arbeitsgruppe"
	"Test (Linux)"
	"Test (alle)"
)
preset1=(
	"type=installer|os=linux|pkg=deb|main=Nico_Dorn|update=j|clean=j"
	"type=installer|os=win|pkg=nsis|update=n|clean=j"
	"type=packager|os=linux|arch=gz|update=n|clean=j"
	"type=packager|os=mac|arch=gz|update=n|clean=j"
	"type=packager|os=win|arch=zip|update=n|clean=j"
)
preset2=(
	"type=installer|os=linux|pkg=deb|main=Nico_Dorn|update=j|clean=j"
	"type=installer|os=win|pkg=nsis|update=n|clean=j"
	"type=packager|os=mac|arch=gz|update=n|clean=j"
)
preset3=(
	"type=packager|os=linux|arch=-|update=n|clean=j"
)
preset4=(
	"type=packager|os=linux|arch=-|update=n|clean=j"
	"type=packager|os=win|arch=-|update=n|clean=j"
	"type=packager|os=mac|arch=gz|update=n|clean=j"
)

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

# Perl nicht installiert
if ! command -v perl >/dev/null 2>&1; then
	echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"perl\" nicht installiert"
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
	echo $(grep '"version":' "$packageJson" | perl -pe 's/.+: "(.+?)",/\1/')
}

sysName() {
	declare -A sys
	sys[linux]="linux"
	sys[mac]="darwin"
	sys[win]="win32"
	echo ${sys[$os]}
}

# Script konfigurieren
konfiguration() {
	# Script-Typ
	while : ; do
		read -ep "Typ (installer/packager): " type
		if ! echo "$type" | egrep -q "^(installer|packager)$"; then
			zeilenWeg 1
			continue
		fi
		break
	done

	# Betriebssystem
	while : ; do
		read -ep "OS (linux/mac/win): " os
		if ! echo "$os" | egrep -q "^(linux|win|mac)$"; then
			zeilenWeg 1
			continue
		fi
		break
	done

	pkg=""
	main=""
	# Installer
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

		# Maintainer
		if [ "$os" = "linux" ] && echo "$pkg" | egrep -q "^(deb|rpm)$"; then
			while : ; do
				read -ep "Maintainer: " main
				if test -z "$main"; then
					zeilenWeg 1
					continue
				fi
				main=${main// /_}
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
	fi
	
	# HTML-Update
	while : ; do
		read -ep "HTML-Update (j/n): " update
		if ! echo "$update" | egrep -q "^(j|n)$"; then
			zeilenWeg 1
			continue
		fi
		break
	done

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
	job="type=${type}|os=${os}"
	if ! test -z "$pkg"; then
		job+="|pkg=${pkg}"
	fi
	if ! test -z "$main"; then
		job+="|main=${main}"
	fi
	if ! test -z "$arch"; then
		job+="|arch=${arch}"
	fi
	job+="|update=${update}"
	job+="|clean=${clean}"
}

# HTML-Update
updateHtml() {
	# App-Version ermitteln
	version=$(appVersion)

	# HTML-Update nicht für Beta-Versionen
	if echo "$version" | grep -q "beta"; then
		return
	fi

	# Copyright-Jahr in "Über App" updaten
	htmlUeber="${dir}/../win/ueberApp.html"
	copyrightJahr="2019"
	if [ "$(date +%Y)" != "$copyrightJahr" ]; then
		copyrightJahr+="–$(date +%Y)"
	fi
	copyrightJahrUeber=$(grep "copyright-jahr" "$htmlUeber" | perl -pe 's/.+"copyright-jahr">(.+?)<.+/\1/')
	if [ "$copyrightJahrUeber" != "$copyrightJahr" ]; then
		echo -e "  \033[1;32m*\033[0m Copyright-Jahr auffrischen"
		sed -i "s/copyright-jahr\">.*<\/span>/copyright-jahr\">${copyrightJahr}<\/span>/" "$htmlUeber"
	fi

	# Changelog auffrischen
	echo -e "  \033[1;32m*\033[0m Changelog auffrischen"

	htmlChangelog="${dir}/../win/changelog.html"

	zeileKommentar="<!-- Start Versionsblock ${version} -->"
	sed -i "0,/<!-- Start Versionsblock .* -->/s/<!-- Start Versionsblock .* -->/${zeileKommentar}/" "$htmlChangelog"

	zeileVersion="<div class=\"version\">${version}<\/div>"
	sed -i "0,/<div class=\"version\">.*<\/div>/s/<div class=\"version\">.*<\/div>/${zeileVersion}/" "$htmlChangelog"

	monate=(
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
	tag=$(date +%-d)
	monat=$(date +%-m)
	monat=${monate[$[$monat - 1]]}
	jetzt=$(date +%Y-%m-%dT%H:%M:%S)
	zeileH2="<h2><span>Version ${version}<\/span><time datetime=\"${jetzt}\">${tag}. ${monat} $(date +%Y)<\/time><\/h2>"
	sed -i "0,/<h2>.*<\/h2>/s/<h2>.*<\/h2>/${zeileH2}/" "$htmlChangelog"
}

# Maintainer eintragen
setMaintainer() {
	# App-Version ermitteln
	version=$(appVersion)

	# Maintainer nicht für Beta-Versionen
	if echo "$version" | grep -q "beta"; then
		return
	fi

	# Maintainer eingetragen
	echo -e "  \033[1;32m*\033[0m Maintainer eintragen"
	maintainer="${dir}/build-changelog-maintainer.json"
	if [ "$(cat "$maintainer"  | jq -r ".[\"${version}\"]")" = "null" ]; then
		json=$(cat "$maintainer" | jq -c ".[\"${version}\"] = \"${main//_/ }\"")
	else
		json=$(cat "$maintainer" | jq -c ". + { \"${version}\": \"${main//_/ }\" }")
	fi
	echo $json > "$maintainer"
}

makeArchive() {
	echo -e "  \033[1;32m*\033[0m Archiv erstellen"
	cd "${dir}/../../build"

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

	# Quellordner umbenennen
	if [ "$clean" = "j" ]; then
		mv zettelstraum-${system}-x64 zettelstraum-${system}-x64-packed
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
	main=""
	arch=""
	update=""
	clean=""
	vars=$(echo "$1" | tr "|" "\n")
	for var in $vars; do
		eval "$var"
	done

	# Checks
	if echo "$pkg" | egrep -q "^(deb|rpm)$" && ! command -v jq >/dev/null 2>&1; then
		echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"jq\" nicht installiert"
		return
	elif echo "$pkg" | egrep -q "^(deb|rpm)$" && ! command -v php >/dev/null 2>&1; then
		echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"php\" nicht installiert"
		return
	elif [ "$arch" = "zip" ] && ! command -v zip >/dev/null 2>&1; then
		echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"zip\" nicht installiert"
		return
	fi

	# Build-Ordner erstellen
	if ! test -d "${dir}/../../build"; then
		echo -e "  \033[1;32m*\033[0m ../../build erstellen"
		mkdir "${dir}/../../build"
		if (( $? > 0 )); then
			echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m \"../../build\" erstellen gescheitert"
			return
		fi
	fi

	# changelog.html und ueberApp.html auffrischen
	if [ "$update" = "j" ]; then
		updateHtml
	fi

	# Maintainer und Changelog
	if ! test -z "$main"; then
		setMaintainer
		echo -e "  \033[1;32m*\033[0m Changelog erstellen"
		php "${dir}/build-changelog.php" $pkg "$dir"
		if (( $? > 0 )); then
			return
		fi
	fi

	# Installer
	if [ "$type" = "installer" ]; then
		echo -e "  \033[1;32m*\033[0m Installer ausführen"
		cd "${dir}/../"
		node ./installer/installer-${os}.js $pkg
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
		node ./installer/packager.js $(sysName)
		if (( $? > 0 )); then
			echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Installer-Script abgebrochen"
			cd "$dir"
			return
		fi
	fi

	cd "$dir"

	# Archiv erstellen
	if echo "$arch" | egrep -q "^(gz|zip)$"; then
		makeArchive
	fi

	# Bereinigen
	if [ "$clean" = "j" ]; then
		echo -e "  \033[1;32m*\033[0m ../../build aufräumen"

		# Bereinigen
		while read f; do
			if echo "$f" | egrep -q "(zettelstraum-(darwin|linux|win32)-x64|\.AppImage|\.deb|\.dmg|\.exe|\.rpm|\.tar\.gz|\.zip)\$"; then
				continue
			fi
			rm -r "$f"
		done < <(find "${dir}/../../build" -mindepth 1 -maxdepth 1)
	fi
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
		if [ "$preset" = "x" ] || echo "$preset" | egrep -q "^[1-9]{1}$" && (( preset  <= ${#presets[@]} )); then
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
	echo -e "\n"

	# Auswahl treffern
	read -ep "Ausführen (job/preset/config/modules/exit): " action
	if ! echo "$action" | egrep -q "^(job|preset|config|modules|exit)$"; then
		zeilenWeg 3
		continue
	fi

	# Job erstellen und ausführen
	if [ "$action" = "job" ]; then
		echo -e "\n"
		konfiguration
		echo -e "\n"
		execJob "$job"
	# Konfiguration anzeigen
	elif [ "$action" = "config" ]; then
		echo -e "\n"
		konfiguration
		echo -e "\n\nJob-Konfiguration:\n  \033[1;32m*\033[0m $job"
	# Preset auswählen
	elif [ "$action" = "preset" ]; then
		presetsPrint
	# Module auffrischen
	elif [ "$action" = "modules" ]; then
		echo -e "\n"
		bash "${dir}/build-modules.sh" inc
	# Script verlassen
	elif [ "$action" = "exit" ]; then
		exit 0
	fi
done
