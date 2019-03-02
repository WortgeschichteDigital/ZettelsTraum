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
				name = datei.match(/([^/\\]+)\.[a-z]+$/)[1],
				li = document.createElement("li");
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
	// Kartei aus der Liste "Zuletzt verwendet" öffnen
	//   a = Element
	//     (Link zur Datei, die geöffent werden soll)
	karteiOeffnen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			kartei.oeffnenEinlesen(this.dataset.datei);
		});
	},
};
