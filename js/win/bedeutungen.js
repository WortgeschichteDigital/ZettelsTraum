"use strict";

let bedeutungen = {
	// enthält die übergebenen Daten
	data: {},
	// ID des aktuellen Gerüsts
	geruest: "",
	// Anzeige mit den gelieferten Daten aufbereiten
	aufbauen () {
		// Wort eintragen
		document.querySelector("h1").textContent = bedeutungen.data.wort;
		// ggf. Gerüstnummer zwischenspeichern
		if (!bedeutungen.geruest) {
			bedeutungen.geruest = bedeutungen.data.bd.gn;
		}
		// Content leeren
		let cont = document.getElementById("bd-win-cont");
		helfer.keineKinder(cont);
		// Details zum Bedeutungsgerüst in die Überschrift eintragen
		let detail = "";
		if (Object.keys(bedeutungen.data.bd.gr).length > 1) {
			detail = ` ${bedeutungen.geruest}`;
		}
		if (bedeutungen.data.bd.gr[bedeutungen.geruest].na) {
			detail += ` (${bedeutungen.data.bd.gr[bedeutungen.geruest].na})`;
		}
		document.getElementById("bd-win-geruest-detail").textContent = detail;
		// Gerüst-Nummer in Dropdown-Feld
		document.getElementById("bd-win-gerueste").value = `Gerüst ${bedeutungen.geruest}`;
		// Sind überhaupt Bedeutungen vorhanden?
		let bd = bedeutungen.data.bd.gr[bedeutungen.geruest].bd;
		if (!bd.length) {
			let p = document.createElement("p");
			p.classList.add("bd-win-keine");
			p.textContent = "keine Bedeutungen";
			cont.appendChild(p);
			return;
		}
		// Bedeutungen aufbauen
		for (let i = 0, len = bd.length; i < len; i++) {
			// Schachteln erzeugen
			let frag = document.createDocumentFragment(),
				schachtel = frag;
			for (let j = 0, len = bd[i].bd.length; j < len; j++) {
				let div = document.createElement("div");
				schachtel.appendChild(div);
				div.classList.add("bd-win-baum");
				schachtel = div;
			}
			// Absatz mit Zählung und Bedeutung
			let p = document.createElement("p");
			schachtel.appendChild(p);
			p.dataset.id = bd[i].id;
			bedeutungen.eintragen(p);
			// Zählung
			let b = document.createElement("b");
			p.appendChild(b);
			b.textContent = bd[i].za;
			// Bedeutung
			let span = document.createElement("span");
			p.appendChild(span);
			span.innerHTML = bd[i].bd[bd[i].bd.length - 1];
			// Fragment einhängen
			cont.appendChild(frag);
		}
	},
	// Bedeutungsbaum drucken
	drucken () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("bedeutungen-fenster-drucken", bedeutungen.geruest);
	},
	// Bedeutung im Formular des Hauptfensters eintragen
	//   p = Element
	//     (die Bedeutung, auf die geklickt wurde)
	eintragen (p) {
		p.addEventListener("click", function() {
			const id = parseInt(this.dataset.id, 10),
				{ipcRenderer} = require("electron");
			ipcRenderer.send("bedeutungen-fenster-eintragen", {
				gr: bedeutungen.geruest,
				id: id,
			});
		});
	},
};
