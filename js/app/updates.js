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
		// RSS-Feed laden
		let controller = new AbortController();
		setTimeout(() => controller.abort(), parseInt(optionen.data.einstellungen.timeout, 10) * 1000);
		let response;
		try {
			response = await fetch("https://github.com/WortgeschichteDigital/ZettelsTraum/releases.atom", {
				signal: controller.signal,
			});
		} catch (err) {
			if (err.name === "AbortError") {
				updates.fehler(auto, "Timeout-Fehler");
			} else {
				updates.fehler(auto, `${err.name}: ${err.message}`);
			}
			throw err;
		}
		// RSS-Feed konnte nicht abgerufen werden
		if (!response.ok) {
			updates.fehler(auto, `HTTP-Status-Code ${response.status}`);
			return;
		}
		// RSS-Feed auswerten
		let text = await response.text(),
			parser = new DOMParser(),
			rss = parser.parseFromString(text, "text/xml");
		// RSS-Feed war nicht wohlgeformt
		if (rss.querySelector("parsererror")) {
			updates.fehler(auto, "RSS-Feed nicht wohlgeformt");
			return;
		}
		// RSS-Feed auswerten
		let releaseNotes = "",
			entries = rss.querySelectorAll("entry");
		for (let i = 0, len = entries.length; i < len; i++) {
			let entry = entries[i],
				version = entry.querySelector("id").firstChild.nodeValue.match(/[0-9]+\.[0-9]+\.[0-9]+$/);
			if (!version) {
				continue;
			}
			if (i === 0) { // jüngste Version, die online ist
				optionen.data.updates.online = version[0];
			}
			if (version[0] === appInfo.version) { // diese Version ist installiert
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
	// Fehlermeldung ausgeben
	//   auto = Boolean
	//     (Suche wurde automatisch angestoßen)
	//   err = String
	//     (Fehlermeldung)
	fehler (auto, err) {
		if (auto) {
			return;
		}
		dialog.oeffnen({
			typ: "alert",
			text: `Beim Laden der Release-Notes ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err}</p>`,
		});
	},
	// Hinweis, dass Updates verfügbar sind, ein- bzw. ausblenden
	hinweis () {
		let icon = document.getElementById("updates");
		// die neuste Version ist bereits installiert
		if (!optionen.data.updates.online ||
				optionen.data.updates.online === appInfo.version) {
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
		while (td[0].childNodes.length > 1) {
			td[0].removeChild(td[0].lastChild);
		}
		if (!optionen.data.updates.online) {
			td[0].firstChild.src = "img/fragezeichen.svg";
			td[0].appendChild(document.createTextNode("noch nie nach Updates gesucht"));
		} else if (optionen.data.updates.online !== appInfo.version) {
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
			ueberprueft = helfer.datumFormat(optionen.data.updates.checked, true);
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
