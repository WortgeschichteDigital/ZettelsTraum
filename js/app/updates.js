"use strict";

let updates = {
	releaseNotes: "",
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
		updates.releaseNotes = "";
		let entries = rss.querySelectorAll("entry");
		for (let i = 0, len = entries.length; i < len; i++) {
			let entry = entries[i],
				version = entry.querySelector("id").firstChild.nodeValue.match(/[0-9]+\.[0-9]+\.[0-9]+$/);
			if (!version) {
				continue;
			}
			if (i === 0) { // jüngste Version, die online ist
				optionen.data.updates.online = version[0];
			}
			if (version[0] === appInfo.version) {
				break;
			}
			updates.releaseNotes += entry.querySelector("content").firstChild.nodeValue;
		}
		// Check erfolgreich ausgeführt
		optionen.data.updates.checked = new Date().toISOString();
		optionen.speichern();
		// Update-Hinweis ein- bzw. ausblenden
		updates.hinweis();
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
};
