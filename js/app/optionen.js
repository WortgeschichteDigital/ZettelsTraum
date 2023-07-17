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
			// Dichte der Zeitschnitte oder Zeitschnitte ausblenden
			// mögliche Werte: "10", "50", "100", "-" (keine Schnitte anzeigen)
			zeitschnitte: "-",
		},
		// Einstellungen-Dialog
		einstellungen: {
			// ALLGEMEINES
			// für diesen Computer registrierte BearbeiterIn
			bearbeiterin: "",
			// Timeout für Anfrage an das DTA in Sekunden
			// (einfacher als String, wird bei Bedarf in Number konvertiert)
			timeout: "10",
			// Karteien unter zuletzt verwendet
			zuletzt: "20",
			// automatisch nach Software-Update suchen
			"updates-suche": true,
			// helle Elemente dunkler darstellen
			"helle-dunkler": false,
			// legt das Verhalten von Kartei > Speichern fest
			//   1 = Speicherkaskade
			//   2 = nur aktive Funktion speichern
			//   3 = nur Kartei speichern
			speichern: "1",
			// Icons im Fensterkopf
			"kopf-icon-erinnerungen": true,
			"kopf-icon-ordner": true,
			"kopf-icon-redaktion": true,
			"kopf-icon-notizen": true,
			"kopf-icon-lexika": true,
			"kopf-icon-anhaenge": true,
			// KOPIEREN
			// Hervorhebung des Karteiworts beim Kopieren von Text mitkopieren
			"textkopie-wort": false,
			// Hervorhebung der Annotierungen beim Kopieren von Text mitkopieren
			"textkopie-annotierung": false,
			// beim Kopieren sind Karteiwort/Markierung grau hinterlegt
			"textkopie-wort-hinterlegt": false,
			// beim Kopieren das Jahr als Überschrift ergänzen
			"textkopie-h-jahr": true,
			// beim Kopieren die ID als Überschrift ergänzen
			"textkopie-h-id": false,
			// Autor und Titel von Zeitungsbelegen beim Erstellen eines XML-Snippets löschen
			"textkopie-xml-zeitungen": true,
			// beim Kopieren den Inhalt von Streichungen erhalten
			"textkopie-klammern-streichung": false,
			// beim Kopieren den Inhalt von Löschungen erhalten
			"textkopie-klammern-loeschung": false,
			// beim Kopieren Streichung, Löschung und Autorenzusatz einfärben
			"textkopie-klammern-farbe": false,
			// Notizen mitkopieren
			"textkopie-notizen": false,
			// Vorauswahl für Kopierfenster ohne Nachfrage ausführen
			"ctrlC-auto": false,
			// Vorauswahl für Kopierfenster
			//   1 = HTML und Plain
			//   2 = Plain-Referenz
			//   3 = XML-Belegschnitt
			//   4 = XML-Referenz
			//   5 = XML-Fenster
			"ctrlC-vor": "1",
			// Einfügen-Fenster (Kopierfunktion) nach dem Einfügen direkt schließen
			"einfuegen-schliessen": true,
			// LITERATUR
			// Verlag importieren
			"literatur-verlag": false,
			// Serie importieren
			"literatur-serie": false,
			// MENÜ
			// Menü-Leiste ausblenden (einblenden, wenn Alt gedruckt)
			autoHideMenuBar: false,
			// Quick-Access-Bar anzeigen
			quick: false,
			// Icons in der Quick-Access-Bar
			"quick-icons": [...quick.iconsStandard],
			// NOTIZEN
			// Notizen-Fenster nach dem Speichern direkt schließen
			"notizen-schliessen": false,
			// Notizen in der Filterleiste anzeigen
			"notizen-filterleiste": false,
			// Notizen in der Filterleiste standardmäßig öffnen
			"filter-offen-notizen": true,
			// maximale Breite des Notizen-Fensters
			"notizen-max-breite": 650,
			// BEDEUTUNGSGERÜST
			// Bedeutungsgerüst nach dem Speichern direkt schließen
			"bedeutungen-schliessen": false,
			// Tagger nach dem Speichern direkt schließen
			"tagger-schliessen": false,
			// XML-Dateien mit Tags sollten automatisch abgeglichen werden
			"tags-auto-abgleich": true,
			// KARTEIKARTE
			// Karteikarte nach dem Speichern direkt schließen
			"karteikarte-schliessen": false,
			// keine Fehlermeldung anzeigen, wenn die Karteikarte nicht gespeichert werden konnte
			"karteikarte-keine-fehlermeldung": false,
			// neue Karteikarten als unvollständig markieren
			unvollstaendig: false,
			// in neuer Karteikarte Belegfeld fokussieren
			"karteikarte-fokus-beleg": false,
			// Textfeld immer ergänzen, wenn aus einem Dropdown-Menü ein Wert
			// ausgewählt wurde (betrifft Bedeutung und Textsorte)
			"immer-ergaenzen": false,
			// beim Fokussieren des DTA-Import-Feldes automatisch die URL aus dem Clipboard eintragen
			"url-eintragen": true,
			// DWDS-Snippets, die aus dem DTA stammen, ohne Nachfrage direkt aus dem DTA importieren
			"dta-bevorzugen": false,
			// bei Zeitungskorpora Namen in die erste Zeile der Notizen schreiben
			"notizen-zeitung": false,
			// nach Text-Import überprüfen, ob das Karteiwort im Belegtext gefunden werden kann
			"wort-check": true,
			// bei der Überprüfung nach Text-Import Wörter mit einbeziehen, die nur markiert werden sollen
			"wort-check-nur-markieren": false,
			// nach dem Import den Inhalt der Zwischenablage löschen
			"karteikarte-clear-clipboard": false,
			// nach dem Import Absätze ohne Stichwort automatisch löschen
			"karteikarte-text-kuerzen-auto": false,
			// Kontext beim Löschen der Absätze ohne Stichwort teilweise erhalten
			"karteikarte-text-kuerzen-kontext": false,
			// bestehende Karteikarten in der Leseansicht öffnen
			leseansicht: true,
			// FILTERLEISTE
			// alle anderen Filterblöcke zuklappen, wenn ein Filterblock geöffnet wird
			"filter-zuklappen": false,
			// inaktive Filterblöcke nach dem Neuaufbau der Filterleiste automatisch zuklappen
			"filter-inaktive": false,
			// untergeordnete Bedeutungen beim Filtern mit einbeziehen
			"filter-unterbedeutungen": true,
			// Belge, die nur Annotierungen mit transparenter Hintergrundfarbe haben, ebenfalls mit einbeziehen
			"filter-transparente": false,
			// nicht warnen, wenn eine Karte erstellt wurde, sie aber wegen der Filterregeln nicht angezeigt wird
			"nicht-karte-gefiltert": false,
			// Filter, die standardmäßig geöffnet werden
			"filter-offen-volltext": true,
			"filter-offen-zeitraum": false,
			"filter-offen-kartendatum": false,
			"filter-offen-bedeutungen": false,
			"filter-offen-wortbildungen": false,
			"filter-offen-synonyme": false,
			"filter-offen-korpora": false,
			"filter-offen-textsorten": false,
			"filter-offen-verschiedenes": false,
			// BELEGLISTE
			// die Icons, die die Anzeige der Datenfelder in der Belegliste steuern, sollen immer an sein
			"anzeige-icons-immer-an": false,
			// neben dem Belegtext soll ein Buchungs-Icon angezeigt werden
			"belegliste-buchungsicon": false,
			// Belegreferenz (ID des Belegs) in den Kopf der Belegliste eintragen
			"belegliste-referenz": false,
			// Markierung (Sterne) in den Kopf der Belegliste eintragen
			"belegliste-mark": true,
			// Notiz in den Kopf der Belegliste eintragen
			"belegliste-notizen": false,
			// Textsorte in den Kopf der Belegliste eintragen
			textsorte: false,
		},
		// Einstellungen für die Karteisuche
		karteisuche: {
			pfade: [], // Pfade, in denen gesucht wird
			filter: [], // Filter, die zuletzt verwendet wurden
			tiefe: 2, // Suchtiefe, also Anzahl der Ordner, die in der Tiefe gesucht wird
		},
		// Vorlagen für das Exportfenster der Karteisuche
		"karteisuche-export-vorlagen": [],
		// Datenfelder im Einfüge-Fenster der Kopierfunktion
		kopieren: {
			an: true, // Anhänge
			au: true, // Autor
			bc: false, // Buchung
			bd: true, // Bedeutung
			be: false, // Markierung
			bl: true, // Wortbildung
			bs: true, // Beleg
			bu: false, // Bücherdienst
			da: true, // Datum
			ko: false, // Kontext?
			kr: true, // Korpus
			mt: true, // Metatext
			no: true, // Notizen
			qu: true, // Quelle
			sy: true, // Synonym
			ts: true, // Textsorte
			un: false, // unvollständig
			up: false, // ungeprüft
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
		// Variablen für das Suchen nach Updates
		updates: {
			checked: "", // ISO-String: Datum, an dem zuletzt nach Updates gesucht wurde
			online: "", // Versionsnummer der App, die online steht
		},
		// zuletzt verwendete Karteien
		zuletzt: [],
		// Pfad zur Literaturdatenbank
		"literatur-db": "",
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
			if (!/^(fenster|fenster-bedeutungen|einstellungen|kopieren|tags|personen|letzter_pfad|literatur-db)$/.test(block)) {
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
		// Quick-Access-Bar auffrischen
		quick.fill();
		quick.fillConfig();
		quick.toggle();
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
		// Farbe sehr heller Elemente anpassen
		optionen.anwendenHelleDunkler();
		// Icons im <caption> der Karteikarte
		beleg.ctrlKuerzenAnzeige();
		beleg.ctrlTrennungAnzeige();
		// maximale Breite des Notizen-Fensters
		optionen.anwendenNotizenMaxBreite();
		// Optionen im Optionen-Fenster eintragen
		optionen.anwendenEinstellungen();
	},
	// zieht die nötigen Kosequenzen aus den empfangen Optionen,
	// die in einem anderen Hauptfenster geändert wurden
	anwendenEmpfangen () {
		// Quick-Access-Bar auffrischen
		quick.fill();
		quick.fillConfig();
		quick.toggle();
		// Liste der Tag-Dateien auffrischen
		optionen.anwendenTags();
		// Icons für die Detailanzeige immer sichtbar?
		optionen.anwendenIconsDetails();
		// Farbe sehr heller Elemente anpassen
		optionen.anwendenHelleDunkler();
		// maximale Breite des Notizen-Fensters
		optionen.anwendenNotizenMaxBreite();
		// Optionen im Optionen-Fenster eintragen
		optionen.anwendenEinstellungen();
		// ggf. Update-Hinweis einblenden
		updates.hinweis();
	},
	// die Einstellungen im Einstellungen-Fenster nach dem Empfangen von Optionen anpassen
	anwendenEinstellungen () {
		let ee = document.querySelectorAll("#einstellungen input");
		for (let i = 0, len = ee.length; i < len; i++) {
			let e = ee[i].id.replace(/^einstellung-/, "");
			if (ee[i].type === "checkbox") {
				ee[i].checked = optionen.data.einstellungen[e] ? true : false;
			} else if (ee[i].type === "text" || ee[i].type === "number") {
				ee[i].value = optionen.data.einstellungen[e] || "";
			}
		}
		// Kartei > Speichern anwenden
		document.getElementsByName("einstellung-speichern").forEach(i => {
			if (i.value === optionen.data.einstellungen.speichern) {
				i.checked = true;
			} else {
				i.checked = false;
			}
		});
		// Vorauswahl Kopierfenster anwenden
		document.getElementsByName("einstellung-ctrlC-vor").forEach(i => {
			if (i.value === optionen.data.einstellungen["ctrlC-vor"]) {
				i.checked = true;
			} else {
				i.checked = false;
			}
		});
	},
	// die Anzeige der Notizen in der Filterleiste wird umgestellt
	//   input = Element
	//     (die zugehörige Checkbox in den Einstellungen)
	anwendenNotizenFilterleiste (input) {
		input.addEventListener("change", function() {
			if (this.checked) {
				notizen.filterleiste();
			} else {
				notizen.filterleisteEntfernen();
			}
		});
	},
	// Breite des Notizen-Fensters anpassen
	anwendenNotizenMaxBreite () {
		const breite = optionen.data.einstellungen["notizen-max-breite"];
		document.querySelector("#notizen > div").style.maxWidth = `${breite}px`;
	},
	// Icons für die Detail-Anzeige im Kopf der Belegliste ggf. immer sichtbar (Listener)
	//   input = Element
	//     (die zugehörige Checkbox in den Einstellungen)
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
	// Farbe sehr heller Elemente anpassen (Listener)
	anwendenHelleDunklerListener (input) {
		input.addEventListener("change", function() {
			optionen.data.einstellungen["helle-dunkler"] = this.checked;
			optionen.speichern();
			optionen.anwendenHelleDunkler();
		});
	},
	// Farbe sehr heller Elemente anpassen
	anwendenHelleDunkler () {
		if (optionen.data.einstellungen["helle-dunkler"]) {
			document.documentElement.classList.add("dunkler");
		} else {
			document.documentElement.classList.remove("dunkler");
		}
	},
	// bekannte Typen von Tag-Dateien
	tagsTypen: {
		gebrauchszeitraum: ["Gebrauchszeitraum", "Gebrauchszeiträume"],
		regiolekte: ["Regiolekt", "Regiolekte"],
		register: ["Register", "Register"],
		sachgebiete: ["Sachgebiet", "Sachgebiete"],
		soziolekte: ["Soziolekt", "Soziolekte"],
		sprachen: ["Sprache", "Sprachen"],
		standardvarietät: ["Standardvarietät", "Standardvarietäten"],
		themenfelder: ["Themenfeld", "Themenfelder"],
	},
	// Check der Tag-Dateien beim Starten der App
	async anwendenTagsInit () {
		if (!optionen.data["tags-autoload-done"]) { // Tag-Dateien aus app/resources laden
			optionen.tagsAutoLaden();
		} else { // Informationen zu den verknüpften Tag-Dateien anzeigen
			optionen.anwendenTags();
			// keinen Tag-Dateien-Abgleich durchführen
			if (!optionen.data.einstellungen["tags-auto-abgleich"]) {
				return;
			}
			// Wurde in dieser Session schon ein Tag-Dateien-Abgleich gemacht?
			const {ipcRenderer} = require("electron"),
				abgleich = await ipcRenderer.invoke("optionen-tag-dateien-abgleich");
			if (!abgleich) {
				return;
			}
			// Tag-Dateien abgleichen
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
	//   check = true || undefined
	//     (eine der Tag-Dateien wurde manuell überprüft)
	//   checkTyp = String || undefined
	//     (der Typ der Tag-Datei, der manuell überprüft wurde)
	anwendenTags (check = false, checkTyp = "") {
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
			if (check && checkTyp === typ) {
				optionen.anwendenTagsAnimation(a);
			}
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
				img.src = "img/x-dick-rot.svg";
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
			let datum = helfer.datumFormat(optionen.data.tags[typ].abgleich, "minuten");
			tdSub.appendChild(document.createTextNode(datum));
			tdSub.appendChild(document.createElement("br"));
			i = document.createElement("i");
			tdSub.appendChild(i);
			i.textContent = "Update:";
			datum = helfer.datumFormat(optionen.data.tags[typ].update, "minuten");
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
	// Animation des Reload-Links nach der manuellen Überprüfung einer Tag-Datei
	//   a = Element
	//     (Reload-Icon)
	anwendenTagsAnimation (a) {
		a.addEventListener("animationend", function() {
			this.classList.remove("rotieren-bitte");
		});
		setTimeout(() => a.classList.add("rotieren-bitte"), 250);
	},
	// Tag-Dateien aus app/resources laden
	tagsAutoLaden () {
		// Resources-Pfad ermitteln
		let resources = process.resourcesPath;
		if (/node_modules/.test(resources)) {
			// App ist nicht paketiert => resourcesPath zeigt auf die resources von Electron
			resources = `${resources.replace(/node_modules.+/, "")}resources`;
		}
		// XML-Dateien ermitteln => Dateien überprüfen + laden
		let xml = [],
			promises = [];
		const fsP = require("fs").promises;
		fsP.readdir(resources, {withFileTypes: true})
			.then(dateien => {
				for (let dirent of dateien) {
					if (dirent.isFile() && /\.xml$/.test(dirent.name)) {
						xml.push(dirent.name);
					}
				}
				const path = require("path");
				xml.forEach(i => {
					promises.push(optionen.tagsCheckLaden({
						datei: path.join(resources, i),
					}));
				});
				Promise.all(promises).then(() => {
					optionen.speichern();
					optionen.anwendenTags();
					optionen.data["tags-autoload-done"] = true;
				});
			})
			.catch(err => {
				optionen.anwendenTags();
				throw err;
			});
	},
	// übergebene Tag-Datei überprüfen, Inhalte ggf. laden
	//   datei = String
	//     (Pfad zur XML-Datei, die überprüft werden soll)
	//   typ = String || undefined
	//     (Typ der Datei, entspricht dem Namen des Wurzelelements)
	tagsCheckLaden ({datei, typ = "-"}) {
		return new Promise((resolve) => {
			const fsP = require("fs").promises;
			fsP.readFile(datei, {encoding: "utf8"})
				.then(content => {
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
				})
				.catch(err => {
					// Fehlermeldung (wahrscheinlich existiert die Datei nicht mehr)
					optionen.tagsFehlerMeldungen[typ] = `${err.name}: ${err.message}`;
					resolve(false);
					throw err;
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
					optionen.anwendenTags(true, typ);
				});
		});
	},
	// Tag-Datei manuell laden
	async tagsManuLaden () {
		let opt = {
			title: "Tag-Datei laden",
			defaultPath: appInfo.documents,
			filters: [
				{
					name: "XML-Dateien",
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
		const {ipcRenderer} = require("electron");
		let result = await ipcRenderer.invoke("datei-dialog", {
			open: true,
			winId: winInfo.winId,
			opt: opt,
		});
		// Fehler oder keine Datei ausgewählt
		if (result.message || !Object.keys(result).length) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) {
			return;
		}
		// Datei laden
		const fsP = require("fs").promises;
		fsP.readFile(result.filePaths[0], {encoding: "utf8"})
			.then(content => {
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
					datei: result.filePaths[0], // Pfad zur Datei
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
			})
			.catch(err => {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Laden der Tag-Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
				});
				throw err;
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
		dialog.oeffnen({
			typ: "alert",
			text: `Beim Laden der Tag-Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${optionen.tagsFehlerMeldungen[typ]}</p>`,
		});
	},
	// Tag-Datei entfernen, Liste der Tags leeren
	//   a = Element
	//     (Lösch-Icon, auf das geklickt wurde)
	tagsLoeschen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const typ = this.dataset.typ;
			let text = ["Tags", "Tag"];
			if (optionen.tagsTypen[typ]) {
				text = Array(2).fill(optionen.tagsTypen[typ][1]);
			}
			dialog.oeffnen({
				typ: "confirm",
				text: `Sollen die importierten ${text[0]} wirklich gelöscht werden?\n(Die Verknüpfung mit der ${text[1]}-Datei wird in diesem Zuge ebenfalls entfernt.)`,
				callback: () => {
					if (dialog.antwort) {
						delete optionen.data.tags[typ];
						optionen.speichern();
						optionen.anwendenTags();
					}
				},
			});
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
			dialog.oeffnen({
				typ: "alert",
				text: `<h3>${h3}</h3>\n<div class="dialog-tags-liste"></div>`,
			});
			let liste = document.querySelector(".dialog-tags-liste");
			for (let tag of tags) {
				let p = document.createElement("p");
				p.textContent = tag;
				liste.appendChild(p);
			}
		});
	},
	// Setzt die Liste der Tag-Dateien auf den Auslieferungszustand zurück
	tagsZuruecksetzen () {
		dialog.oeffnen({
			typ: "confirm",
			text: "Sollen die Tag-Dateien wirklich zurückgesetzt werden?\n(Vorhandene Tag-Dateien werden aus der Liste entfernt. Danach werden Verknüpfungen mit den mitgelieferten Tag-Dateien erzeugt.)",
			callback: () => {
				if (!dialog.antwort) {
					return;
				}
				// Verknüpfungen aufheben
				for (let typ in optionen.data.tags) {
					if (!optionen.data.tags.hasOwnProperty(typ)) {
						continue;
					}
					delete optionen.data.tags[typ];
				}
				// Tag-Dateien neu laden
				optionen.tagsAutoLaden();
			},
		});
	},
	// Optionen an den Main-Prozess schicken, der sie dann speichern soll
	// (der Main-Prozess setzt einen Timeout, damit das nicht zu häufig geschieht)
	speichern () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.invoke("optionen-speichern", optionen.data, winInfo.winId);
	},
	// letzten Pfad speichern
	//   pfad = String | undefined
	//     (Pfad, der gespeichert werden soll; wenn leer
	//     Pfad aus aktueller Kartei extrahieren)
	aendereLetzterPfad (pfad = "") {
		if (!pfad) {
			const path = require("path");
			let reg = new RegExp(`^.+\\${path.sep}`);
			pfad = kartei.pfad.match(reg)[0];
		}
		optionen.data.letzter_pfad = pfad;
		optionen.speichern();
	},
	// Personenliste einlesen
	async aenderePersonenliste () {
		let opt = {
			title: "Personenliste laden",
			defaultPath: appInfo.documents,
			filters: [
				{
					name: "Text-Dateien",
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
		const {ipcRenderer} = require("electron");
		let result = await ipcRenderer.invoke("datei-dialog", {
			open: true,
			winId: winInfo.winId,
			opt: opt,
		});
		// Fehler oder keine Datei ausgewählt
		if (result.message || !Object.keys(result).length) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) {
			return;
		}
		// Datei laden
		const fsP = require("fs").promises;
		fsP.readFile(result.filePaths[0], {encoding: "utf8"})
			.then(content => {
				// Inhalt einlesen und speichern
				optionen.data.personen = [];
				content.split(/(\r|\n)/).forEach(i => { // alle End-of-line-Styles berücksichtigen
					const person = i.trim();
					if (person) {
						optionen.data.personen.push(person);
					}
				});
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
					dialog.oeffnen({
						typ: "alert",
						text: "Die Personenliste wurde geleert.",
					});
					return;
				}
				// Liste enthält Personen
				dialog.oeffnen({
					typ: "alert",
					text: `In der Liste ${fb.verb} jetzt ${fb.personen} ${fb.text}.`,
				});
			})
			.catch(err => {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
				});
				throw err;
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
		if (ele.id === "einstellung-bearbeiterin") {
			ele.addEventListener("blur", () => {
				if (!optionen.data.einstellungen.bearbeiterin) {
					bearbeiterin.oeffnen();
				}
			});
		}
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
		// Kartei > Speichern
		if (ele.name === "einstellung-speichern") {
			optionen.data.einstellungen.speichern = ele.value;
		}
		// Vorauswahl Kopierfenster
		if (ele.name === "einstellung-ctrlC-vor") {
			optionen.data.einstellungen["ctrlC-vor"] = ele.value;
		}
		// ggf. Konsequenzen on-the-fly
		if (/^kopf-icon-/.test(e)) { // Icons im Fensterkopf
			kopf.icons();
		} else if (e === "quick") { // Quick-Access-Bar umgestellt
			quick.toggle();
		} else if (e === "filter-unterbedeutungen") { // Verhalten Bedeutungen-Filter umgestellt
			liste.status(true);
		} else if (/^belegliste-(referenz|mark|notizen|textsorte)$/.test(e) &&
				kartei.wort) { // Details für Belegkopf der Belegliste umgestellt
			liste.status(false);
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
		let inputAktiv = optionen.sektionWechselnInput();
		// Maximalhöhe des Fensters anpassen
		helfer.elementMaxHeight({
			ele: document.getElementById(inputAktiv.closest("section").id),
		});
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
		// ggf. aktives Element in der Konfiguration der Quick-Access-Bar deaktivieren
		quick.rmAktiv();
		// 1. Input fokussieren
		optionen.sektionWechselnInput();
		// Maximalhöhe des Fensters anpassen
		helfer.elementMaxHeight({
			ele: document.getElementById(`einstellungen-sec-${sektion}`),
		});
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
		let input = document.querySelector("#einstellungen section:not(.aus) input");
		input.focus();
		return input;
	},
	// durch die Menüelemente navigieren
	//   evt = Object
	//     (Event-Object des keydown)
	naviMenue (evt) {
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
		if (evt.key === "ArrowUp") {
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
	// Einstellungen importieren oder exportieren
	//   input = Element
	//     (Button, auf den geklickt wurde)
	async sichern (input) {
		// Dialog öffnen
		let opt = {
			title: "Einstellungen ",
			defaultPath: appInfo.documents,
			filters: [
				{
					name: `${appInfo.name} Einstellungen`,
					extensions: ["zte"],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
		};
		if (optionen.data.letzter_pfad) {
			opt.defaultPath = optionen.data.letzter_pfad;
		}
		let {ipcRenderer} = require("electron"),
			path = require("path"),
			result;
		if (/exportieren$/.test(input.id)) { // Einstellungen exportieren
			opt.title += "exportieren";
			opt.defaultPath = path.join(opt.defaultPath, "Einstellungen.zte");
			result = await ipcRenderer.invoke("datei-dialog", {
				open: false,
				winId: winInfo.winId,
				opt: opt,
			});
		} else { // Einstellungen importieren
			opt.title += "importieren";
			opt.properties = ["openFile"];
			result = await ipcRenderer.invoke("datei-dialog", {
				open: true,
				winId: winInfo.winId,
				opt: opt,
			});
		}
		// Fehler oder nichts ausgewählt
		if (result.message || !Object.keys(result).length) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) {
			return;
		}
		// Exportieren od. importieren
		if (/exportieren$/.test(input.id)) {
			const opt = await io.schreiben(result.filePath, JSON.stringify(optionen.data));
			if (opt !== true) {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Exportieren der Einstellungen ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${opt.name}: ${opt.message}</p>`,
				});
			}
		} else {
			const opt = await io.lesen(result.filePaths[0]);
			if (!helfer.checkType("String", opt)) {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Importieren der Einstellungen ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${opt.name}: ${opt.message}</p>`,
				});
				return;
			}
			let data;
			try {
				data = JSON.parse(opt);
			} catch (err) {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Importieren der Einstellungen ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
				});
				return;
			}
			optionen.einlesen(optionen.data, data);
			optionen.anwenden();
			zuletzt.aufbauen();
			optionen.speichern();
		}
	},
};
