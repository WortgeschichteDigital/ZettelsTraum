#!/bin/bash

# Presets
presets=(
	"GitHub"
	"Test (Linux)"
	"Test (alle)"
)
preset1=(
	"type=installer|os=linux|pkg=deb|clean=j"
	"type=installer|os=win|pkg=nsis|clean=j"
	"type=packager|os=linux|arch=gz|clean=j"
	"type=packager|os=mac|arch=gz|clean=j"
	"type=packager|os=win|arch=zip|clean=j"
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
adressen["Nico Dorn"]="ndorn gwdg de"

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
		local name=$(echo "$tagger" | perl -pe 's/.+?:\s+(.+?)\s<.+/$1/')
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
	job+="|clean=${clean}"
}

# HTML-Update
updateHtml() {
	# App-Version ermitteln
	version=$(appVersion)

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

	# alle Tags ermitteln
	tags=($(git tag --sort=-creatordate))

	# Variable für den Changelog
	output=""

	# für jeden Tag einen Release-Block erzeugen
	for (( i=0; i<${#tags[@]}; i++ )); do
		# Version, Name, Mail, Datum, Release-Typ ermitteln
		clVersion=${tags[$i]}
		clName=""
		clMail=""
		clDate=""
		clRelease="" # wird als Fallback genutzt, wenn keine Liste mit wichtigen Commits vorhanden ist
		while read z; do
			if test -z "$z"; then
				continue
			elif echo "$z" | egrep -q "^Tagger:"; then
				clName=$(echo "$z" | perl -pe 's/.+?:\s+(.+?)\s<.+/$1/')
				if [ ${adressen[$clName]+isset} ]; then
					clMail=${adressen[$clName]/ /@}
					clMail=${clMail/ /.}
				else
					clMail="no-reply@address.com"
				fi
			elif echo "$z" | egrep -q "^Date:"; then
				datum=($(echo "$z" | perl -pe 's/.+?:\s+(.+)/$1/'))
				if [ "$1" = "deb" ]; then
					clDate="${datum[0]}, ${datum[2]} ${datum[1]} ${datum[4]} ${datum[3]} ${datum[5]}"
				elif [ "$1" = "rpm" ]; then
					clDate="${datum[0]} ${datum[1]} ${datum[2]} ${datum[4]}"
				fi
			else
				clRelease=$(echo "$z" | perl -pe 's/\sv[0-9]+\.[0-9]+\.[0-9]+//')
			fi
		done < <(git show "${tags[$i]}" | head -n 5 | tail -n 4)

		# Commits ermitteln
		clCommits=() # das Array muss nach jedem Durchlauf geleert werden
		declare -A clCommits
		next=$[i + 1]
		j=0
		while read z; do
			IFS=" " read -r sha1 message <<< "$z"
			clCommits[$j]="$message"
			(( j++ ))
		done < <(git log -E --grep="^(Removal|Feature|Change|Update|Fix): " --oneline ${tags[$next]}..${tags[$i]})

		# Changelog-Block bauen
		commitTypen=(Removal Feature Change Update Fix)
		if [ "$1" = "deb" ]; then
			output+="zettelstraum (${clVersion}) whatever; urgency=medium\n"
			output+="\n"
			if (( ${#clCommits[@]} > 0 )); then
				for typ in ${!commitTypen[@]}; do
					for commit in ${!clCommits[@]}; do
						message=${clCommits[$commit]}
						if echo "$message" | egrep -q "^${commitTypen[$typ]}"; then
							output+="  * $message\n"
						fi
					done
				done
			else
				output+="  * ${clRelease}\n"
			fi
			output+="\n"
			output+=" -- ${clName} <${clMail}> ${clDate}\n"
			if (( i < ${#tags[@]} - 1 )); then
				output+="\n"
			fi
		elif [ "$1" = "rpm" ]; then
			output+="* ${clDate} ${clName} <${clMail}> - ${clVersion}\n"
			if (( ${#clCommits[@]} > 0 )); then
				for typ in ${!commitTypen[@]}; do
					for commit in ${!clCommits[@]}; do
						message=${clCommits[$commit]}
						if echo "$message" | egrep -q "^${commitTypen[$typ]}"; then
							output+="- $message\n"
						fi
					done
				done
			else
				output+="- ${clRelease}\n"
			fi
			if (( i < ${#tags[@]} - 1 )); then
				output+="\n"
			fi
		fi
	done
	
	echo "$output"
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
	arch=""
	clean=""
	vars=$(echo "$1" | tr "|" "\n")
	for var in $vars; do
		eval "$var"
	done

	# Checks
	if [ "$arch" = "zip" ] && ! command -v zip >/dev/null 2>&1; then
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

	# Changelog für DEB bzw. RPM erstellen
	if echo "$pkg" | egrep -q "^(deb|rpm)$" ; then
		echo -e "  \033[1;32m*\033[0m Changelog erstellen"
		echo -en "$(makeChangelog $pkg)" > "${dir}/../../build/changelog"
	fi

	# Installer
	if [ "$type" = "installer" ]; then
		echo -e "  \033[1;32m*\033[0m Installer ausführen"
		cd "${dir}/../"
		node ./installer/installer-${os}.js $pkg $(getMail)
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
		node ./installer/packager.js $(sysName) $(getMail)
		if (( $? > 0 )); then
			echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Installer-Script abgebrochen"
			cd "$dir"
			return
		fi
	fi

	# Tarball
	if [ "$type" = "tarball" ]; then
		echo -e "  \033[1;32m*\033[0m Tarball erstellen"
		if (( $(gitOkay) == 0 )); then
			echo -e "\033[1;31mFehler!\033[0m\n  \033[1;31m*\033[0m Packen abgebrochen"
			return
		fi
		version=$(git describe --abbrev=0)
		git archive --format=tar --prefix=zettelstraum-${version}/ HEAD | gzip > "${dir}/../../build/zettelstraum-${version}.tar.gz"
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
