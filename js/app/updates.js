"use strict";

let updates = {
	// wertet den RSS-Feed auf GitHub aus
	async check () {
		let response = await fetch("https://github.com/WortgeschichteDigital/ZettelsTraum/releases.atom");
		// RSS-Feed konnte nicht abgerufen werden
		if (!response.ok) {
			return;
		}
		// RSS-Feed auswerten
		let text = await response.text(),
			parser = new DOMParser(),
			rss = parser.parseFromString(text, "text/xml");
		// RSS-Feed war nicht wohlgeformt
		if (rss.querySelector("parsererror")) {
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
	// Hinweis, dass Updates verfügbar sind, ein- bzw. ausblenden
	hinweis () {
		let icon = document.getElementById("updates");
		// die neuste Version ist bereits installiert
		if (optionen.data.updates.online === appInfo.version) {
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
		// Release-Notes eintragen
		const {ipcRenderer} = require("electron");
		let data = await ipcRenderer.invoke("updates-get-data"),
			notes = "";
		if (!data.gesucht) {
			notes = `<p class="keine">noch nicht nach Updates gesucht</p>`;
		} else if (!data.notes) {
			notes = `<p class="keine">keine Updates gefunden</p>`;
		} else {
			notes = data.notes;
		}
		document.getElementById("updatesWin-notes").innerHTML = notes;
	},
	// Suche nach Updates manuell anstoßen
	//   a = Element
	//     (Link, der die Suche nach Updates triggern soll)
	suchen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			this.classList.add("rotieren-bitte");
			updates.check(false);
		});
	},
};
