"use strict";

let start = {
	// Liste der zuletzt verwendeten Dateien ein- bzw. ausblenden aufbauen
	zuletzt () {
		let cont = document.getElementById("start-zuletzt");
		// Dateiliste vorhanden?
		if (!optionen.data.zuletzt.length) {
			cont.classList.add("aus");
			return;
		}
		cont.classList.remove("aus");
		// Dateiliste leeren
		let liste = document.getElementById("start-liste");
		helfer.keineKinder(liste);
		// Dateiliste aufbauen
		for (let i = 0, len = optionen.data.zuletzt.length; i < len; i++) {
			let datei = optionen.data.zuletzt[i],
				name = datei.match(/([^\/\\]+)\.[a-z]+$/)[1],
				li = document.createElement("li");
			li.classList.add("start-datei"); // dient zur Identifizierung für Rechtsklicks
			li.dataset.datei = datei;
			// Name und Link
			let span = document.createElement("span");
			span.href = "#";
			span.textContent = name;
			li.appendChild(span);
			// Dateiname
			span = document.createElement("span");
			span.textContent = datei;
			li.appendChild(span);
			// Listenpunkt einhängen
			start.karteiOeffnen(li);
			liste.appendChild(li);
		}
	},
	// entferne eine Datei aus der Liste zuletzt verwendeter Dateien
	//   datei = String
	//     (Datei, die aus optionen.data.zuletzt entfernt werden soll)
	dateiEntfernen (datei) {
		const idx = optionen.data.zuletzt.indexOf(datei);
		optionen.data.zuletzt.splice(idx, 1);
		optionen.speichern();
		start.zuletzt();
	},
	// Kartei aus der Liste "Zuletzt verwendet" öffnen
	//   a = Element
	//     (Link zur Datei, die geöffent werden soll)
	karteiOeffnen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			kartei.oeffnenEinlesen(this.dataset.datei);
		});
	},
	// das Programmstart-Overlay ausblenden
	// (dadurch bekomme wird die Unruhe verborgen, die das Einblenden
	// der Quick-Access-Bar erzeugt)
	overlayAus () {
		setTimeout(function() {
			let ps = document.getElementById("programmstart");
			ps.classList.add("gestartet");
			// dieser Timeout korrespondiert mit der in der start.css festgelegten
			// Transition-Länge
			setTimeout(() => ps.classList.add("aus"), 500);
		}, 500);
	},
};
