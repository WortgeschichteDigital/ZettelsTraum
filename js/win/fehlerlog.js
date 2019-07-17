"use strict";

let fehlerlog = {
	// Fehler ins Fenster eintragen
	//   fehler = Array
	//     (Liste der Fehler, die in dieser Session aufgetreten sind)
	fuellen (fehler) {
		let cont = document.querySelector("main");
		// keine Fehler
		if (!fehler.length) {
			let p = document.createElement("p");
			p.classList.add("keine");
			p.textContent = "keine Fehler";
			cont.appendChild(p);
			return;
		}
		// Fehler
		for (let i of fehler) {
			let div = document.createElement("div");
			cont.appendChild(div);
			// Zeit
			let h2 = document.createElement("h2");
			div.appendChild(h2);
			h2.textContent = fehlerlog.datumFormat(i.time);
			// Kartei
			let p = document.createElement("p");
			div.appendChild(p);
			if (!i.word) {
				p.textContent = "[kein Wort]";
			} else {
				p.textContent = `${i.word} (${i.fileWgd})`;
			}
			// Fehlermeldung
			p = document.createElement("p");
			div.appendChild(p);
			p.classList.add("obacht");
			p.textContent = i.message;
			// JS-Datei
			p = document.createElement("p");
			div.appendChild(p);
			p.classList.add("js");
			p.textContent = `${i.fileJs.replace(/.+\//, "")} (Z. ${i.line})`;
		}
	},
	// das übergebene Datum formatiert zurückgeben
	//   datum = String
	//     (im ISO 8601-Format)
	datumFormat (datum) {
		let wochentage = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
		monate = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
		let d = new Date(datum);
		return `${wochentage[d.getDay()]}, ${d.getDate()}. ${monate[d.getMonth()]} ${d.getFullYear()}, ${d.getHours()}:${d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes()}:${d.getSeconds() < 10 ? `0${d.getSeconds()}` : d.getSeconds()} Uhr`;
	},
	// Fehler aus dem Fenster kopieren
	kopieren () {
		// TODO
	},
};
