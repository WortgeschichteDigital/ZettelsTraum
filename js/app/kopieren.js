"use strict";

let kopieren = {
	// speichert, ob der Kopiermodus an ist
	an: false,
	// speichert die IDs der Karten, die zum Kopieren ausgewählt wurden
	belege: [],
	// Kopier-Prozess initialisieren
	init () {
		// Ist die Funktion schon an?
		if (kopieren.an) {
			kopieren.liste();
			return;
		}
		// Funktion anstellen
		kopieren.uiOn();
	},
	// User-Interface einblenden
	uiOn () {
		kopieren.an = true;
		// UI aufbauen
		document.getElementById("kopieren-aussen").classList.remove("aus");
		kopieren.uiText();
		// Icon im Kopf der Karteikarte einblenden
		document.getElementById("beleg-link-kopieren").classList.remove("aus");
		// Icon im Kopf der Belegliste einblenden
		let listeLink = document.getElementById("liste-link-kopieren");
		listeLink.classList.remove("aus");
		listeLink.nextSibling.classList.remove("kopieren-aus");
		// Icons im Listenkopf einblenden
		document.querySelectorAll(".liste-kopf .icon-kopieren").forEach(a => a.classList.remove("aus"));
	},
	// User-Interface ausblenden
	//   fragen = Booleadn
	//     (vor dem Beenden der Funktion sollte nachgefragt werden)
	uiOff (fragen = true) {
		if (fragen && kopieren.belege.length) {
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
			kopieren.an = false;
			// Belegliste leeren (wichtig, damit andere Funktionen wissen,
			// dass die Funktion nicht mehr aktiv ist)
			kopieren.belege = [];
			// UI ausblenden
			document.getElementById("kopieren-aussen").classList.add("aus");
			// Icon im Kopf der Karteikarte ausblenden
			document.getElementById("beleg-link-kopieren").classList.add("aus");
			// Icon im Kopf der Belegliste ausblenden
			let listeLink = document.getElementById("liste-link-kopieren");
			listeLink.classList.add("aus");
			listeLink.nextSibling.classList.add("kopieren-aus");
			// Icons im Listenkopf ausblenden
			document.querySelectorAll(".liste-kopf .icon-kopieren").forEach(a => a.classList.add("aus"));
			// ggf. Listenfenster schließen
			overlay.schliessen(document.getElementById("kopieren-liste"));
		}
	},
	// trägt den Text in UI-Feld ein
	uiText () {
		let text = kopieren.belege.length.toString();
		if (text === "0") {
			text = "";
		}
		document.getElementById("kopieren").textContent = text;
	},
	// Klickfunktion für die Anker in der Belegliste
	//   a = Element
	//     (das Kopier-Icon im Belegkopf)
	addListe (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			evt.stopPropagation();
			kopieren.add(this.parentNode.dataset.id);
		});
	},
	// Klickfunktion für den Anker im Kopf der Belegliste
	//   a = Element
	//     (das Kopier-Icon im Listenkopf)
	addListeAlle (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			document.querySelectorAll(".liste-kopf").forEach(function(i) {
				const id = i.dataset.id;
				if (kopieren.belege.includes(id)) {
					return;
				}
				kopieren.add(id);
			});
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
		kopieren.uiText();
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
			kopieren.uiText();
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
				kopieren.uiText();
				kopieren.listeAufbauen();
			}
		});
		dialog.text("Soll die Liste der zu kopierenden Belege wirklich geleert werden?");
	},
	// Overlay-Fenster zum Einfügen der Belege öffnen
	einfuegen () {
		overlay.oeffnen(document.getElementById("kopieren-einfuegen"));
		// Datenfelder abhaken
		document.querySelectorAll("#kopieren-einfuegen-formular input").forEach(function(i) {
			const feld = i.id.replace(/.+-/, "");
			i.checked = optionen.data.kopieren[feld];
		});
		// Basisdaten anfragen und eintragen
		kopieren.einfuegenBasisdaten();
	},
	// Listener für das Abhaken der Datenfelder
	//   input = Element
	//     (eine Checkbox in der Datenfelder-Liste)
	einfuegenDatenfelder (input) {
		input.addEventListener("input", function() {
			const feld = this.id.replace(/.+-/, "");
			if (/^(bs|da|qu)$/.test(feld)) {
				this.checked = true;
				dialog.oeffnen("alert");
				dialog.text("Die Datenfelder Datum, Beleg und Quelle müssen zwingend importiert werden.");
				return;
			}
			optionen.data.kopieren[feld] = !optionen.data.kopieren[feld];
			optionen.speichern();
		});
	},
	// frischt den Text des Datenfelds Bedeutung auf
	// (sind mehrere Bedeutungsgerüste vorhanden, muss dies angezeigt werden)
	//   gn = String
	//     (die Gerüstnummer; kann leer sein)
	einfuegenBedeutung (gn) {
		let feld = document.getElementById("kopieren-feld-bd").nextSibling;
		if (gn) {
			feld.textContent = `Bedeutung #${gn}`;
		} else {
			feld.textContent = "Bedeutung";
		}
	},
	// Basisdaten der Karteien, aus denen Belege eingefügt werden können, anfordern
	einfuegenBasisdaten () {
		const {ipcRenderer, remote} = require("electron");
		ipcRenderer.send("kopieren-basisdaten", remote.getCurrentWindow().id);
	},
	// Zwischenspeicher für die Basisdaten der einfügbaren Belege
	//   "ID" (ID des Fensters, von dem die Daten stammen)
	//     belege (Number; Anzahl der Belege, die kopiert werden können)
	//     geruest (String; die Nummer des Bedeutungsgerüsts, dessen Bedeutungen kopiert werden)
	//     wort (String; das Kartei-Wort)
	basisdaten: {},
	// Zwischenspeicher für die in der Zwischenablage gefundenen Daten
	zwischenablage: [],
	// Daten eintragen, die angeboten werden
	//   daten = Object
	//     (Objekt mit Informationen zu den Daten, die kopiert werden können)
	einfuegenBasisdatenEintragen (daten) {
		kopieren.basisdaten = daten; // Struktur der Daten in kopieren.basidatenSenden()
		let cont = document.getElementById("kopieren-einfuegen-daten");
		helfer.keineKinder(cont);
		// Zwischenablage auf Daten überprüfen
		kopieren.einfuegenParseClipboard();
		// keine Belegquellen
		if (!Object.keys(daten).length && !kopieren.zwischenablage.length) {
			let p = document.createElement("p");
			cont.appendChild(p);
			p.classList.add("keine");
			p.textContent = "keine Belegquellen gefunden";
			return;
		}
		// ggf. die Zwischenablage als ersten Datensatz einfügen
		if (kopieren.zwischenablage.length) {
			daten["0"] = {
				belege: 0,
				geruest: "",
				wort: "Zwischenablage",
			};
		}
		// Belegquellen aufbauen
		let ausgewaehlt = false;
		for (let id in daten) {
			if (!daten.hasOwnProperty(id)) {
				continue;
			}
			// Absatz
			let p = document.createElement("p");
			cont.appendChild(p);
			kopieren.einfuegenDatensatzWaehlen(p);
			// Input
			let input = document.createElement("input");
			p.appendChild(input);
			input.id = `kopieren-kartei-${id}`;
			input.type = "radio";
			input.value = id;
			if (!ausgewaehlt) {
				input.checked = true;
				ausgewaehlt = true;
				kopieren.einfuegenBedeutung(daten[id].geruest);
			}
			// Wort
			p.appendChild(document.createTextNode(daten[id].wort));
			// Belege
			if (!daten[id].belege) { // für die Zwischenablage wird keine Belegzahl angegeben
				continue;
			}
			let plural = "Beleg";
			if (daten[id].belege > 1) {
				plural = "Belege";
			}
			p.appendChild(document.createTextNode(` (${daten[id].belege} ${plural})`));
		}
	},
	// die Zwischenablage überprüfen, ob in ihr ein Beleg steckt
	einfuegenParseClipboard () {
		kopieren.zwischenablage = [];
		// Clipboard auslesen
		const {clipboard} = require("electron"),
			cp = clipboard.readText();
		// versuchen den Text im Clipboard zu parsen
		let daten = {};
		try {
			daten = JSON.parse(cp);
		} catch (err) {
			return;
		}
		// der Text konnte offenbar geparst werden => WGD-Beleg-Daten?
		if (daten.typ !== "wgd-kopie") {
			return;
		}
		// Stammen die Daten aus diesem Fenster?
		const {remote} = require("electron"),
			winId = remote.getCurrentWindow().id;
		if (daten.winId === winId && daten.wort === kartei.wort) {
			return;
		}
		// Die Daten sind offenbar okay!
		kopieren.zwischenablage.push(daten);
	},
	// wählt den Datensatz aus, für den der angeklickte Absatz steht
	//   ele = Element
	//     (der Absatz, hinter dem sich der Datensatz verbirgt)
	einfuegenDatensatzWaehlen (ele) {
		ele.addEventListener("click", function() {
			let ps = document.querySelectorAll("#kopieren-einfuegen-daten p");
			for (let p of ps) {
				let input = p.querySelector("input");
				if (p === this) {
					input.checked = true;
					const gn = kopieren.basisdaten[this.firstChild.value].geruest;
					kopieren.einfuegenBedeutung(gn);
				} else {
					input.checked = false;
				}
			}
		});
	},
	// Sicherheitschecks, ob vor dem Einfügen noch Dinge gespeichert werden müssen
	einfuegenAusfuehrenPre () {
		// TODO Sicherheitschecks
		kopieren.einfuegenAusfuehren();
	},
	// Einfügen aus der gewünschten Datenquelle wird angestoßen
	einfuegenAusfuehren () {
		// ermitteln, aus welcher Quelle eingefügt werden soll
		let quellen = document.querySelectorAll("#kopieren-einfuegen-daten input"),
			quelle = "";
		for (let i of quellen) {
			if (i.checked) {
				quelle = i.value;
				break;
			}
		}
		// Quelle = Zwischenablage?
		if (quelle === "0") {
			kopieren.einfuegenEinlesen(kopieren.zwischenablage);
			return;
		}
		// Quelle = Fenster
		const {ipcRenderer, remote} = require("electron");
		ipcRenderer.send("kopieren-daten", parseInt(quelle, 10), remote.getCurrentWindow().id);
	},
	// die übergebenen Daten werden eingelesen
	//   daten = Array
	//     (in jedem Slot ist eine Zettelkopie, wie sie in kopieren.datenBeleg() erstellt wird)
	einfuegenEinlesen (daten) {
		// Datenfelder ermitteln, die importiert werden sollen
		let ds = [];
		document.querySelectorAll("#kopieren-einfuegen-formular input").forEach(function(i) {
			if (!i.checked) {
				return;
			}
			ds.push(i.id.replace(/.+-/, ""));
		});
		// neue Karten anlegen
		for (let i = 0, len = daten.length; i < len; i++) {
			// eine neue Karte erzeugen
			const id_karte = beleg.idErmitteln();
			data.ka[id_karte] = beleg.karteErstellen();
			// die Karte mit den gewünschten Datensätzen füllen
			for (let j = 0, len = ds.length; j < len; j++) {
				if (ds[j] === "bd") { // Bedeutungen
					for (let k of daten[i].bd) {
						let bd = beleg.bedeutungSuchen(k);
						if (!bd.id) {
							bd = beleg.bedeutungErgaenzen(k);
						}
						data.ka[id_karte].bd.push({
							gr: data.bd.gn,
							id: bd.id,
						});
					}
				} else if (Array.isArray(daten[i][ds[j]])) { // eindimensionale Arrays
					data.ka[id_karte][ds[j]] = [...daten[i][ds[j]]];
				} else { // Primitiven
					data.ka[id_karte][ds[j]] = daten[i][ds[j]];
				}
			}
			// Speicherdatum ergänzen
			data.ka[id_karte].dm = new Date().toISOString();
		}
		// Änderungsmarkierung
		kartei.karteiGeaendert(true);
		// BedeutungsgerüstFenster auffrischen
		bedeutungenWin.daten();
		// Liste und Filter neu aufbauen, Liste anzeigen
		liste.status(true);
		liste.wechseln();
		// Einfüge-Fenster ggf. schließen
		if (optionen.data.einstellungen["einfuegen-schliessen"]) {
			overlay.schliessen(document.getElementById("kopieren-einfuegen"));
		}
	},
	// Basisdaten über die Belegmenge und das Fenster an den Main-Prozess senden
	basisdatenSenden () {
		const {ipcRenderer, remote} = require("electron");
		let daten = {
			id: remote.getCurrentWindow().id,
			wort: kartei.wort,
			belege: kopieren.belege.length,
			geruest: "",
		};
		if (Object.keys(data.bd.gr).length > 1) {
			daten.geruest = data.bd.gn;
		}
		ipcRenderer.send("kopieren-basisdaten-lieferung", daten);
	},
	// alle Belegdaten an den Main-Prozess senden
	datenSenden () {
		let daten = [];
		for (let id of kopieren.belege) {
			daten.push(kopieren.datenBeleg(data.ka[id]));
		}
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("kopieren-daten-lieferung", daten);
	},
	// fertigt eine Kopie des übergebenen Belegs an
	//   quelle = Object
	//     (Datenquelle des Belegs)
	datenBeleg (quelle) {
		let kopie = {};
		for (let wert in quelle) {
			if (!quelle.hasOwnProperty(wert)) {
				continue;
			}
			// Zeitpunkt Erstellung/Speicherung nicht kopieren
			if (wert === "dc" || wert === "dm") {
				continue;
			}
			// Sonderbehandlung Bedeutung
			if (wert === "bd") {
				let bd = [];
				for (let i = 0, len = quelle.bd.length; i < len; i++) {
					if (quelle.bd[i].gr !== data.bd.gn) {
						continue;
					}
					bd.push(bedeutungen.bedeutungenTief({
						gr: quelle.bd[i].gr,
						id: quelle.bd[i].id,
						za: false,
						strip: true,
					}));
				}
				kopie.bd = bd;
				continue;
			}
			// Wert kopieren
			if (Array.isArray(quelle[wert])) {
				kopie[wert] = [...quelle[wert]];
			} else {
				kopie[wert] = quelle[wert];
			}
		}
		return kopie;
	},
};
