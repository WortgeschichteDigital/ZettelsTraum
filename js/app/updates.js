"use strict";

let updates = {
	// wertet den RSS-Feed auf GitHub aus
	//   auto = Boolean
	//     (Suche wurde automatisch angestoßen)
	async check (auto) {
		// beim Enwickeln nicht automatisch suchen
		if (auto && !appInfo.packaged) {
			return;
		}
		// ggf. Such-Animation starten
		updates.animation(auto, true);
		// RSS-Feed laden
		let feedback = await helfer.fetchURL("https://github.com/WortgeschichteDigital/ZettelsTraum/releases.atom");
		// RSS-Feed konnte nicht abgerufen werden
		if (feedback.fehler) {
			updates.animation(auto, false);
			updates.fehler(auto, feedback.fehler, false);
			if (!auto) {
				updates.fensterFehler();
			}
			return;
		}
		// RSS-Feed auswerten
		let parser = new DOMParser(),
			rss = parser.parseFromString(feedback.text, "text/xml");
		// RSS-Feed war offenbar nicht wohlgeformt;
		// (nach rss.querySelector("parsererror") kann nicht geschaut werden, weil
		// GitHub mitunter nicht wohlgeformtes XML ausliefert; in solchen Fällen sind
		// aber dennoch korrekte Entries vorhanden)
		let entries = rss.querySelectorAll("entry");
		if (!entries.length) {
			updates.animation(auto, false);
			updates.fehler(auto, "RSS-Feed nicht wohlgeformt", true);
			return;
		}
		// RSS-Feed auswerten
		let releaseNotes = "";
		for (let i = 0, len = entries.length; i < len; i++) {
			let entry = entries[i],
				version = entry.querySelector("id").firstChild.nodeValue.match(/[0-9]+\.[0-9]+\.[0-9]+$/);
			if (!version) {
				continue;
			}
			if (i === 0) { // jüngste Version, die online ist
				optionen.data.updates.online = version[0];
			}
			if (updates.verToInt(appInfo.version) >= updates.verToInt(version[0])) { // installierte Version ist höher oder gleich
				break;
			}
			const content = entry.querySelector("content").firstChild.nodeValue;
			if (!/<h1>/.test(content)) { // keine Version mit Release-Notes
				continue;
			}
			releaseNotes += content;
		}
		// Release-Notes an Main schicken
		const {ipcRenderer} = require("electron");
		ipcRenderer.invoke("updates-save-data", releaseNotes);
		// Check erfolgreich ausgeführt
		optionen.data.updates.checked = new Date().toISOString();
		optionen.speichern();
		// Update-Hinweis ein- bzw. ausblenden
		updates.hinweis();
		// Release-Notes ins Update-Fenster eintragen
		updates.fensterFill();
	},
	// speichert Bild und Text des Update-Status, um sie ggf. zurücksetzen zu können
	animationStatus: {
		img: "",
		text: "",
	},
	// Such-Animation
	//   auto = Boolean
	//     (Suche wurde automatisch angestoßen)
	//   start = Boolean
	//     (die Animation soll starten)
	animation (auto, start) {
		if (auto) {
			return;
		}
		let feld = document.querySelector("#updatesWin-header td");
		if (start) {
			// gegenwärtige Anzeige zwischenspeichern
			updates.animationStatus.img = feld.firstChild.src;
			updates.animationStatus.text = feld.childNodes[1].nodeValue;
			// Animation starten
			while (feld.childNodes.length > 1) {
				feld.removeChild(feld.lastChild);
			}
			feld.firstChild.src = "img/pfeil-kreis.svg";
			feld.appendChild(document.createTextNode("suche Updates"));
			feld.classList.add("rotieren-bitte");
		} else if (updates.animationStatus.img) {
			// Bild und Text zurücksetzen
			while (feld.childNodes.length > 1) {
				feld.removeChild(feld.lastChild);
			}
			feld.firstChild.src = updates.animationStatus.img;
			feld.appendChild(document.createTextNode(updates.animationStatus.text));
			feld.classList.remove("rotieren-bitte");
		}
	},
	// Fehlermeldung ausgeben
	//   auto = Boolean
	//     (Suche wurde automatisch angestoßen)
	//   err = String
	//     (Fehlermeldung)
	//   log = Boolean
	//     (der Fehler soll protokolliert werden)
	fehler (auto, err, log) {
		if (log) {
			let e = new Error(err);
			helfer.onError(e);
			updates.fensterFehler();
		}
		if (auto) {
			return;
		}
		dialog.oeffnen({
			typ: "alert",
			text: `Beim Laden der Release-Notes ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err}</p>`,
		});
	},
	// konvertiert eine Semver-Versionsnummer in eine Ziffer
	// (um sie leichter vergleichbar zu machen)
	//   version = String
	//     (die Versionsnummer)
	verToInt (version) {
		version = version.split("-")[0];
		version = version.replace(/[0-9]+/g, m => m.padStart(3, "0"));
		version = version.replace(/\./g, "");
		return parseInt(version, 10);
	},
	// Hinweis, dass Updates verfügbar sind, ein- bzw. ausblenden
	hinweis () {
		let icon = document.getElementById("updates");
		// die neuste Version ist bereits installiert
		if (!optionen.data.updates.online ||
				updates.verToInt(appInfo.version) >= updates.verToInt(optionen.data.updates.online)) {
			icon.classList.add("aus");
			return;
		}
		// online gibt es eine neuere Version
		icon.classList.remove("aus");
	},
	// Update-Fenster
	fenster () {
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("updatesWin");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Release-Notes eintragen
		updates.fensterFill();
	},
	// Update-Fenster mit Release-Notes füllen
	async fensterFill () {
		// Daten holen
		const {ipcRenderer} = require("electron");
		let data = await ipcRenderer.invoke("updates-get-data"),
			td = document.querySelectorAll("#updatesWin-header td");
		// Icon und Notiz
		td[0].classList.remove("rotieren-bitte"); // ggf. Animation ausschalten
		while (td[0].childNodes.length > 1) {
			td[0].removeChild(td[0].lastChild);
		}
		if (!optionen.data.updates.online) {
			td[0].firstChild.src = "img/fragezeichen.svg";
			td[0].appendChild(document.createTextNode("noch nie nach Updates gesucht"));
		} else if (updates.verToInt(appInfo.version) < updates.verToInt(optionen.data.updates.online)) {
			td[0].firstChild.src = "img/pfeil-kreis-rot-48.svg";
			td[0].appendChild(document.createTextNode("Updates verfügbar"));
			// ggf. Link zum Laden der Release-Notes anzeigen
			if (!data.notes) {
				td[0].appendChild(document.createTextNode(" ("));
				let a = document.createElement("a");
				a.href = "#";
				a.textContent = "Release-Notes";
				td[0].appendChild(a);
				td[0].appendChild(document.createTextNode(")"));
				a.addEventListener("click", evt => {
					evt.preventDefault();
					updates.check(false);
				});
			}
		} else {
			td[0].firstChild.src = "img/check-gruen.svg";
			td[0].appendChild(document.createTextNode("keine Updates verfügbar"));
		}
		// überprüft
		let ueberprueft = " ";
		if (optionen.data.updates.checked) {
			ueberprueft = helfer.datumFormat(optionen.data.updates.checked, "minuten");
		}
		td[2].replaceChild(document.createTextNode(ueberprueft), td[2].lastChild);
		// installiert
		td[1].replaceChild(document.createTextNode(`v${appInfo.version}`), td[1].lastChild);
		// online
		let online = " ";
		if (optionen.data.updates.online) {
			online = `v${optionen.data.updates.online}`;
		}
		td[3].replaceChild(document.createTextNode(online), td[3].lastChild);
		// Release-Notes
		let notes = document.getElementById("updatesWin-notes");
		if (data.notes) {
			notes.innerHTML = data.notes;
			notes.classList.remove("aus");
		} else {
			notes.classList.add("aus");
		}
	},
	// Benachrichtigung einblenden, dass das Suchen nach Updates misslungen ist
	fensterFehler () {
		let td = document.querySelectorAll("#updatesWin-header td");
		while (td[0].childNodes.length > 1) {
			td[0].removeChild(td[0].lastChild);
		}
		td[0].firstChild.src = "img/fragezeichen.svg";
		td[0].appendChild(document.createTextNode("Laden der Release-Notes misslungen"));
	},
	// Aktion für die Buttons im Update-Fenster
	//   input = Element
	//     (Button im Update-Fenster)
	buttons (input) {
		input.addEventListener("click", function() {
			if (/suchen$/.test(this.id)) {
				updates.check(false);
			} else if (/github$/.test(this.id)) {
				const {shell} = require("electron");
				shell.openExternal("https://github.com/WortgeschichteDigital/ZettelsTraum/releases");
			}
		});
	},
};
