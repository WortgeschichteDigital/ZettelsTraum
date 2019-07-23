"use strict";

let optionen = {
	// Speicherort aller Optionen
	// (ausgenommen ist der Fenster-Status, der nur im Main-Prozess steht)
	data: {
		// Status des Hauptfensters
		fenster: {
			x: null,
			y: null,
			width: 1100,
			height: null,
			maximiert: false,
		},
		// Status des Bedeutungsgerüst-Fensters
		"fenster-bedeutungen": {
			x: null,
			y: null,
			width: 650,
			height: 600,
			maximiert: false,
		},
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
			"feld-sy": true,
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
			// Steuerung Details
			detail_bd: false,
			detail_bl: false,
			detail_sy: false,
			detail_qu: false,
			detail_kr: false,
			detail_ts: false,
			detail_no: false,
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
			"quick-programm-neues-fenster": false,
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
			"quick-kartei-bedeutungen-wechseln": false,
			"quick-kartei-bedeutungen-fenster": false,
			"quick-kartei-suche": false,
			"quick-belege-hinzufuegen": false,
			"quick-belege-auflisten": false,
			"quick-belege-sortieren": false,
			"quick-belege-kopieren": false,
			"quick-belege-einfuegen": false,
			// BEDEUTUNGSGERÜST
			// Bedeutungsgerüst nach dem Speichern direkt schließen
			"bedeutungen-schliessen": true,
			// Tagger nach dem Speichern direkt schließen
			"tagger-schliessen": true,
			// XML-Dateien mit Tags sollten automatisch abgeglichen werden
			"tags-auto-abgleich": true,
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
			// untergeordnete Bedeutungen beim Filtern mit einbeziehen
			"filter-unterbedeutungen": true,
			// nicht warnen, wenn eine Karte erstellt wurde, sie aber wegen der Filterregeln nicht angezeigt wird
			"nicht-karte-gefiltert": false,
			// Filter, die standardmäßig geöffnet werden
			"filter-offen-volltext": true,
			"filter-offen-zeitraum": false,
			"filter-offen-bedeutungen": false,
			"filter-offen-wortbildungen": false,
			"filter-offen-synonyme": false,
			"filter-offen-korpora": false,
			"filter-offen-textsorten": false,
			"filter-offen-verschiedenes": false,
			// BELEGLISTE
			// die Icons, die die Anzeige der Datenfelder in der Belegliste steuern, sollen immer an sein
			"anzeige-icons-immer-an": false,
			// Textsorte in den Kopf der Belegliste eintragen
			textsorte: false,
		},
		// Taglisten, die aus XML-Dateien importiert wurden; Aufbau:
		//   TYP         Tag-Typ (String)
		//     abgleich  Datum des letzten Abgleichs (ISO-String)
		//     update    Datum des letzten Updates (ISO-String)
		//     datei     Pfad zur XML-Datei (String)
		//     data      Object
		//       ID      String (numerische ID des Tags)
		//         abbr  String (Abkürzung des Tags)
		//         name  String (der Tag)
		tags: {},
		// beim ersten Programmstart automatisch mit XML-Dateien aus App-Ordner verknüpfen
		"tags-autoload-done": false,
		// Liste mit Personen, die in dem Projekt arbeiten
		// (wird über die Einstellungen geladen)
		personen: [],
		// letzter Pfad, der beim Speichern oder Öffnen einer Datei benutzt wurde
		letzter_pfad: "",
		// zuletzt verwendete Dokumente
		zuletzt: [],
	},
	// Optionen on-the-fly empfangen
	// (wird aufgerufen, wenn in einem anderen Hauptfenster Optionen geändert wurden)
	//   data = Object
	//     (die Optionen, strukturiert wie optionen.data)
	empfangen (data) {
		// Daten bereinigen um alles, was nicht synchronisiert werden soll
		for (let block in data) {
			if (!data.hasOwnProperty(block)) {
				continue;
			}
			if (!/^(fenster|fenster-bedeutungen|einstellungen|tags|personen|letzter_pfad)$/.test(block)) {
				delete data[block];
				// diese Einstellungen werden nicht aus einem anderen Fenster übernommen
				// (das führt nur zu einem unschönen Springen):
				//   * beleg (steuert die Anzeige der Leseansicht der Karteikarte)
				//   * filter (steuert die Einstellungen der Filterleiste)
				//   * belegliste (steuert die Anzeige der Belegliste)
				//   * zuletzt (wird extra behandelt und wenn nötig an alle Renderer-Prozesse geschickt)
			}
		}
		// Daten einlesen
		optionen.einlesen(optionen.data, data);
		// Daten anwenden
		optionen.anwendenEmpfangen();
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
				if (o === "tags") {
					optionen.data.tags = {...opt[o]};
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
		// Tag-Dateien überprüfen => Anzeige auffrischen
		optionen.anwendenTagsInit();
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
		let details = ["bd", "bl", "sy", "qu", "kr", "ts", "no", "meta"];
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
		optionen.anwendenEinstellungen();
	},
	// zieht die nötigen Kosequenzen aus den empfangen Optionen,
	// die in einem anderen Hauptfenster geändert wurden
	anwendenEmpfangen () {
		// Quick-Access-Bar ein- oder ausschalten
		optionen.anwendenQuickAccess();
		// Liste der Tag-Dateien auffrischen
		optionen.anwendenTags();
		// Icons für die Detailanzeige immer sichtbar?
		optionen.anwendenIconsDetails();
		// Optionen im Optionen-Fenster eintragen
		optionen.anwendenEinstellungen();
	},
	// die Einstellungen im Einstellungen-Fenster nach dem empfangen von Optionen anpassen
	anwendenEinstellungen () {
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
			optionen.speichern();
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
	// bekannte Typen von Tag-Dateien
	tagsTypen: {
		regiolekte: ["Regiolekt", "Regiolekte"],
		register: ["Register", "Register"],
		sachgebiete: ["Sachgebiet", "Sachgebiete"],
		soziolekte: ["Soziolekt", "Soziolekte"],
		sprachen: ["Sprache", "Sprachen"],
	},
	// Check der Tag-Dateien beim Starten der App
	anwendenTagsInit () {
		if (!optionen.data["tags-autoload-done"]) { // Tag-Dateien aus app/resources laden
			optionen.tagsAutoLaden();
		} else { // verknüpfte Tag-Dateien überprüfen
			if (!optionen.data.einstellungen["tags-auto-abgleich"]) {
				optionen.anwendenTags();
				return;
			}
			let promises = [];
			for (let typ in optionen.data.tags) {
				if (!optionen.data.tags.hasOwnProperty(typ)) {
					continue;
				}
				promises.push(optionen.tagsCheckLaden({
					typ: typ,
					datei: optionen.data.tags[typ].datei,
				}));
			}
			Promise.all(promises).then((result) => {
				if (result.includes(true)) { // wenn mindestens eine Datei normal überprüft wurde
					optionen.speichern();
				}
				optionen.anwendenTags();
			});
		}
	},
	// Informationen zu den Tag-Dateien im Einstellungen-Fenster auffrischen
	anwendenTags () {
		let cont = document.getElementById("tags-cont");
		helfer.keineKinder(cont);
		// Tabelle erstellen
		let table = document.createElement("table");
		cont.appendChild(table);
		for (let typ in optionen.data.tags) {
			if (!optionen.data.tags.hasOwnProperty(typ)) {
				continue;
			}
			// Lösch-Icon
			let tr = document.createElement("tr");
			table.appendChild(tr);
			tr.classList.add("tags-datei");
			let td = document.createElement("td");
			tr.appendChild(td);
			td.setAttribute("rowspan", "2");
			let a = document.createElement("a");
			td.appendChild(a);
			a.href = "#";
			a.classList.add("icon-link", "icon-loeschen");
			a.dataset.typ = typ;
			optionen.tagsLoeschen(a);
			// Reload-Icon
			td = document.createElement("td");
			tr.appendChild(td);
			td.setAttribute("rowspan", "2");
			a = document.createElement("a");
			td.appendChild(a);
			a.href = "#";
			a.classList.add("icon-link", "icon-reload");
			a.dataset.typ = typ;
			optionen.tagsManuCheck(a);
			// Datei-Pfad
			td = document.createElement("td");
			tr.appendChild(td);
			td.setAttribute("dir", "rtl");
			const pfad = `\u200E${optionen.data.tags[typ].datei}\u200E`; // vgl. meta.oeffnen()
			td.textContent = pfad;
			td.title = pfad;
			// Fehler-Markierung
			if (optionen.tagsFehlerMeldungen[typ]) {
				let img = document.createElement("img");
				td.insertBefore(img, td.firstChild);
				img.dataset.typ = typ;
				img.src = "img/fehler.svg";
				img.width = "24";
				img.height = "24";
				optionen.tagsFehlerKlick(img);
			}
			// Sub-Tabelle
			// (blöder Hack, aber anders geht das irgendwie nicht)
			tr = document.createElement("tr");
			table.appendChild(tr);
			td = document.createElement("td");
			tr.appendChild(td);
			let tableSub = document.createElement("table");
			td.appendChild(tableSub);
			let trSub = document.createElement("tr");
			tableSub.appendChild(trSub);
			// Anzahl
			let tdSub = document.createElement("td");
			trSub.appendChild(tdSub);
			a = document.createElement("a");
			tdSub.appendChild(a);
			a.dataset.typ = typ;
			a.href = "#";
			const len = Object.keys(optionen.data.tags[typ].data).length;
			let text;
			if (!optionen.tagsTypen[typ]) {
				text = len === 1 ? "Tag" : "Tags";
			} else {
				let typen = optionen.tagsTypen[typ];
				text = len === 1 ? typen[0] : typen[1];
			}
			a.textContent = `${len} ${text}`;
			optionen.tagsAnzeigen(a);
			// Daten
			tdSub = document.createElement("td");
			trSub.appendChild(tdSub);
			let i = document.createElement("i");
			tdSub.appendChild(i);
			i.textContent = "Abgleich:";
			let datum = helfer.datumFormat(optionen.data.tags[typ].abgleich);
			tdSub.appendChild(document.createTextNode(datum));
			tdSub.appendChild(document.createElement("br"));
			i = document.createElement("i");
			tdSub.appendChild(i);
			i.textContent = "Update:";
			datum = helfer.datumFormat(optionen.data.tags[typ].update);
			tdSub.appendChild(document.createTextNode(datum));
		}
		// keine Tag-Dateien vorhanden
		if (!table.hasChildNodes()) {
			let tr = document.createElement("tr");
			table.appendChild(tr);
			let td = document.createElement("td");
			tr.appendChild(td);
			td.classList.add("tags-leer");
			td.textContent = "keine Tag-Dateien";
		}
	},
	// Tag-Dateien aus app/resources laden
	tagsAutoLaden () {
		// Programm-Pfad ermittelns
		const {app} = require("electron").remote,
			path = require("path");
		let basis = "";
		// getAppPath() funktioniert nur in der nicht-paketierten App, in der paketierten
		//   zeigt es auf [Installationsordner]/resources/app.asar;
		// getPath("exe") funktioniert nur in der paktierten Version, allerdings muss
		//   noch der Name der ausführbaren Datei entfernt werden; in der nicht-paketierten
		//   App zeigt es auf die ausführbare Datei des Node-Modules
		if (app.isPackaged) {
			let reg = new RegExp(`${helfer.escapeRegExp(path.sep)}zettelstraum(\.exe)*$`);
			basis = app.getPath("exe").replace(reg, "");
		} else {
			basis = app.getAppPath();
		}
		// XML-Dateien ermitteln => Dateien überprüfen + laden
		let xml = [],
			promises = [];
		new Promise((resolve, reject) => {
			let config = {
				encoding: "utf8",
				withFileTypes: true,
			};
			const fs = require("fs");
			fs.readdir(`${basis}/resources`, config, function(err, dateien) {
				if (err) {
					reject(false);
					return;
				}
				for (let dirent of dateien) {
					if (dirent.isFile() && /\.xml$/.test(dirent.name)) {
						xml.push(dirent.name);
					}
				}
				resolve(true);
			});
		})
			.then(() => {
				xml.forEach(function(i) {
					promises.push(optionen.tagsCheckLaden({
						datei: path.join(basis, "resources", i),
					}));
				});
				Promise.all(promises).then(() => {
					optionen.speichern();
					optionen.anwendenTags();
					optionen.data["tags-autoload-done"] = true;
				});
			})
			.catch(() => optionen.anwendenTags());
	},
	// übergebene Tag-Datei überprüfen, Inhalte ggf. laden
	//   datei = String
	//     (Pfad zur XML-Datei, die überprüft werden soll)
	//   typ = String || undefined
	//     (Typ der Datei, entspricht dem Namen des Wurzelelements)
	tagsCheckLaden ({datei, typ = "-"}) {
		return new Promise((resolve) => {
			const fs = require("fs");
			fs.readFile(datei, "utf-8", (err, content) => {
				// Fehlermeldung (wahrscheinlich existiert die Datei nicht mehr)
				if (err) {
					optionen.tagsFehlerMeldungen[typ] = err.message;
					resolve(false);
					return;
				}
				// Datei parsen
				let parsed = optionen.tagsParsen(content),
					xml = parsed[0];
				if (!xml) {
					resolve(false);
					return;
				}
				// ggf. Typ ermitteln, Konsistenz des Typs überprüfen
				const xmlTyp = parsed[1];
				if (typ === "-") {
					typ = xmlTyp;
				} else if (typ !== xmlTyp) {
					optionen.tagsFehlerMeldungen[typ] = `<abbr title="Extensible Markup Language">XML</span>-Dateityp geändert`;
					resolve(false);
					return;
				}
				// Items auslesen
				let tagsNeu = {},
					update = false;
				xml.querySelectorAll("item").forEach(function(i) {
					const id = i.querySelector("id").firstChild.nodeValue,
						name = i.querySelector("name").firstChild.nodeValue;
					let abbr = i.querySelector("abbr");
					tagsNeu[id] = {
						name: name,
					};
					if (abbr) {
						tagsNeu[id].abbr = abbr.firstChild.nodeValue;
					}
				});
				// Einlesen
				if (optionen.data.tags[typ]) { // Typ existiert => Änderungen ggf. übernehmen
					let data = optionen.data.tags[typ].data;
					for (let id in data) { // veraltete Einträge löschen
						if (!data.hasOwnProperty(id)) {
							continue;
						}
						if (!tagsNeu[id]) {
							update = true;
							delete data[id];
						}
					}
					for (let id in tagsNeu) { // neue Einträge anlegen, geänderte auffrischen
						if (!tagsNeu.hasOwnProperty(id)) {
							continue;
						}
						if (!data[id] ||
								data[id].name !== tagsNeu[id].name ||
								data[id].abbr !== tagsNeu[id].abbr) {
							update = true;
							data[id] = {
								name: tagsNeu[id].name
							};
							if (tagsNeu[id].abbr) {
								data[id].abbr = tagsNeu[id].abbr;
							}
						}
					}
				} else { // Typ existiert noch nicht => einrichten
					update = true;
					optionen.data.tags[typ] = {
						data: tagsNeu, // Daten
						datei: datei, // Pfad zur Datei
						abgleich: "", // Datum letzter Abgleich
						update: "", // Datum letztes Update
					};
				}
				// Datum Abgleich speichern
				optionen.data.tags[typ].abgleich = new Date().toISOString();
				if (update) {
					optionen.data.tags[typ].update = new Date().toISOString();
				}
				// Promise auflösen
				resolve(true);
			});
		});
	},
	// ausgewählte Tag-Liste manuell überprüfen
	//   a = Element
	//     (Reload-Icon)
	tagsManuCheck (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const typ = this.dataset.typ;
			optionen.tagsCheckLaden({
				datei: optionen.data.tags[typ].datei,
				typ: typ,
			})
				.then(result => {
					if (result === true) { // Datei wurde normal überprüft
						optionen.speichern();
					}
					optionen.anwendenTags();
				});
		});
	},
	// Tag-Datei manuell laden
	tagsManuLaden () {
		const {app, dialog} = require("electron").remote;
		let opt = {
			title: "Tag-Datei laden",
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
		dialog.showOpenDialog(null, opt, datei => { // datei ist ein Array!
			if (datei === undefined) {
				kartei.dialogWrapper("Sie haben keine Datei ausgewählt.");
				return;
			}
			const fs = require("fs");
			fs.readFile(datei[0], "utf-8", (err, content) => {
				// Fehlermeldung
				if (err) {
					kartei.dialogWrapper(`Beim Laden der Tag-Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`);
					return;
				}
				// Tag-Datei parsen
				let parsed = optionen.tagsParsen(content),
					xml = parsed[0],
					typ = parsed[1];
				if (!xml) {
					optionen.tagsFehler(typ);
					return;
				}
				// Tag-Datei einlesen
				optionen.data.tags[typ] = {
					data: {}, // Daten
					datei: datei[0], // Pfad zur Datei
					abgleich: new Date().toISOString(), // Datum letzter Abgleich
					update: new Date().toISOString(), // Datum letztes Update
				};
				let data = optionen.data.tags[typ].data;
				xml.querySelectorAll("item").forEach(function(i) {
					const id = i.querySelector("id").firstChild.nodeValue,
						name = i.querySelector("name").firstChild.nodeValue;
					let abbr = i.querySelector("abbr");
					data[id] = {
						name: name,
					};
					if (abbr) {
						data[id].abbr = abbr.firstChild.nodeValue;
					}
				});
				// Optionen speichern
				optionen.speichern();
				// Anzeige auffrischen
				optionen.anwendenTags();
			});
		});
	},
	// Content der geladenen Tag-Datei parsen und auf Fehler überprüfen
	//   content = String
	//     (Inhalt der geladenen Tag-Datei)
	tagsParsen (content) {
		let parser = new DOMParser(),
			xml = parser.parseFromString(content, "text/xml"),
			typ = xml.documentElement.nodeName;
		// <parsererror>
		if (xml.querySelector("parsererror")) {
			optionen.tagsFehlerMeldungen[typ] = `<abbr title="Extensible Markup Language">XML</span>-Datei korrupt`;
			return [null, typ];
		}
		// kein <item>
		if (!xml.querySelector("item")) {
			optionen.tagsFehlerMeldungen[typ] = "unerwartetes Dateiformat";
			return [null, typ];
		}
		// Strukturtests
		let tag_fehlt = "",
			tag_doppelt = "",
			tag_unbekannt = "",
			ids = new Set(),
			ids_doppelt = [],
			names = new Set(),
			names_doppelt = [],
			abbrs = new Set(),
			abbrs_doppelt = [];
		forX: for (let i of xml.querySelectorAll("item")) {
			// fehlende Tags, die verpflichtend sind
			if (!i.querySelector("id")) {
				tag_fehlt = "id";
				break;
			} else if (!i.querySelector("name")) {
				tag_fehlt = "name";
				break;
			}
			// doppelt vergebene ID?
			let id = i.querySelector("id").firstChild.nodeValue;
			if (ids.has(id)) {
				ids_doppelt.push(id);
			} else {
				ids.add(id);
			}
			// doppelt vergebener Name?
			let name = i.querySelector("name").firstChild.nodeValue;
			if (names.has(name)) {
				names_doppelt.push(name);
			} else {
				names.add(name);
			}
			// doppelt vergebene Abkürzung?
			if (i.querySelector("abbr")) {
				let abbr = i.querySelector("abbr").firstChild.nodeValue;
				if (abbrs.has(abbr)) {
					abbrs_doppelt.push(abbr);
				} else {
					abbrs.add(abbr);
				}
			}
			// doppelte eingefügte oder unbekannte Elemente?
			let elemente = new Set();
			for (let k of i.childNodes) {
				if (k.nodeType !== 1) {
					continue;
				}
				const knoten = k.nodeName;
				if (!["abbr", "id", "name"].includes(knoten)) {
					tag_unbekannt = knoten;
					break forX;
				} else if (elemente.has(knoten)) {
					tag_doppelt = knoten;
					break forX;
				}
				elemente.add(knoten);
			}
		}
		// Fehlerbehandlung
		if (tag_fehlt) {
			optionen.tagsFehlerMeldungen[typ] = `fehlender &lt;${tag_fehlt}&gt;-Tag`;
			return [null, typ];
		}
		if (tag_doppelt) {
			optionen.tagsFehlerMeldungen[typ] = `doppelter &lt;${tag_doppelt}&gt;-Tag`;
			return [null, typ];
		}
		if (tag_unbekannt) {
			optionen.tagsFehlerMeldungen[typ] = `unbekannter &lt;${tag_unbekannt}&gt;-Tag`;
			return [null, typ];
		}
		if (ids_doppelt.length) {
			ids_doppelt = [...new Set(ids_doppelt)];
			let plural = "s";
			if (ids_doppelt.length === 1) {
				plural = "";
			}
			optionen.tagsFehlerMeldungen[typ] = `doppelte ID${plural}: ${ids_doppelt.join(", ")}`;
			return [null, typ];
		}
		if (names_doppelt.length) {
			names_doppelt = [...new Set(names_doppelt)];
			let text = "doppelte Namen: ";
			if (names_doppelt.length === 1) {
				text = "doppelter Name: ";
			}
			optionen.tagsFehlerMeldungen[typ] = text + names_doppelt.join(", ");
			return [null, typ];
		}
		if (abbrs_doppelt.length) {
			abbrs_doppelt = [...new Set(abbrs_doppelt)];
			let text = "doppelte Abkürzungen: ";
			if (abbrs_doppelt.length === 1) {
				text = "doppelte Abkürzung: ";
			}
			optionen.tagsFehlerMeldungen[typ] = text + abbrs_doppelt.join(", ");
			return [null, typ];
		}
		// alles okay => alte Fehler-Meldungen ggf. entfernen + XML-Dokument zurückgeben
		if (optionen.tagsFehlerMeldungen[typ]) {
			delete optionen.tagsFehlerMeldungen[typ];
		}
		return [xml, typ];
	},
	// Fehlertypen, die beim Einlesen einer Tag-Datei aufgetreten sind
	tagsFehlerMeldungen: {},
	// Listener für die Fehler-Markierung
	tagsFehlerKlick (img) {
		img.addEventListener("click", function() {
			optionen.tagsFehler(this.dataset.typ);
		});
	},
	// Fehlermeldung anzeigen
	//   typ = String
	//     (Typ der Tag-Datei, bei der der Fehler aufgetreten ist)
	tagsFehler (typ) {
		dialog.oeffnen("alert");
		dialog.text(`Beim Laden der Tag-Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${optionen.tagsFehlerMeldungen[typ]}</p>`);
	},
	// Tag-Datei entfernen, Liste der Tags leeren
	//   a = Element
	//     (Lösch-Icon, auf das geklickt wurde)
	tagsLoeschen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const typ = this.dataset.typ;
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					delete optionen.data.tags[typ];
					optionen.speichern();
					optionen.anwendenTags();
				}
			});
			let text = ["Tags", "Tag"];
			if (optionen.tagsTypen[typ]) {
				text = Array(2).fill(optionen.tagsTypen[typ][1]);
			}
			dialog.text(`Sollen die importierten ${text[0]} wirklich gelöscht werden?\n(Die Verknüpfung mit der ${text[1]}-Datei wird in diesem Zuge ebenfalls entfernt.)`);
		});
	},
	// Liste der geladenen Tags anzeigen
	//   a = Element
	//     (Anker, auf den geklickt wurde)
	tagsAnzeigen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const typ = this.dataset.typ;
			let tags = [];
			for (let id in optionen.data.tags[typ].data) {
				if (!optionen.data.tags[typ].data.hasOwnProperty(id)) {
					continue;
				}
				tags.push(optionen.data.tags[typ].data[id].name);
			}
			tags.sort(helfer.sortAlpha);
			let h3 = "Tags";
			if (optionen.tagsTypen[typ]) {
				h3 = optionen.tagsTypen[typ][1];
			}
			dialog.oeffnen("alert");
			dialog.text(`<h3>${h3}</h3>\n<div class="dialog-tags-liste"></div>`);
			let liste = document.querySelector(".dialog-tags-liste");
			for (let tag of tags) {
				let p = document.createElement("p");
				p.textContent = tag;
				liste.appendChild(p);
			}
		});
	},
	// Optionen an den Main-Prozess schicken, der sie dann speichern soll
	// (der Main-Prozess setzt einen Timeout, damit das nicht zu häufig geschieht)
	speichern () {
		const {ipcRenderer, remote} = require("electron");
		ipcRenderer.send("optionen-speichern", optionen.data, remote.getCurrentWindow().id);
	},
	// letzten Pfad speichern
	aendereLetzterPfad () {
		const path = require("path");
		let reg = new RegExp(`^.+\\${path.sep}`);
		const pfad = kartei.pfad.match(reg)[0];
		optionen.data.letzter_pfad = pfad;
		optionen.speichern();
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
		optionen.speichern();
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
				let personen = content.split(/(\r|\n)/); // alle End-of-line-Styles berücksichtigen
				for (let i = 0, len = personen.length; i < len; i++) {
					const person = personen[i].trim();
					if (person) {
						optionen.data.personen.push(person);
					}
				}
				optionen.speichern();
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
		ele.addEventListener("input", function() {
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
		// ggf. Konsequenzen on-the-fly
		if (/^quick/.test(e)) { // Quick-Access-Bar umgestellt
			optionen.anwendenQuickAccess();
		} else if (e === "filter-unterbedeutungen") { // Verhalten Bedeutungen-Filter umgestellt
			liste.status(true);
		}
		// Optionen speichern
		optionen.speichern();
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
			optionen.speichern();
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
