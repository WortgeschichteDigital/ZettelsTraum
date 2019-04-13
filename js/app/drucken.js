"use strict";

let drucken = {
	// Listener für die Druck-Icons
	//   a = Element
	//     (Icon-Link, auf den geklickt wurde)
	listener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			drucken.init(this.id);
		});
	},
	// Drucken über Tastaturkürzel initialisieren, starten oder ggf. unterbinden
	tastatur () {
		const oben = overlay.oben();
		if (oben && oben !== "drucken" || !kartei.wort) {
			return;
		}
		if (oben === "drucken") {
			print();
		} else if (!document.getElementById("beleg").classList.contains("aus")) {
			drucken.init("beleg-");
		} else {
			drucken.init("liste-");
		}
	},
	// Listener für die Buttons im Druckfenster
	//   span = Element
	//     (Element, hinter dem sich eine der Funktionen im Druckfenster befindet)
	buttons (span) {
		span.addEventListener("click", function() {
			if (/drucken/.test(this.firstChild.src)) {
				print();
			} else if (/kopieren/.test(this.firstChild.src)) {
				// TODO Text kopieren (HTML und Plaintext)
			}
		});
	},
	// Druckanzeige initialisieren
	//   id = String
	//     (ID des Links, über den gedruckt wurde)
	init (id) {
		const fenster = document.getElementById("drucken");
		// Fenster öffnen oder in den Vordergrund holen
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Verteiler
		if (/^(liste|beleg)-/.test(id)) {
			drucken.getIds(id);
			if (!drucken.kartenIds.length) { // keine Karteikarten, die gedruckt werden können
				setTimeout(() => overlay.schliessen(fenster), 0); // ohne Timeout wird es nicht ausgeblendet
				dialog.oeffnen("alert", null);
				dialog.text("In der Belegliste sind keine Karteikarten, die gedruckt werden könnten.");
				return;
			}
			drucken.fillKarten();
		} else if (false) {
			drucken.initBedeutungen();
		}
	},
	// Datenfelder der Karten, die gedruckt werden sollen
	kartenFelder: [
		{
			val: "da",
			name: "Datum",
			width: 1,
		},
		{
			val: "au",
			name: "Autor",
			width: 1,
		},
		{
			val: "bs",
			name: "Beleg",
			width: 2,
		},
		{
			val: "bd",
			name: "Bedeutung",
			width: 1,
		},
		{
			val: "ts",
			name: "Textsorte",
			width: 1,
		},
		{
			val: "qu",
			name: "Quelle",
			width: 2,
		},
		{
			val: "no",
			name: "Notizen",
			width: 2,
		},
		{
			val: "an",
			name: "Anhänge",
			width: 2,
		},
	],
	// die IDs der Karten, die gedruckt werden sollen
	kartenIds: [],
	// IDs der Karten sammeln, die gedruckt werden sollen
	getIds (id) {
		drucken.kartenIds = [];
		let a = drucken.kartenIds;
		if (/^beleg-/.test(id)) {
			a.push(beleg.data);
		} else if (/^liste-/.test(id)) {
			document.querySelectorAll(".liste-kopf").forEach(function(i) {
				a.push(i.dataset.id);
			});
		}
	},
	// Druckfenster mit dem Karteninhalt füllen
	fillKarten () {
		// Content leeren
		const cont = document.getElementById("drucken-cont");
		helfer.keineKinder(cont);
		cont.scrollTop = 0;
		// Karten einhängen
		drucken.kartenIds.forEach(function(i) {
			let obj = i;
			if (!helfer.checkType("Object", obj)) {
				obj = data.ka[i];
			}
			// Überschrift
			let h3 = document.createElement("h3");
			h3.textContent = liste.detailAnzeigenH3(i);
			cont.appendChild(h3);
			// Tabelle
			const f = drucken.kartenFelder;
			let table = document.createElement("table"),
				trTh, trTd;
			cont.appendChild(table);
			let nr = 2;
			for (let x = 0, len = f.length; x < len; x++) {
				if (nr >= 2) {
					nr = 0;
					trTh = document.createElement("tr");
					trTd = document.createElement("tr");
					table.appendChild(trTh);
					table.appendChild(trTd);
				}
				nr += f[x].width;
				// Kopf
				let th = document.createElement("th");
				trTh.appendChild(th);
				th.textContent = f[x].name;
				// Wert ermitteln
				let wert = "";
				if (Array.isArray(obj[f[x].val])) {
					wert = obj[f[x].val].join("\n");
				} else {
					wert = obj[f[x].val];
				}
				if (!wert) {
					wert = " ";
				}
				// Inhalt
				let td = document.createElement("td");
				trTd.appendChild(td);
				if (helfer.checkType("String", wert)) {
					const wert_p = wert.replace(/\n\s*\n/g, "\n").split("\n");
					for (let y = 0, len = wert_p.length; y < len; y++) {
						let p = document.createElement("p");
						p.innerHTML = wert_p[y];
						td.appendChild(p);
					}
				}
				// ggf. colspan setzen
				if (f[x].width === 2) {
					th.setAttribute("colspan", "2");
					td.setAttribute("colspan", "2");
				}
			}
		});
	},
	// Druckfenster mit dem Bedeutungsbaum füllen
	initBedeutungen () {
		// TODO
	},
};
