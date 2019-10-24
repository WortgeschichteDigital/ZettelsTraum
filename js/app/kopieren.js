"use strict";

let kopieren = {
	// speichert, ob der Kopiermodus an ist
	an: false,
	// speichert die IDs der Karten, die zum Kopieren ausgewählt wurden
	belege: [],
	// Kopier-Prozess initialisieren
	init () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen("alert");
			dialog.text("Um die Funktion <i>Belege &gt; Kopieren</i> zu nutzen, muss eine Kartei geöffnet sein.");
			return;
		}
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
		helfer.animation("liste");
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
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen("alert");
			dialog.text("Um die Funktion <i>Belege &gt; Einfügen</i> zu nutzen, muss eine Kartei geöffnet sein.");
			return;
		}
		// Overlay-Fenster öffnen
		overlay.oeffnen(document.getElementById("kopieren-einfuegen"));
		// zuvor geladene Belegedatei löschen
		kopieren.belegedatei = [];
		// Datenfelder abhaken
		document.querySelectorAll("#kopieren-einfuegen-formular input").forEach(function(i) {
			const feld = i.id.replace(/.+-/, "");
			i.checked = optionen.data.kopieren[feld];
		});
		// Basisdaten anfragen und eintragen
		kopieren.einfuegenBasisdaten(false);
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
	// Basisdaten der Karteien, aus denen Belege eingefügt werden können, anfordern
	//   animation = Boolean
	//     (der Reload-Button soll animiert werden)
	einfuegenBasisdaten (animation) {
		const {ipcRenderer, remote} = require("electron");
		ipcRenderer.send("kopieren-basisdaten", remote.getCurrentWindow().id);
		if (animation) {
			const button = document.getElementById("kopieren-einfuegen-reload");
			button.classList.add("animation");
			setTimeout(function() {
				button.classList.remove("animation");
			}, 1000);
		}
	},
	// Zwischenspeicher für die Basisdaten der einfügbaren Belege
	//   "ID" (ID des Fensters, von dem die Daten stammen)
	//     belege (Number; Anzahl der Belege, die kopiert werden können)
	//     gerueste (Array; eindimensional mit Strings gefüllt; die Strings = IDs der Bedeutungsgerüste)
	//     wort (String; das Karteiwort)
	basisdaten: {},
	// Zwischenspeicher für die Daten der geladenen Belegedatei
	belegedatei: [],
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
		if (!Object.keys(daten).length &&
				!kopieren.belegedatei.length &&
				!kopieren.zwischenablage.length) {
			let p = document.createElement("p");
			cont.appendChild(p);
			p.classList.add("keine");
			p.textContent = "keine Belegquellen gefunden";
			kopieren.einfuegenBasisdatenBedeutungen("");
			return;
		}
		// ggf. die Belegedatei hinzufügen
		if (kopieren.belegedatei.length) {
			daten.belegedatei = {
				belege: kopieren.belegedatei.length,
				gerueste: [],
				wort: "Belegedatei",
			};
			for (let beleg of kopieren.belegedatei) {
				for (let bd of beleg.bd) {
					if (!daten.belegedatei.gerueste.includes(bd.gr)) {
						daten.belegedatei.gerueste.push(bd.gr);
					}
				}
			}
			daten.belegedatei.gerueste.sort();
		}
		// ggf. die Zwischenablage hinzufügen
		if (kopieren.zwischenablage.length) {
			daten.zwischenablage = {
				belege: 1,
				gerueste: [],
				wort: "Zwischenablage",
			};
			for (let bd of kopieren.zwischenablage[0].bd) {
				if (!daten.zwischenablage.gerueste.includes(bd.gr)) {
					daten.zwischenablage.gerueste.push(bd.gr);
				}
			}
			daten.zwischenablage.gerueste.sort();
		}
		// Datensätze sortieren;
		let ds = Object.keys(daten);
		ds.sort(function(a, b) {
			if (a === "belegedatei") {
				return -1;
			} else if (b === "belegedatei") {
				return 1;
			}
			if (a === "zwischenablage") {
				return -1;
			} else if (b === "zwischenablage") {
				return 1;
			}
			let x = [a, b];
			x.sort();
			if (x[0] === a) {
				return -1;
			}
			return 1;
		});
		// Belegquellen aufbauen
		let ausgewaehlt = false,
			id_aktiv = "";
		for (let i = 0, len = ds.length; i < len; i++) {
			const id = ds[i];
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
				id_aktiv = id;
			}
			// Wort
			if (/^[0-9]+$/.test(id)) {
				let i = document.createElement("i");
				i.textContent = daten[id].wort;
				p.appendChild(i);
			} else {
				p.appendChild(document.createTextNode(daten[id].wort));
			}
			// Belege
			let num = "Beleg";
			if (daten[id].belege > 1) {
				num = "Belege";
			}
			p.appendChild(document.createTextNode(` (${daten[id].belege} ${num})`));
		}
		// Importformular für Bedeutungen aufbauen
		kopieren.einfuegenBasisdatenBedeutungen(id_aktiv);
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
		if (daten.typ !== "bwgd") {
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
			let ps = document.querySelectorAll("#kopieren-einfuegen-daten p"),
				id_aktiv = "";
			for (let p of ps) {
				let input = p.querySelector("input");
				if (p === this) {
					input.checked = true;
					id_aktiv = input.value;
				} else {
					input.checked = false;
				}
			}
			kopieren.einfuegenBasisdatenBedeutungen(id_aktiv);
		});
	},
	// Importformular für die Bedeutungen
	//   id_aktiv = String
	//     (ID des aktiven Datensatzes, kann leer sein)
	einfuegenBasisdatenBedeutungen (id_aktiv) {
		let cont = document.getElementById("kopieren-einfuegen-bedeutungen");
		helfer.keineKinder(cont);
		// Gerüste ermitteln
		let gerueste = [];
		if (id_aktiv) {
			gerueste = kopieren.basisdaten[id_aktiv].gerueste;
		}
		// es könnte sein, dass die ausgewählten Belege keine Bedeutungen haben =>
		// dann werden auch keine Bedeutungsgerüste gefunden
		if (!gerueste.length) {
			let p = document.createElement("p");
			cont.appendChild(p);
			p.classList.add("keine");
			p.textContent = "keine Bedeutungen gefunden";
			return;
		}
		// Tabelle erzeugen
		let table = document.createElement("table");
		cont.appendChild(table);
		for (let i = 0, len = gerueste.length; i < len; i++) {
			const id = gerueste[i];
			let tr = document.createElement("tr");
			table.appendChild(tr);
			// Gerüst-ID
			let td = document.createElement("td");
			tr.appendChild(td);
			td.textContent = `Gerüst ${id}`;
			// Pfeil
			td = document.createElement("td");
			tr.appendChild(td);
			let img = document.createElement("img");
			td.appendChild(img);
			img.src = "img/pfeil-gerade-rechts.svg";
			img.width = "24";
			img.height = "24";
			// Dropdown
			td = document.createElement("td");
			tr.appendChild(td);
			td.classList.add("dropdown-cont");
			let input = document.createElement("input");
			td.appendChild(input);
			input.classList.add("dropdown-feld");
			input.id = `kopieren-geruest-${id}`;
			input.readOnly = true;
			input.title = "Bedeutungsgerüst auswählen";
			input.type = "text";
			if (i === 0) {
				input.value = "Gerüst 1";
			} else {
				input.value = "kein Import";
			}
			dropdown.feld(input);
			let a = dropdown.makeLink("dropdown-link-td", "Bedeutungsgerüst auswählen");
			td.appendChild(a);
		}
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
		// keine Belegquellen vorhanden
		if (!quelle) {
			dialog.oeffnen("alert");
			dialog.text("Beim Kopieren der Belege ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nEs gibt keine Belegquelle, die Belege zum Einfügen liefern könnte.");
			return;
		}
		// Quelle = Zwischenablage oder Belegedatei
		if (!/^[0-9]+$/.test(quelle)) {
			kopieren.einfuegenEinlesen(kopieren[quelle]);
			return;
		}
		// Quelle = Fenster
		const {ipcRenderer, remote} = require("electron");
		ipcRenderer.send("kopieren-daten", parseInt(quelle, 10), remote.getCurrentWindow().id);
	},
	// die übergebenen Daten werden eingelesen
	// (wird auch für zum Duplizieren von Belegen genutzt)
	//   daten = Array
	//     (in jedem Slot ist eine Zettelkopie, wie sie in kopieren.datenBeleg() erstellt wird)
	//   duplikat = true || undefined
	//     (der übergebene Beleg soll dupliziert werden)
	einfuegenEinlesen (daten, duplikat = false) {
		// Bedeutungsmapper (welche Bedeutungen in welche Gerüste kommen)
		let bdMap = {};
		if (duplikat) {
			Object.keys(data.bd.gr).forEach(function(i) {
				bdMap[i] = i;
			});
		} else {
			document.querySelectorAll("#kopieren-einfuegen-bedeutungen input").forEach(function(i) {
				const idQuelle = i.id.replace(/.+-/, "");
				let idZiel = "",
					wert = i.value.match(/^Gerüst ([0-9]+)/);
				if (wert) {
					idZiel = wert[1];
				}
				bdMap[idQuelle] = idZiel;
			});
		}
		// Datenfelder ermitteln, die importiert werden sollen
		let ds = [];
		document.querySelectorAll("#kopieren-einfuegen-formular input").forEach(function(i) {
			if (!i.checked && !duplikat) {
				return;
			}
			ds.push(i.id.replace(/.+-/, ""));
		});
		// neue Karten anlegen
		let fehler_bedeutungen = new Set(),
			id_karte_duplikat = 0;
		for (let i = 0, len = daten.length; i < len; i++) {
			// eine neue Karte erzeugen
			const id_karte = beleg.idErmitteln();
			if (duplikat) { // ID für das spätere Öffnen der Karteikarte zwischenspeichern (falls duplizieren aus Karteikarte heraus)
				id_karte_duplikat = id_karte;
			}
			if (len === 1) { // wird nur ein Beleg kopiert, kann er nach dem Aufbau der Belegliste hervorgehoben werden
				liste.statusNeu = id_karte.toString();
			}
			data.ka[id_karte] = beleg.karteErstellen();
			// die Karte mit den gewünschten Datensätzen füllen
			for (let j = 0, len = ds.length; j < len; j++) {
				if (ds[j] === "bd") { // Bedeutungen
					for (let k of daten[i].bd) { // sind keine Bedeutungen eingetragen, wird diese Schleife einfach nicht ausgeführt
						// Sollen Bedeutungen aus diesem Gerüst überhaupt importiert werden?
						//   k.gr = String (die ID des Bedeutungsgerüsts in der Quell-Kartei)
						//   k.bd = String (die Bedeutung, ausgeschrieben mit Hierarchien ": ")
						if (!bdMap[k.gr]) {
							continue;
						}
						// Bedeutung importieren und ggf. im Gerüst ergänzen
						let bd = beleg.bedeutungSuchen(k.bd, bdMap[k.gr]);
						if (!bd.id) {
							bd = beleg.bedeutungErgaenzen(k.bd, bdMap[k.gr]);
							if (!bd.id) { // zur Sicherheit, falls beim Ergänzen etwas schief gegangen ist
								fehler_bedeutungen.add(id_karte);
								continue;
							}
						}
						// Ist die Bedeutung schon vorhanden?
						const schon_vorhanden = bedeutungen.schonVorhanden({
								bd: data.ka[id_karte].bd,
								gr: bdMap[k.gr],
								id: bd.id,
							});
						if (schon_vorhanden[0]) {
							continue;
						}
						data.ka[id_karte].bd.push({
							gr: bdMap[k.gr],
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
		// die folgenden Operationen sind fast alle unnötig, wenn ein Beleg dupliziert wurde
		if (duplikat) {
			liste.status(true); // Liste und Filter neu aufbauen
			return id_karte_duplikat;
		}
		// BedeutungsgerüstFenster auffrischen
		bedeutungenWin.daten();
		// Liste und Filter neu aufbauen, Liste anzeigen
		liste.status(true);
		liste.wechseln();
		// Einfüge-Fenster ggf. schließen
		if (optionen.data.einstellungen["einfuegen-schliessen"]) {
			overlay.schliessen(document.getElementById("kopieren-einfuegen"));
		}
		// Gab es Fehler beim Importieren der Bedeutungen?
		if (fehler_bedeutungen.size) {
			let fehler_belege = [];
			for (let id of fehler_bedeutungen) {
				fehler_belege.push(liste.detailAnzeigenH3(id.toString()));
			}
			dialog.oeffnen("alert");
			dialog.text(`Beim Importieren der Bedeutungen ist es in den folgenden Belegen zu einem Fehler gekommen:\n${fehler_belege.join("<br>")}`);
		}
	},
	// Basisdaten über die Belegmenge und das Fenster an den Main-Prozess senden
	basisdatenSenden () {
		const {ipcRenderer, remote} = require("electron");
		let daten = {
			id: remote.getCurrentWindow().id,
			wort: kartei.wort,
			belege: kopieren.belege.length,
			gerueste: Object.keys(data.bd.gr),
		};
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
				kopie.bd = [];
				for (let i = 0, len = quelle.bd.length; i < len; i++) {
					kopie.bd.push({
						gr: quelle.bd[i].gr,
						bd: bedeutungen.bedeutungenTief({
							gr: quelle.bd[i].gr,
							id: quelle.bd[i].id,
							za: false,
							strip: true,
						}),
					});
				}
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
	// Kopierliste in Datei exportieren
	exportieren () {
		// keine Belege in der Kopierliste
		if (!kopieren.belege.length) {
			kartei.dialogWrapper("Sie haben keine Belege ausgewählt.");
			return;
		}
		// Daten zusammentragen
		let daten = {
			bl: [],
			ty: "bwgd",
			ve: 1,
		};
		for (let id of kopieren.belege) {
			daten.bl.push(kopieren.datenBeleg(data.ka[id]));
		}
		// Daten in Datei speichern
		let num = "Belege";
		if (kopieren.belege.length === 1) {
			num = "Beleg";
		}
		const {app, dialog} = require("electron").remote,
			path = require("path");
		let opt = {
			title: "Belege exportieren",
			defaultPath: path.join(app.getPath("documents"), `${kartei.wort}, ${kopieren.belege.length} ${num}.bwgd`),
			filters: [
				{
					name: "Wortgeschichte digital-Belege",
					extensions: ["bwgd"],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
		};
		dialog.showSaveDialog(null, opt)
			.then(result => {
				if (result.canceled) {
					kartei.dialogWrapper("Die Belege wurden nicht gespeichert.");
					return;
				}
				const fs = require("fs");
				fs.writeFile(result.filePath, JSON.stringify(daten), function(err) {
					if (err) {
						kartei.dialogWrapper(`Beim Speichern der Belege ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`);
					}
				});
			})
			.catch(err => kartei.dialogWrapper(`Beim Öffnen des Datei-Dialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`));
	},
	// Kopierliste aus Datei importieren
	importieren () {
		const {app, dialog} = require("electron").remote;
		let opt = {
			title: "Belege importieren",
			defaultPath: app.getPath("documents"),
			filters: [
				{
					name: "Wortgeschichte digital-Belege",
					extensions: ["bwgd"],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
			properties: [
				"openFile",
			],
		};
		dialog.showOpenDialog(null, opt)
			.then(result => {
				if (result.canceled) {
					kartei.dialogWrapper("Sie haben keine Datei ausgewählt.");
					return;
				}
				const fs = require("fs");
				fs.readFile(result.filePaths[0], "utf-8", function(err, content) {
					if (err) {
						kartei.dialogWrapper(`Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`);
						return;
					}
					let belegedatei_tmp = {};
					try {
						belegedatei_tmp = JSON.parse(content);
					} catch (err_json) {
						kartei.dialogWrapper(`Beim Einlesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${err_json}`);
						return;
					}
					if (belegedatei_tmp.ty !== "bwgd") {
						kartei.dialogWrapper(`Beim Einlesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nkeine Belege-Datei von <i>Wortgeschichte digital</i>`);
						return;
					}
					kopieren.belegedatei = belegedatei_tmp.bl;
					kopieren.einfuegenBasisdaten(true);
				});
			})
			.catch(err => kartei.dialogWrapper(`Beim Öffnen des Datei-Dialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`));
	},
};
