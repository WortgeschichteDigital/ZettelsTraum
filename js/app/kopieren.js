"use strict";

let kopieren = {
	// speichert die IDs der Karten, die zum Kopieren ausgewählt wurden
	belege: [],
	// Kopier-Prozess initialisieren
	init () {
		// Ist die Funktion schon offen?
		if (!document.getElementById("kopieren-aussen").classList.contains("aus")) {
			kopieren.liste();
			return;
		}
		// UI einblenden
		kopieren.uiInit();
	},
	// User-Interface einblenden
	uiInit () {
		// UI aufbauen
		document.getElementById("kopieren-aussen").classList.remove("aus");
		document.getElementById("kopieren").textContent = kopieren.belege.length;
		// Icon im Kopf der Karteikarte einblenden
		document.getElementById("beleg-link-kopieren").classList.remove("aus");
		// Icons im Listenkopf einblenden
		document.querySelectorAll(".liste-kopf .icon-kopieren").forEach(a => a.classList.remove("aus"));
	},
	// User-Interface ausblenden
	uiOff () {
		if (kopieren.belege.length) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					off();
				}
			});
			dialog.text("Soll die Kopierfunktion wirklich beendet werden?\nDie Liste der zu kopierenden Belege wird dabei geleert.");
			return;
		}
		off();
		// Kopierfunktion wirklich schließen
		function off () {
			// Belegliste leeren (wichtig, damit andere Funktionen wissen,
			// dass die Funktion nicht mehr aktiv ist)
			kopieren.belege = [];
			// UI ausblenden
			document.getElementById("kopieren-aussen").classList.add("aus");
			// Icon im Kopf der Karteikarte ausblenden
			document.getElementById("beleg-link-kopieren").classList.add("aus");
			// Icons im Listenkopf ausblenden
			document.querySelectorAll(".liste-kopf .icon-kopieren").forEach(a => a.classList.add("aus"));
			// ggf. Listenfenster schließen
			overlay.schliessen(document.getElementById("kopieren-liste"));
		}
	},
	// Klickfunktion für die Anker in der Belegliste
	//   a = Element
	//     (das Kopiericon im Listenkopf)
	addListe (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			evt.stopPropagation();
			kopieren.add(this.parentNode.dataset.id);
		});
	},
	// Beleg aus der offenen Karte zur Liste hinzufügen
	// (besser wenn in Funktion, weil das Ganze von mehreren Orten aufgerufen wird)
	addKarte () {
		kopieren.add(beleg.id_karte.toString());
	},
	// Beleg zur Kopierliste hinzufügen
	//   id = String
	//     (ID der Karteikarte/des Belegs)
	add (id) {
		if (kopieren.belege.includes(id)) {
			dialog.oeffnen("alert");
			dialog.text(`<i>${liste.detailAnzeigenH3(id)}</i> ist schon in der Liste der zu kopierenden Belege.`);
			return;
		}
		kopieren.belege.push(id);
		document.getElementById("kopieren").textContent = kopieren.belege.length;
	},
	// Fenster mit Belegliste öffnen
	liste () {
		overlay.oeffnen(document.getElementById("kopieren-liste"));
		kopieren.listeAufbauen();
	},
	// Belegliste aufbauen
	listeAufbauen () {
		// Liste leeren
		let cont = document.getElementById("kopieren-liste-cont");
		helfer.keineKinder(cont);
		// keine Belege zum Kopieren vorgemerkt
		if (!kopieren.belege.length) {
			let p = document.createElement("p");
			cont.appendChild(p);
			p.classList.add("keine");
			p.textContent = "keine Belege ausgewählt";
			return;
		}
		// Liste mit Belegen füllen
		for (let id of kopieren.belege) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Entfernen-Icon
			let a = document.createElement("a");
			p.appendChild(a);
			a.dataset.id = id;
			a.href = "#";
			a.classList.add("icon-link", "icon-entfernen");
			kopieren.listeEntfernen(a);
			// Text
			a = document.createElement("a");
			p.appendChild(a);
			a.href = "#";
			a.dataset.id = id;
			a.textContent = liste.detailAnzeigenH3(id);
			anhaenge.belegOeffnen(a);
		}
	},
	// Beleg aus der Liste entfernen
	//   a = Element
	//     (das Entfernen-Icon vor dem Beleg in der Liste)
	listeEntfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			kopieren.belege.splice(kopieren.belege.indexOf(this.dataset.id), 1);
			document.getElementById("kopieren").textContent = kopieren.belege.length;
			kopieren.listeAufbauen();
		});
	},
	// alle Belege aus der Liste entfernen
	listeLeeren () {
		// keine Belege in der Liste
		if (!kopieren.belege.length) {
			return;
		}
		// Sicherheitsfrage
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				kopieren.belege = [];
				document.getElementById("kopieren").textContent = kopieren.belege.length;
				kopieren.listeAufbauen();
			}
		});
		dialog.text("Soll die Liste der zu kopierenden Belege wirklich geleert werden?");
	},
	// Overlay-Fenster zum Einfügen der Belege öffnen
	einfuegen () {
		overlay.oeffnen(document.getElementById("kopieren-einfuegen"));
		kopieren.einfuegenBasisdaten();
	},
	// Basisdaten der Karteien, aus denen Belege eingefügt werden können, anfordern
	einfuegenBasisdaten () {
		const {ipcRenderer, remote} = require("electron");
		ipcRenderer.send("kopieren-daten", remote.getCurrentWindow().id);
	},
	// Zwischenspeicher für die Basisdaten der einfügbaren Belege
	basisdaten: {},
	// Daten eintragen, die angeboten werden
	//   daten = Object
	//     (Objekt mit Informationen zu den Daten, die kopiert werden können)
	einfuegenBasisdatenEintragen (daten) {
		kopieren.basisdaten = daten; // Struktur der Daten in kopieren.basidatenSenden()
		// Belegliste aufbauen
		let cont = document.getElementById("kopieren-einfuegen-daten");
		helfer.keineKinder(cont);
		let ausgewaehlt = false;
		for (let id in daten) {
			if (!daten.hasOwnProperty(id)) {
				continue;
			}
			// Absatz
			let p = document.createElement("p");
			cont.appendChild(p);
			kopieren.einfuegenAbsatzWaehlen(p);
			// Input
			let input = document.createElement("input");
			p.appendChild(input);
			input.id = `kopieren-kartei-${id}`;
			input.type = "radio";
			input.value = id;
			if (!ausgewaehlt) {
				input.checked = true;
				ausgewaehlt = true;
			}
			// Text
			let plural = "Beleg";
			if (daten[id].belege > 1) {
				plural = "Belege";
			}
			p.appendChild(document.createTextNode(`${daten[id].wort} (${daten[id].belege} ${plural})`));
		}
	},
	// wählt die Kartei aus, für die der angeklickte Absatz steht
	//   ele = Element
	//     (der Absatz)
	einfuegenAbsatzWaehlen (ele) {
		ele.addEventListener("click", function() {
			let ps = document.querySelectorAll("#kopieren-einfuegen-daten p");
			for (let p of ps) {
				let input = p.querySelector("input");
				if (p === this) {
					input.checked = true;
				} else {
					input.checked = false;
				}
			}
		});
	},
	// Einfügen ausführen
	einfuegenAusfuehren () {
		// TODO
	},
	// Basisdaten über die Belegmenge und das Fenster an den Main-Prozess senden
	basisdatenSenden () {
		const {ipcRenderer, remote} = require("electron");
		let daten = {
			id: remote.getCurrentWindow().id,
			wort: kartei.wort,
			belege: kopieren.belege.length,
			gerueste: {
				aktuell: data.bd.gn,
				liste: {},
			},
		};
		for (let id in data.bd.gr) {
			if (!data.bd.gr.hasOwnProperty(id)) {
				continue;
			}
			daten.gerueste.liste[id] = data.bd.gr[id].na;
		}
		ipcRenderer.send("kopieren-basisdaten-lieferung", daten);
	},
	// alle Belegdaten an den Main-Prozess senden
	datenSenden () {
		// TODO
	},
};
