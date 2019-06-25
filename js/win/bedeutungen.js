"use strict";

let bedeutungen = {
	// Nummer des aktiven Gerüsts
	geruest: "",
	// Anzeige mit den gelieferten Daten aufbereiten
	aufbauen (daten) {
		// Wort eintragen
		document.querySelector("h1").textContent = daten.wort;
		// Content leeren
		let cont = document.getElementById("bd-win-cont");
		helfer.keineKinder(cont);
		// Sind überhaupt Bedeutungen vorhanden?
		let bd = daten.bd.gr[daten.bd.gn].bd;
		if (!bd.length) {
			let p = document.createElement("p");
			p.classList.add("bd-win-keine");
			p.textContent = "kein Bedeutungsgerüst";
			cont.appendChild(p);
			return;
		}
		// aktuelle Gerüstnummer zwischenspeichern
		bedeutungen.geruest = daten.bd.gn;
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
		ipcRenderer.send("bedeutungen-fenster-drucken", document.getElementById("bd-win-cont").outerHTML); // TODO senden, welches Gerüst gedruckt werden soll
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
