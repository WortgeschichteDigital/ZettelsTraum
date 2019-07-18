"use strict";

let fehlerlog = {
	// Fehler ins Fenster eintragen
	//   fehler = Array
	//     (Liste der Fehler, die in dieser Session aufgetreten sind)
	fuellen (fehler) {
		let cont = document.querySelector("main"),
			copy = document.getElementById("kopieren");
		// keine Fehler
		if (!fehler.length) {
			let div = document.createElement("div");
			cont.appendChild(div);
			let p = document.createElement("p");
			div.appendChild(p);
			p.classList.add("keine");
			p.textContent = "keine Fehler";
			copy.classList.add("aus");
			return;
		}
		// Fehler
		copy.classList.remove("aus");
		for (let n = fehler.length - 1; n >= 0; n--) {
			let i = fehler[n];
			let h2, p,
				div = document.createElement("div");
			cont.appendChild(div);
			// Zeit
			h2 = document.createElement("h2");
			div.appendChild(h2);
			h2.textContent = fehlerlog.datumFormat(i.time);
			// Kartei
			if (i.fileJs !== "main.js") {
				p = document.createElement("p");
				div.appendChild(p);
				if (!i.word) {
					p.textContent = "[leeres Fenster]";
				} else {
					p.textContent = `${i.word} (${i.fileWgd})`;
				}
			}
			// Fehlermeldung
			p = document.createElement("p");
			div.appendChild(p);
			p.classList.add("obacht");
			p.innerHTML = i.message.replace(/\n/g, "<br>");
			// JS-Datei
			p = document.createElement("p");
			div.appendChild(p);
			p.classList.add("js");
			let textJs = i.fileJs.replace(/.+\/js\//, "");
			if (i.line) {
				textJs += `:${i.line}`;
				if (i.column) {
					textJs += `:${i.column}`;
				}
			}
			p.textContent = textJs;
		}
		// Versionen
		let div = document.createElement("div");
		cont.appendChild(div);
		let p = document.createElement("p");
		div.appendChild(p);
		p.classList.add("version");
		const {app} = require("electron").remote,
		os = require("os");
		let daten = [{
			type: "App",
			data: app.getVersion(),
		},
		{
			type: "Electron",
			data: process.versions.electron,
		},
		{
			type: "System",
			data: `${os.type()} (${os.arch()})`,
		}];
		for (let i = 0, len = daten.length; i < len; i++) {
			if (i > 0) {
				p.appendChild(document.createElement("br"));
			}
			let span = document.createElement("span");
			span.textContent = `${daten[i].type}: `;
			p.appendChild(span);
			p.appendChild(document.createTextNode(daten[i].data));
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
	//   a = Element
	//     (der Kopier-Link)
	kopieren (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// Text holen und aufbereiten
			let text = document.querySelector("main").innerHTML;
			text = text.replace(/<\/(h2|p)>/g, "\n");
			text = text.replace(/<div>/g, "\n----------------------------------------\n\n");
			text = text.replace(/<br>/g, "\n");
			text = text.replace(/&nbsp;/g, " ");
			text = text.replace(/<.+?>/g, "");
			text = text.replace(/^[\n-]+/, "");
			// Text kopieren
			const {clipboard} = require("electron");
			clipboard.writeText(text);
		});
	},
};
