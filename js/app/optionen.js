"use strict";

let optionen = {
	// Speicherort aller Optionen
	// (ausgenommen ist der Fenster-Status, der nur im Main-Prozess steht)
	data: {
		// Karteikarte
		beleg: {
			// Belegkontext in der Leseansicht kürzen
			kuerzen: true,
			// Trennstriche und Seitenumbrüche in der Leseansicht anzeigen
			trennung: true,
		},
		// Filterleiste
		filter: {
			// Anzahl der Filter während der Filterung sukzessive reduzieren
			reduzieren: false,
			// erweiterte Suche: Suchausdruck als Phrase behandeln
			phrase: false,
			// erweiterte Suche: Groß- und Kleinschreibung im Text beachten
			"text-genau": false,
			// erweiterte Suche: nur ganze Wörter suchen
			"ganzes-wort": false,
			// erweiterte Suche: Datenfelder
			"feld-au": true,
			"feld-bd": true,
			"feld-bl": true,
			"feld-bs": true,
			"feld-da": true,
			"feld-kr": true,
			"feld-no": true,
			"feld-qu": true,
			"feld-ts": true,
			// speichert den gewünschten Zeitintervall, der in der Filterliste gewählt wurde
			zeitraum: "100",
			// inklusive Logik sollte der exklusiven vorgezogen werden (betrifft "Verschiedenes")
			logik: "inklusiv",
		},
		// Einstellungen im Kopf der Belegliste
		belegliste: {
			// Filterleiste anzeigen
			filterleiste: false,
			// chronologischen Richtung, in der die Belege sortiert werden sollen
			sort_aufwaerts: false,
			// Dichte der Zeitschnitte oder Zeitschnitte ausblenden
			// mögliche Werte: "10", "50", "100", "-" (keine Schnitte anzeigen)
			zeitschnitte: "-",
			// kompletten Beleg anzeigen oder ausblenden
			beleg: false,
			// Absätze im Beleg ohne Worttreffer gekürzt darstellen
			beleg_kuerzen: false,
			// Trennstriche im Belegtext anzeigen
			trennung: false,
			// Wort der Kartei in der Vorschau und im Beleg automatisch hervorheben
			wort_hervorheben: false,
			// Steuerung Details: Bedeutung einblenden
			detail_bd: false,
			// Steuerung Details: Wortbildung einblenden (ist mit Bedeutung gekoppelt)
			detail_bl: false,
			// Steuerung Details: Quelle einblenden
			detail_qu: false,
			// Steuerung Details: Korpus einblenden (ist mit Quelle gekoppelt)
			detail_kr: false,
			// Steuerung Details: Textsorte einblenden
			detail_ts: false,
			// Steuerung Details: Notizen einblenden
			detail_no: false,
			// Steuerung Details: Metainfos einblenden
			detail_meta: false,
		},
		// Einstellungen-Dialog
		einstellungen: {
			// ALLGEMEINES
			// für diesen Computer registrierte BearbeiterIn
			bearbeiterin: "",
			// Timeout für Anfrage an das DTA in Sekunden
			// (einfacher als String, wird bei Bedarf in Number konvertiert)
			timeout: "10",
			// Notizen-Fenster nach dem Speichern direkt schließen
			"notizen-schliessen": true,
			// Hervorhebung des Wort beim Kopieren von Text mitkopieren
			"textkopie-wort": false,
			// beim Kopieren ist das Wort grau hinterlegt
			"textkopie-wort-hinterlegt": false,
			// MENÜ
			// Menü-Leiste ausblenden (einblenden, wenn Alt gedruckt)
			autoHideMenuBar: false,
			// Quick-Access-Bar anzeigen
			quick: false,
			// Icons in der Quick-Access-Bar, die ein- oder ausgeblendet gehören
			"quick-programm-einstellungen": false,
			"quick-programm-beenden": false,
			"quick-kartei-erstellen": false,
			"quick-kartei-oeffnen": false,
			"quick-kartei-speichern": false,
			"quick-kartei-speichern-unter": false,
			"quick-kartei-schliessen": false,
			"quick-kartei-formvarianten": false,
			"quick-kartei-notizen": false,
			"quick-kartei-anhaenge": false,
			"quick-kartei-lexika": false,
			"quick-kartei-metadaten": false,
			"quick-kartei-redaktion": false,
			"quick-kartei-bedeutungen": false,
			"quick-kartei-bedeutungen-fenster": false,
			"quick-kartei-suche": false,
			"quick-belege-hinzufuegen": false,
			"quick-belege-auflisten": false,
			"quick-belege-sortieren": false,
			// BEDEUTUNGSGERÜST
			// Bedeutungsgerüst nach dem Speichern direkt schließen
			"bedeutungen-schliessen": true,
			// Sachgebiete
			sachgebiete: {},
			// Sachgebiete (Datei mit Liste an Sachgebieten)
			"sachgebiete-datei": "",
			// Sachgebiete (beim Start automatisch mit der Datei abgleichen)
			"sachgebiete-abgleich": true,
			// Sachgebiete (Datum des letzten Abgleichs)
			"sachgebiete-zuletzt-abgleich": "",
			// Sachgebiete (Datum des letzten Updates)
			"sachgebiete-zuletzt-update": "",
			// Sachgebiete (wenn beim Programmstart keine Verknüpfung mit einer Sachgebiete-XML vorhanden ist, automatisch mit der Datei im Programm-Ordner verknüpfen; diese Verknüpfung wird nur einmal gemacht)
			"sachgebiete-autoloading": true,
			// KARTEIKARTE
			// Karteikarte nach dem Speichern direkt schließen
			"karteikarte-schliessen": true,
			// neue Karteikarten als unvollständig markieren
			unvollstaendig: false,
			// nach DTA-Import überprüft, ob das Kartei-Wort im Belegtext gefunden werden kann
			"wort-check": true,
			// Textfeld immer ergänzen, wenn aus einem Dropdown-Menü ein Wert
			// ausgewählt wurde (betrifft Bedeutung und Textsorte)
			"immer-ergaenzen": false,
			// bestehende Karteikarten in der Leseansicht öffnen
			leseansicht: true,
			// in Leseansicht über dem Belegtext ein Suchfeld einblenden
			"karte-suchfeld": true,
			// FILTERLEISTE
			// alle anderen Filterblöcke zuklappen, wenn ein Filterblock geöffnet wird
			"filter-zuklappen": false,
			// inaktive Filterblöcke nach dem Neuaufbau der Filterleiste automatisch zuklappen
			"filter-inaktive": false,
			// nicht warnen, wenn eine Karte erstellt wurde, sie aber wegen der Filterregeln nicht angezeigt wird
			"nicht-karte-gefiltert": false,
			// Filter, die standardmäßig geöffnet werden
			"filter-offen-volltext": true,
			"filter-offen-zeitraum": false,
			"filter-offen-bedeutungen": false,
			"filter-offen-wortbildungen": false,
			"filter-offen-korpora": false,
			"filter-offen-textsorten": false,
			"filter-offen-verschiedenes": false,
			// BELEGLISTE
			// die Icons, die die Anzeige der Datenfelder in der Belegliste steuern, sollen immer an sein
			"anzeige-icons-immer-an": false,
			// Textsorte in den Kopf der Belegliste eintragen
			textsorte: false,
		},
		// Liste mit Personen, die in dem Projekt arbeiten
		// (wird über die Einstellungen geladen)
		personen: [],
		// letzter Pfad, der beim Speichern oder Öffnen einer Datei benutzt wurde
		letzter_pfad: "",
		// zuletzt verwendete Dokumente
		zuletzt: [],
	},
	// liest die vom Main-Prozess übergebenen Optionen ein
	// (zur Sicherheit werden alle Optionen einzeln eingelesen;
	// so kann ich ggf. Optionen einfach löschen)
	//   obj = Object
	//     (Objekt-Referenz von optionen.data, in der nach Werten gesucht werden soll)
	//   opt = Object
	//     (Objekt-Referenz der durch den Main-Prozess übergebenen Daten)
	einlesen (obj, opt) {
		for (let o in obj) {
			if (!obj.hasOwnProperty(o)) {
				continue;
			}
			if (!opt.hasOwnProperty(o)) {
				continue;
			}
			if (helfer.checkType("Object", obj[o])) {
				if (o === "sachgebiete") {
					obj[o] = Object.assign({}, opt[o]);
				} else {
					optionen.einlesen(obj[o], opt[o]);
				}
			} else {
				obj[o] = opt[o];
			}
		}
	},
	// nach dem Laden müssen manche Optionen direkt angewendet werden
	anwenden () {
		// Quick-Access-Bar ein- oder ausschalten
		optionen.anwendenQuickAccess();
		// Anzeige der Sachgebiete auffrischen
		optionen.anwendenSachgebiete(true);
		// Zeitfilter in der Filterleiste anpassen
		let filter_zeitraum = document.getElementsByName("filter-zeitraum");
		for (let i = 0, len = filter_zeitraum.length; i < len; i++) {
			if (filter_zeitraum[i].id === `filter-zeitraum-${optionen.data.filter.zeitraum}`) {
				filter_zeitraum[i].checked = true;
			} else {
				filter_zeitraum[i].checked = false;
			}
		}
		// andere Filter-Optionen in der Filterleiste anpassen
		document.querySelectorAll(".filter-optionen").forEach(function(i) {
			const opt = i.id.replace(/^filter-/, "");
			i.checked = optionen.data.filter[opt];
		});
		// Icons im Header der Filterleiste anpassen
		filter.ctrlReduzierenAnzeige();
		// Icons und Text im Header der Belegliste anpassen
		liste.headerFilterAnzeige(false); // hier auch die Anzeige der Filterleiste anpassen
		liste.headerSortierenAnzeige();
		liste.headerZeitschnitteAnzeige();
		liste.headerBelegAnzeige();
		liste.headerBelegKuerzenAnzeige();
		liste.headerTrennungAnzeige();
		liste.headerWortHervorhebenAnzeige();
		// Auswahllinks für Detail-Anzeige anpassen
		let details = ["bd", "bl", "qu", "kr", "ts", "no", "meta"];
		for (let i = 0, len = details.length; i < len; i++) {
			liste.headerDetailsAnzeige(details[i], `detail_${details[i]}`);
		}
		liste.headerDetailsLetztesIcon();
		// Icons für die Detailanzeige immer sichtbar?
		optionen.anwendenIconsDetails();
		// Icons im <caption> der Karteikarte
		beleg.ctrlKuerzenAnzeige();
		beleg.ctrlTrennungAnzeige();
		// Optionen im Optionen-Fenster eintragen
		let ee = document.querySelectorAll("#einstellungen input");
		for (let i = 0, len = ee.length; i < len; i++) {
			let e = ee[i].id.replace(/^einstellung-/, "");
			if (ee[i].type === "checkbox") {
				ee[i].checked = optionen.data.einstellungen[e] ? true : false;
			} else if (ee[i].type === "text" || ee[i].type === "number") {
				ee[i].value = optionen.data.einstellungen[e] ? optionen.data.einstellungen[e] : "";
			}
		}
	},
	// Quick-Access-Bar ein- bzw. ausblenden
	anwendenQuickAccess () {
		let quick = document.getElementById("quick");
		// Icons ein- oder ausblenden
		let icons = quick.querySelectorAll("a"),
			icons_alle_aus = true;
		for (let i = 0, len = icons.length; i < len; i++) {
			if (optionen.data.einstellungen[icons[i].id]) {
				icons[i].classList.remove("aus");
				icons_alle_aus = false;
			} else {
				icons[i].classList.add("aus");
			}
		}
		// Spacer ein- oder ausblenden
		if (optionen.data.einstellungen.quick && !icons_alle_aus) {
			let spacer = document.querySelectorAll(".quick-spacer");
			spacer.forEach(function(i) {
				i.classList.add("aus");
			});
			spacer.forEach(function(i) {
				let prev = i.previousSibling,
					next = i.nextSibling,
					vor = false,
					nach = false;
				// vorherige Elemente
				do {
					if (!prev.classList.contains("aus")) {
						if (!prev.classList.contains("quick-spacer")) {
							vor = true;
						}
						break;
					}
					prev = prev.previousSibling;
				} while (prev);
				// folgende Elemente
				do {
					if (!next.classList.contains("aus")) {
						nach = true;
						break;
					}
					next = next.nextSibling;
				} while (next);
				// ein- od. ausschalten
				if (vor && nach) {
					i.classList.remove("aus");
				} else {
					i.classList.add("aus");
				}
			});
		}
		// Bar ein- oder ausblenden
		if (optionen.data.einstellungen.quick && !icons_alle_aus) {
			quick.classList.add("an");
		} else {
			quick.classList.remove("an");
		}
		// affizierte Elemente anpassen
		let affiziert = document.querySelectorAll("body > header, body > section");
		for (let i = 0, len = affiziert.length; i < len; i++) {
			if (optionen.data.einstellungen.quick && !icons_alle_aus) {
				affiziert[i].classList.add("quick");
			} else {
				affiziert[i].classList.remove("quick");
			}
		}
	},
	// Icons für die Detail-Anzeige im Kopf der Belegliste ggf. immer sichtbar (Listener)
	anwendenIconsDetailsListener (input) {
		input.addEventListener("change", function() {
			optionen.data.einstellungen["anzeige-icons-immer-an"] = this.checked;
			optionen.speichern(false);
			optionen.anwendenIconsDetails();
		});
	},
	// Icons für die Detail-Anzeige im Kopf der Belegliste ggf. immer sichtbar
	anwendenIconsDetails () {
		let iconsDetails = document.querySelector(".liste-opt-anzeige");
		if (optionen.data.einstellungen["anzeige-icons-immer-an"]) {
			iconsDetails.classList.add("liste-opt-anzeige-an");
		} else {
			iconsDetails.classList.remove("liste-opt-anzeige-an");
		}
	},
	// Informationen zu den Sachgebieten auffrischen
	//   init = Boolean
	//     (Aufruf der Funktion beim Einlesen der Einstellungen)
	anwendenSachgebiete (init) {
		// Sachgebiete eintragen
		const sg = document.getElementById("sachgebiete");
		if (Object.keys(optionen.data.einstellungen.sachgebiete).length) {
			sg.classList.remove("leer");
			let a = document.createElement("a");
			a.href = "#";
			a.textContent = `${Object.keys(optionen.data.einstellungen.sachgebiete).length} Sachgebiete`;
			optionen.sachgebieteAnzeigen(a);
			sg.replaceChild(a, sg.firstChild);
		} else {
			sg.classList.add("leer");
			sg.textContent = "keine Sachgebiete";
		}
		// Datei eintragen
		const tab = document.querySelector(".sachgebiete"),
			datei = document.getElementById("sachgebiete-datei");
		if (optionen.data.einstellungen["sachgebiete-datei"]) {
			tab.classList.add("gefuellt");
			datei.classList.remove("leer");
			const pfad = `\u200E${optionen.data.einstellungen["sachgebiete-datei"]}\u200E`; // vgl. meta.oeffnen()
			datei.textContent = pfad;
			datei.title = pfad;
		} else {
			tab.classList.remove("gefuellt");
			datei.classList.add("leer");
			datei.textContent = "keine Sachgebiete-Datei";
			datei.removeAttribute("title");
		}
		// Datum Sachgebiete eintragen
		let sgAbgleich = document.getElementById("sachgebiete-zuletzt-abgleich");
		if (optionen.data.einstellungen["sachgebiete-zuletzt-abgleich"]) {
			sgAbgleich.parentNode.classList.remove("aus");
			sgAbgleich.textContent = helfer.datumFormat(optionen.data.einstellungen["sachgebiete-zuletzt-abgleich"]);
		} else {
			sgAbgleich.parentNode.classList.add("aus");
		}
		let sgUpdate = document.getElementById("sachgebiete-zuletzt-update");
		if (optionen.data.einstellungen["sachgebiete-zuletzt-update"]) {
			sgUpdate.parentNode.classList.remove("aus");
			sgUpdate.textContent = helfer.datumFormat(optionen.data.einstellungen["sachgebiete-zuletzt-update"]);
		} else {
			sgUpdate.parentNode.classList.add("aus");
		}
		// ggf. einen Check der Sachgebiete-Datei anstoßen
		if (init) {
			if (optionen.data.einstellungen["sachgebiete-autoloading"] &&
					!optionen.data.einstellungen["sachgebiete-datei"]) {
				const {app} = require("electron").remote,
					path = require("path");
				let basis = "";
				// getAppPath() funktioniert nur in der nicht-paketierten App, in der paketierten
				//   zeigt es auf [Installationsordner/resources/app.asar;
				// getPath("exe") funktioniert nur in der paktierten Version, allerdings muss
				//   noch der Name der ausführbaren Datei entfernt werden; in der nicht-paketierten
				//   App zeigt es auf die ausführbare Datei des Node-Modules
				if (app.isPackaged) {
					basis = app.getPath("exe").replace(/zettelstraum(\.exe)*$/, "");
				} else {
					basis = app.getAppPath();
				}
				optionen.data.einstellungen["sachgebiete-datei"] = path.join(basis, "resources", "Sachgebiete.xml");
				optionen.data.einstellungen["sachgebiete-autoloading"] = false;
			}
			optionen.sachgebieteCheck();
		} else {
			optionen.sachgebieteChecked = true;
		}
	},
	// Sachgebiete-Datei wurde in dieser Session schon einmal überprüft
	sachgebieteChecked: false,
	// Sachgebiete-Datei überprüfen
	sachgebieteCheck () {
		if (optionen.sachgebieteChecked ||
				!optionen.data.einstellungen["sachgebiete-abgleich"] ||
				!optionen.data.einstellungen["sachgebiete-datei"]) {
			return;
		}
		const fs = require("fs");
		fs.readFile(optionen.data.einstellungen["sachgebiete-datei"], "utf-8", function(err, content) {
			// Fehlermeldung (wahrscheinlich existiert die Datei nicht mehr)
			if (err) {
				fehler();
				optionen.sachgebieteFehlerMeldung = "Öffnen misslungen";
				return;
			}
			// Datei parsen
			let xml = optionen.sachgebieteParsen(content);
			if (!xml) {
				fehler();
				return;
			}
			// Sachgebiete aus- und einlesen
			let sachgebieteNeu = {},
				update = false;
			xml.querySelectorAll("sachgebiet").forEach(function(i) {
				const id = i.querySelector("id").firstChild.nodeValue,
					name = i.querySelector("name").firstChild.nodeValue;
				sachgebieteNeu[id] = name;
			});
			let sachgebiete = optionen.data.einstellungen.sachgebiete;
			for (let id in sachgebiete) { // veraltete Einträge löschen
				if (!sachgebiete.hasOwnProperty(id)) {
					continue;
				}
				if (!sachgebieteNeu[id]) {
					update = true;
					delete sachgebiete[id];
				}
			}
			for (let id in sachgebieteNeu) { // neue Einträge anlegen, geänderte auffrischen
				if (!sachgebieteNeu.hasOwnProperty(id)) {
					continue;
				}
				if (!sachgebiete[id] || sachgebiete[id] !== sachgebieteNeu[id]) {
					update = true;
					sachgebiete[id] = sachgebieteNeu[id];
				}
			}
			// Datum Abgleich speichern
			optionen.data.einstellungen["sachgebiete-zuletzt-abgleich"] = new Date().toISOString();
			if (update) {
				optionen.data.einstellungen["sachgebiete-zuletzt-update"] = new Date().toISOString();
			}
			// Optionen speichern
			optionen.speichern(false);
			// Überprüfung durchgeführt
			optionen.sachgebieteChecked = true;
			// Anzeige auffrischen
			optionen.anwendenSachgebiete(false);
			// Fehler-Kreuz einfügen
			function fehler () {
				let img = document.createElement("img");
				img.src = "img/fehler.svg";
				img.width = "24";
				img.height = "24";
				img.addEventListener("click", function() {
					optionen.sachgebieteFehler();
				});
				const datei = document.getElementById("sachgebiete-datei");
				datei.insertBefore(img, datei.firstChild);
			}
		});
	},
	// Datei mit Sachgebieten laden
	sachgebieteLaden () {
		const {app, dialog} = require("electron").remote;
		let opt = {
			title: "Sachgebiete laden",
			defaultPath: app.getPath("documents"),
			filters: [
				{
					name: "XML-Datei",
					extensions: ["xml"],
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
		// Dialog anzeigen
		dialog.showOpenDialog(null, opt, function(datei) { // datei ist ein Array!
			if (datei === undefined) {
				kartei.dialogWrapper("Sie haben keine Datei ausgewählt.");
				return;
			}
			const fs = require("fs");
			fs.readFile(datei[0], "utf-8", function(err, content) {
				// Fehlermeldung
				if (err) {
					kartei.dialogWrapper(`Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`);
					return;
				}
				// Datei parsen
				let xml = optionen.sachgebieteParsen(content);
				if (!xml) {
					optionen.sachgebieteFehler();
					return;
				}
				// Sachgebiete aus- und einlesen
				optionen.data.einstellungen.sachgebiete = {};
				let sachgebiete = optionen.data.einstellungen.sachgebiete;
				xml.querySelectorAll("sachgebiet").forEach(function(i) {
					const id = i.querySelector("id").firstChild.nodeValue,
						name = i.querySelector("name").firstChild.nodeValue;
					sachgebiete[id] = name;
				});
				// Pfad zur Datei speichern
				optionen.data.einstellungen["sachgebiete-datei"] = datei[0];
				// Datum Abgleich/Update speichern
				optionen.data.einstellungen["sachgebiete-zuletzt-abgleich"] = new Date().toISOString();
				optionen.data.einstellungen["sachgebiete-zuletzt-update"] = new Date().toISOString();
				// Optionen speichern
				optionen.speichern(false);
				// Anzeige auffrischen
				optionen.anwendenSachgebiete(false);
			});
		});
	},
	// Content der geladenen Sachgebiete-Datei parsen und auf Fehler überprüfen
	sachgebieteParsen (content) {
		let parser = new DOMParser(),
			xml = parser.parseFromString(content, "text/xml");
		// <parsererror>
		if (xml.querySelector("parsererror")) {
			optionen.sachgebieteFehlerMeldung = `<abbr title="Extensible Markup Language">XML</span>-Datei korrupt`;
			return null;
		}
		// <sachgebiete> und <sachgebiet>
		if (!xml.querySelector("sachgebiete") ||
				!xml.querySelector("sachgebiet")) {
			optionen.sachgebieteFehlerMeldung = "unerwartetes Dateiformat";
			return null;
		}
		// Tags <id> und <name> alle vorhanden, keine ID doppelt
		let tag_fehlt = "",
			ids = new Set(),
			ids_doppelt = [],
			sgs = new Set(),
			sgs_doppelt = [];
		for (let i of xml.querySelectorAll("sachgebiet")) {
			if (!i.querySelector("id")) {
				tag_fehlt = "id";
				break;
			} else if (!i.querySelector("name")) {
				tag_fehlt = "name";
				break;
			}
			let id = i.querySelector("id").firstChild.nodeValue;
			if (ids.has(id)) {
				ids_doppelt.push(id);
			} else {
				ids.add(id);
			}
			let sg = i.querySelector("name").firstChild.nodeValue;
			if (sgs.has(sg)) {
				sgs_doppelt.push(sg);
			} else {
				sgs.add(sg);
			}
		}
		if (tag_fehlt) {
			optionen.sachgebieteFehlerMeldung = `fehlender &lt;${tag_fehlt}&gt;-Tag`;
			return null;
		}
		if (ids_doppelt.length) {
			let plural = "s";
			if (ids_doppelt.length === 1) {
				plural = "";
			}
			optionen.sachgebieteFehlerMeldung = `doppelte ID${plural}: ${ids_doppelt.join(", ")}`;
			return null;
		}
		if (sgs_doppelt.length) {
			let text = "doppelte Sachgebiete: ";
			if (sgs_doppelt.length === 1) {
				text = "doppeltes Sachgebiet: ";
			}
			optionen.sachgebieteFehlerMeldung = text + sgs_doppelt.join(", ");
			return null;
		}
		// alles okay => XML-Dokument zurückgeben
		return xml;
	},
	// Fehlertyp, der beim Einlesen einer Sachgebiete-Datei aufgetreten ist
	sachgebieteFehlerMeldung: "",
	// Fehlermeldung anzeigen
	sachgebieteFehler () {
		dialog.oeffnen("alert");
		kartei.dialogWrapper(`Beim Laden der Sachgebiete-Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${optionen.sachgebieteFehlerMeldung}</p>`);
	},
	// Liste der Sachgebiete leeren und Verknüpfung mit Datei entfernen
	sachgebieteLoeschen () {
		// keine Sachgebiete
		if (!Object.keys(optionen.data.einstellungen.sachgebiete).length &&
				!optionen.data.einstellungen["sachgebiete-datei"]) {
			dialog.oeffnen("alert");
			dialog.text("Es wurden noch Sachgebiete geladen!");
			return;
		}
		// Sicherheitsfrage
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				optionen.data.einstellungen.sachgebiete = {};
				optionen.data.einstellungen["sachgebiete-datei"] = "";
				optionen.data.einstellungen["sachgebiete-zuletzt-abgleich"] = "";
				optionen.data.einstellungen["sachgebiete-zuletzt-update"] = "";
				optionen.speichern(false);
				optionen.anwendenSachgebiete(false);
			}
		});
		// Text zusammenstellen
		let text = "Sollen die importierten Sachgebiete wirklich gelöscht werden?\n(Die Verknüpfung mit der aktuellen Sachgebiete-Datei wird in diesem Zuge ebenfalls entfernt.)";
		if (!Object.keys(optionen.data.einstellungen.sachgebiete).length) {
			text = "Soll die Verknüpfung mit der aktuellen Sachgebiete-Datei wirklich entfernt werden?";
		}
		dialog.text(text);
	},
	// Liste der geladenen Sachgebiete anzeigen
	//   a = Element
	//     (Anker, auf den geklickt wurde)
	sachgebieteAnzeigen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let sachgebiete = Object.values(optionen.data.einstellungen.sachgebiete);
			sachgebiete.sort(helfer.sortAlpha);
			dialog.oeffnen("alert");
			dialog.text(`<h3>Sachgebiete</h3>\n${sachgebiete.join("<br>")}`);
		});
	},
	// Timeout für die Speicherfunktion setzen, die nicht zu häufig ablaufen soll und
	// nicht so häufig ablaufen muss.
	//   sofort = Boolean
	//     (wird die Liste der zuletzt geänderten Dateien modifiziert, muss das sofort
	//     gespeichert werden, weil es Konsequenzen für die UI hat)
	speichern_timeout: null,
	speichern (sofort) {
		let timeout = 6e4;
		if (sofort) {
			timeout = 0;
		}
		clearTimeout(optionen.speichern_timeout);
		optionen.speichern_timeout = setTimeout(function() {
			optionen.speichernAnstossen();
		}, timeout);
	},
	// Optionen zum speichern endgültig an den Main-Prozess schicken
	speichernAnstossen () {
		optionen.speichern_timeout = null;
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("optionen-speichern", optionen.data);
	},
	// letzten Pfad speichern
	aendereLetzterPfad () {
		const path = require("path");
		let reg = new RegExp(`^.+\\${path.sep}`);
		const pfad = kartei.pfad.match(reg)[0];
		optionen.data.letzter_pfad = pfad;
		optionen.speichern(false);
	},
	// Liste der zuletzt verwendeten Karteien ergänzen
	aendereZuletzt () {
		// Datei ggf. entfernen (falls an einer anderen Stelle schon vorhanden)
		let zuletzt = optionen.data.zuletzt;
		if (zuletzt.includes(kartei.pfad)) {
			zuletzt.splice(zuletzt.indexOf(kartei.pfad), 1);
		}
		// Datei vorne anhängen
		zuletzt.unshift(kartei.pfad);
		// Liste auf 10 Einträge begrenzen
		if (zuletzt.length > 10) {
			zuletzt.pop();
		}
		// Optionen speichern
		optionen.speichern(true);
	},
	// Liste der zuletzt verwendeten Karteien updaten (angestoßen durch Main-Prozess)
	updateZuletzt(zuletzt) {
		optionen.data.zuletzt = zuletzt;
		if (!document.getElementById("start").classList.contains("aus")) {
			start.zuletzt();
		}
	},
	// Personenliste einlesen
	aenderePersonenliste () {
		const {app, dialog} = require("electron").remote;
		let opt = {
			title: "Personenliste laden",
			defaultPath: app.getPath("documents"),
			filters: [
				{
					name: "Text-Datei",
					extensions: ["txt"],
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
		// Dialog anzeigen
		dialog.showOpenDialog(null, opt, function(datei) { // datei ist ein Array!
			if (datei === undefined) {
				kartei.dialogWrapper("Sie haben keine Datei ausgewählt.");
				return;
			}
			const fs = require("fs");
			fs.readFile(datei[0], "utf-8", function(err, content) {
				// Fehlermeldung
				if (err) {
					kartei.dialogWrapper(`Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`);
					return;
				}
				// Inhalt einlesen und speichern
				optionen.data.personen = [];
				const personen = content.split(/(\r|\n)/); // alle End-of-line-Styles berücksichtigen
				for (let i = 0, len = personen.length; i < len; i++) {
					const person = personen[i].trim();
					if (person) {
						optionen.data.personen.push(person);
					}
				}
				optionen.speichern(false);
				// Rückmeldung
				let fb_obj = function () {
					const len = optionen.data.personen.length;
					this.personen = len === 1 ? "eine" : len;
					this.verb = len === 1 ? "ist" : "sind";
					this.text = len === 1 ? "Person" : "Personen";
				};
				let fb = new fb_obj();
				// Liste wurde geleert
				if (fb.personen === 0) {
					kartei.dialogWrapper("Die Personenliste wurde geleert.");
					return;
				}
				// Liste enthält Personen
				kartei.dialogWrapper(`In der Liste ${fb.verb} jetzt ${fb.personen} ${fb.text}.`);
			});
		});
	},
	// auf Änderung der Einstellungen achten
	//   ele = Element
	//     (Element, dessen Wert geändert wurde)
	aendereEinstellungListener (ele) {
		if (ele.type === "button") { // Lade-Button für die Personenliste
			return;
		}
		let typ = "change"; // Checkbox und Number
		if (ele.type === "text") {
			typ = "input";
		}
		ele.addEventListener(typ, function() {
			optionen.aendereEinstellung(this);
		});
	},
	// Einstellung aus dem Einstellungen-Dialog ändern
	//   ele = Element
	//     (Element, dessen Wert geändert wurde)
	aendereEinstellung (ele) {
		// Option ermitteln und umstellen
		let e = ele.id.replace(/^einstellung-/, "");
		if (ele.type === "checkbox") {
			optionen.data.einstellungen[e] = ele.checked;
		} else if (ele.type === "text" || ele.type === "number") {
			optionen.data.einstellungen[e] = ele.value;
		}
		// ggf. Quick-Access-Bar umstellen
		if (/^quick/.test(e)) {
			optionen.anwendenQuickAccess();
		}
		// Optionen speichern
		optionen.speichern(false);
		// Erinnerungen-Icon auffrischen
		erinnerungen.check();
	},
	// das Optionen-Fenster öffnen
	oeffnen () {
		let fenster = document.getElementById("einstellungen");
		overlay.oeffnen(fenster);
		optionen.sektionWechselnInput();
	},
	// Sektion in den Einstellungen wechseln
	//   link = Element
	//     (Link, der für die Sektion steht, in die gewechsel werden soll)
	sektionWechseln (link) {
		// Links im Menü anpassen
		let menu = document.querySelectorAll("#einstellungen ul a"),
			sektion = "";
		for (let i = 0, len = menu.length; i < len; i++) {
			if (menu[i] === link) {
				menu[i].classList.add("aktiv");
				sektion = menu[i].id.replace(/^einstellungen-link-/, "");
			} else {
				menu[i].classList.remove("aktiv");
			}
		}
		// Anzeige der Sektionen anpassen
		let sektionen = document.querySelectorAll("#einstellungen section");
		for (let i = 0, len = sektionen.length; i < len; i++) {
			if (sektionen[i].id === `einstellungen-sec-${sektion}`) {
				sektionen[i].classList.remove("aus");
			} else {
				sektionen[i].classList.add("aus");
			}
		}
		// 1. Input fokussieren
		optionen.sektionWechselnInput();
	},
	// Klick-Event zum Wechseln der Sektion in den Einstellungen
	//   a = Element
	//     (Link, auf den geklickt wurde)
	sektionWechselnLink (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			optionen.sektionWechseln(this);
		});
	},
	// Fokussiert das erste Input-Element der aktuellen Sektion
	sektionWechselnInput () {
		document.querySelector("#einstellungen section:not(.aus) input").focus();
	},
	// durch die Menüelemente navigieren
	//   tastaturcode = Number
	//     (der durch das Event übergebene Tastaturcode, kann hier nur
	//     38 [aufwärts] od. 40 [abwärts] sein)
	naviMenue (tastaturcode) {
		// aktives Element ermitteln
		let links = document.querySelectorAll("#einstellungen li a"),
			aktiv = document.querySelector("#einstellungen a.aktiv"),
			pos = -1;
		for (let i = 0, len = links.length; i < len; i++) {
			if (links[i] === aktiv) {
				pos = i;
				break;
			}
		}
		// zu aktivierendes Element ermitteln
		if (tastaturcode === 38) {
			pos--;
		} else {
			pos++;
		}
		if (pos < 0) {
			pos = links.length - 1;
		} else if (pos >= links.length) {
			pos = 0;
		}
		// Sektion wechseln
		optionen.sektionWechseln(links[pos]);
	},
	// erzeugt eine Checkbox für Meldungsfenster, um eine Optione leicht zu ändern
	//   label_text = String
	//     (Text für das Label)
	//   option = String
	//     (die Einstellung, die eigentlich geändert werden soll)
	shortcut (label_text, option) {
		// Absatz erzeugen
		let p = document.createElement("p");
		p.classList.add("checkbox");
		// Input
		let input = document.createElement("input");
		p.appendChild(input);
		input.checked = optionen.data.einstellungen[option];
		input.id = "optionen-shortcut";
		input.type = "checkbox";
		input.addEventListener("change", function() {
			let ein = document.getElementById(`einstellung-${option}`);
			if (this.checked) {
				optionen.data.einstellungen[option] = true;
				ein.checked = true;
			} else {
				optionen.data.einstellungen[option] = false;
				ein.checked = false;
			}
			optionen.speichern(false);
		});
		// Label
		let label = document.createElement("label");
		label.setAttribute("for", "optionen-shortcut");
		label.textContent = label_text;
		p.appendChild(label);
		// Absatz zurückgeben
		return p;
	},
};
