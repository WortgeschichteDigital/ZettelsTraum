"use strict";

// Initialisierung der App
window.addEventListener("load", () => {
	// Fensterttyp registrieren
	window.fenstertyp = "index";

	// Globales Datenobjekt, in dem die Werte zur aktuellen
	// Kartei gespeichert werden, anlegen
	window.data = {};

	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helfer.tastatur);

	// RECHTSKLICK ABFANGEN
	window.addEventListener("contextmenu", evt => {
		evt.preventDefault();
		popup.oeffnen(evt);
	});

	// DATEIEN VIA DRAG & DROP ÖFFNEN
	document.addEventListener("dragover", evt => evt.preventDefault());
	document.addEventListener("dragleave", evt => evt.preventDefault());
	document.addEventListener("dragend", evt => evt.preventDefault());
	document.addEventListener("drop", evt => {
		evt.preventDefault();
		if (!evt.dataTransfer.files.length) { // wenn z.B. Text gedropt wird
			return;
		}
		let pfad = evt.dataTransfer.files[0].path;
		kartei.oeffnenEinlesen(pfad);
	});

	// EVENTS INITIALISIEREN
	// alle <textarea>
	document.querySelectorAll("textarea").forEach(textarea => {
		textarea.addEventListener("input", function() {
			helfer.textareaGrow(this);
		});
	});
	// alle <input type="number">
	document.querySelectorAll(`input[type="number"]`).forEach(i => {
		i.addEventListener("change", function() {
			helfer.inputNumber(this);
		});
	});
	// alle Dropdown-Listen
	document.querySelectorAll(".dropdown-feld").forEach(i => dropdown.feld(i));
	document.querySelectorAll(".dropdown-link-td, .dropdown-link-element").forEach(i =>	dropdown.link(i));
	// Quick-Access-Bar
	document.addEventListener("mousedown", function() {
		helfer.quickAccessRolesActive = document.activeElement;
	});
	document.querySelectorAll("#quick a").forEach(a => {
		if (/^quick-(bearbeiten|ansicht)-/.test(a.id)) {
			helfer.quickAccessRoles(a);
		} else {
			helfer.quickAccess(a);
		}
	});
	if (process.platform === "win32") { // Korrekt des Shortcuts unter Windows
		document.getElementById("quick-bearbeiten-wiederherstellen").title = "Bearbeiten: Wiederherstellen (Strg + Y)";
	}
	// Wort-Element
	document.getElementById("wort").addEventListener("click", () => kartei.wortAendern());
	// Erinnerungen-Icon
	document.getElementById("erinnerungen").addEventListener("click", () => erinnerungen.show());
	// Notizen-Icon
	document.getElementById("notizen-icon").addEventListener("click", () => notizen.oeffnen());
	// Lexika-Icon
	document.getElementById("lexika-icon").addEventListener("click", () => lexika.oeffnen());
	// Programm-Icon
	document.getElementById("icon").addEventListener("click", () => {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("ueber-app");
	});
	// Start-Sektion
	document.getElementById("start-erstellen").addEventListener("click", () => kartei.wortErfragen());
	document.getElementById("start-oeffnen").addEventListener("click", () => kartei.oeffnen());
	// Karteikarte
	document.querySelectorAll("#beleg input, #beleg textarea").forEach(i => {
		if (i.type === "button") {
			beleg.aktionButton(i);
		} else {
			beleg.formularGeaendert(i);
			beleg.belegSpeichern(i);
		}
	});
	document.querySelectorAll("#beleg .icon-link").forEach(a => {
		if (a.classList.contains("icon-stern")) { // Bewertung
			beleg.bewertungEvents(a);
		} else if (/icon-tools-/.test(a.getAttribute("class"))) { // Text-Tools
			beleg.toolsKlick(a);
		}
	});
	document.querySelectorAll(".beleg-opt-block a").forEach(a => {
		if (a.classList.contains("druck-icon")) {
			return;
		}
		beleg.ctrlLinks(a);
	});
	// Sonderzeichen
	document.querySelectorAll("#sonderzeichen-cont span").forEach(i => sonderzeichen.eintragen(i));
	// Kopierfunktion
	kopieren.addListeAlle(document.getElementById("liste-link-kopieren"));
	document.getElementById("kopieren").addEventListener("click", () => kopieren.liste());
	document.getElementById("kopieren-liste-leeren").addEventListener("click", () => kopieren.listeLeeren());
	document.getElementById("kopieren-liste-beenden").addEventListener("click", () => kopieren.uiOff());
	document.getElementById("kopieren-liste-export").addEventListener("click", () => kopieren.exportieren());
	document.getElementById("kopieren-liste-schliessen").addEventListener("click", () => overlay.schliessen(document.getElementById("kopieren-liste")));
	document.getElementById("kopieren-einfuegen-einfuegen").addEventListener("click", () => kopieren.einfuegenAusfuehrenPre());
	document.getElementById("kopieren-einfuegen-reload").addEventListener("click", () => kopieren.einfuegenBasisdaten(true));
	document.getElementById("kopieren-einfuegen-import").addEventListener("click", () => kopieren.importieren());
	document.getElementById("kopieren-einfuegen-schliessen").addEventListener("click", () => overlay.schliessen(document.getElementById("kopieren-einfuegen")));
	document.querySelectorAll("#kopieren-einfuegen-formular input").forEach(i => kopieren.einfuegenDatenfelder(i));
	// Bedeutungen
	document.getElementById("bedeutungen-speichern").addEventListener("click", () => bedeutungen.speichern());
	document.getElementById("bedeutungen-schliessen").addEventListener("click", () => bedeutungen.schliessen());
	document.getElementById("bedeutungen-gerueste-config").addEventListener("click", evt => bedeutungenGerueste.oeffnen(evt));
	document.querySelector(`[for="beleg-bd"]`).addEventListener("click", () => bedeutungenGeruest.oeffnen());
	// Tagger
	document.getElementById("tagger-speichern").addEventListener("click", () => tagger.speichern());
	document.getElementById("tagger-schliessen").addEventListener("click", () => tagger.schliessen());
	// Belegliste-Filter
	document.querySelectorAll("#liste-filter header a").forEach(a => filter.ctrlButtons(a));
	document.querySelectorAll(".filter-kopf").forEach(a => {
		filter.anzeigeUmschalten(a);
		filter.ctrlResetBlock(a.lastChild);
	});
	filter.toggleErweiterte();
	document.querySelectorAll(".filter-optionen").forEach(input => filter.filterOptionenListener(input));
	document.querySelectorAll(`a[id^="filter-datenfelder-"]`).forEach(input => filter.ctrlVolltextDs(input));
	filter.anwenden(document.getElementById("filter-volltext"));
	document.getElementsByName("filter-zeitraum").forEach(i => filter.wechselnZeitraum(i));
	filter.backupKlappScroll(document.getElementById("filter-zeitraum-dynamisch"));
	document.querySelectorAll(`#filter-kartendatum input[type="checkbox"]`).forEach(i => filter.kartendatumBox(i));
	document.querySelectorAll(`#filter-kartendatum input[type="datetime-local"]`).forEach(i => filter.kartendatumFeld(i));
	document.querySelectorAll("#filter-kartendatum .icon-jetzt").forEach(a => filter.kartendatumJetzt(a));
	// Funktionen im Belegliste-Header
	document.querySelectorAll("#liste header a").forEach(a => liste.header(a));
	// Einstellungen-Fenster
	document.querySelectorAll("#einstellungen ul a").forEach(a => optionen.sektionWechselnLink(a));
	document.querySelectorAll("#einstellungen input").forEach(i => optionen.aendereEinstellungListener(i));
	document.getElementById("einstellung-personenliste").addEventListener("click", () => optionen.aenderePersonenliste());
	document.querySelectorAll("#einstellungen-quick-alle, #einstellungen-quick-keine, #einstellungen-quick-standards").forEach(a => optionen.quickSelect(a));
	optionen.anwendenNotizenFilterleiste(document.getElementById("einstellung-notizen-filterleiste"));
	document.getElementById("tags-laden").addEventListener("click", () => optionen.tagsManuLaden());
	optionen.anwendenIconsDetailsListener(document.getElementById("einstellung-anzeige-icons-immer-an"));
	// Formvarianten-Fenster
	document.querySelectorAll("#stamm input").forEach(i => {
		if (i.type === "button") {
			stamm.aktionButton(i);
		} else { // Text-Input
			stamm.aktionText(i);
		}
	});
	// Notizen-Fenster
	document.querySelectorAll("#notizen-cont .icon-link").forEach(a => notizen.tools(a));
	document.querySelectorAll("#notizen input, #notizen-feld").forEach(i => {
		if (i.type === "button") {
			notizen.aktionButton(i);
		} else { // #notizen-feld
			notizen.change(i);
		}
	});
	// Lexika-Fenster
	document.querySelectorAll("#lexika input").forEach(i => {
		if (i.type === "button") {
			lexika.aktionButton(i);
		} else { // Text-Input
			lexika.aktionText(i);
		}
	});
	// Metadaten-Fenster
	document.querySelectorAll("#meta input").forEach(i => {
		if (i.type === "button") {
			meta.aktionButton(i);
		} else { // Text-Input
			meta.aktionText(i);
		}
	});
	// Karteisuche
	document.getElementById("karteisuche-suchen").addEventListener("click", () => karteisuche.suchenPrep());
	document.getElementById("karteisuche-add-filter").addEventListener("click", () => karteisuche.filterHinzufuegen());
	// Prompt-Textfeld
	document.getElementById("dialog-prompt-text").addEventListener("keydown", function(evt) {
		if (evt.which === 13) { // Enter im Textfeld führt die Aktion aus
			overlay.schliessen(this);
		}
	});
	// Dialog-Buttons
	["dialog-ok-button", "dialog-abbrechen-button", "dialog-ja-button", "dialog-nein-button"].forEach(button => {
		document.getElementById(button).addEventListener("click", function() {
			overlay.schliessen(this);
		});
	});
	// Druck-Links
	document.querySelectorAll(".druck-icon").forEach(a => drucken.listener(a));
	// Druck-Fenster
	document.querySelectorAll("#drucken-head span").forEach(span => drucken.buttons(span));
	// Schließen-Links von Overlays
	document.querySelectorAll(".overlay-schliessen").forEach(a => overlay.initSchliessen(a));
	// Handbuch-Links von Overlays
	document.querySelectorAll(".icon-handbuch").forEach(a => helfer.handbuchLink(a));

	// ANFRAGEN DES MAIN-PROZESSES ABFANGEN
	const {ipcRenderer} = require("electron");
	ipcRenderer.on("optionen-empfangen", (evt, data) => optionen.empfangen(data));
	ipcRenderer.on("programm-einstellungen", () => optionen.oeffnen());
	ipcRenderer.on("programm-karteisuche", () => karteisuche.oeffnen());
	ipcRenderer.on("kartei-erstellen", () => kartei.wortErfragen());
	ipcRenderer.on("kartei-oeffnen", (evt, datei) => {
		if (datei) {
			kartei.oeffnenEinlesen(datei);
		} else {
			kartei.oeffnen();
		}
	});
	ipcRenderer.on("kartei-speichern", () => helfer.speichern());
	ipcRenderer.on("kartei-speichern-unter", () => kartei.speichern(true));
	ipcRenderer.on("kartei-schliessen", () => kartei.schliessen());
	ipcRenderer.on("kartei-formvarianten", () => stamm.oeffnen());
	ipcRenderer.on("kartei-notizen", () => notizen.oeffnen());
	ipcRenderer.on("kartei-anhaenge", () => anhaenge.fenster());
	ipcRenderer.on("kartei-lexika", () => lexika.oeffnen());
	ipcRenderer.on("kartei-metadaten", () => meta.oeffnen());
	ipcRenderer.on("kartei-redaktion", () => redaktion.oeffnen());
	ipcRenderer.on("kartei-bedeutungen", () => bedeutungen.oeffnen());
	ipcRenderer.on("kartei-bedeutungen-wechseln", () => bedeutungenGeruest.oeffnen());
	ipcRenderer.on("kartei-bedeutungen-fenster", () => bedeutungenWin.oeffnen());
	ipcRenderer.on("kartei-suche", () => filter.suche());
	ipcRenderer.on("belege-hinzufuegen", () => beleg.erstellenPre());
	ipcRenderer.on("belege-auflisten", () => liste.anzeigen());
	ipcRenderer.on("belege-kopieren", () => kopieren.init());
	ipcRenderer.on("belege-einfuegen", () => kopieren.einfuegen());
	ipcRenderer.on("hilfe-demo", () => helfer.demoOeffnen());
	ipcRenderer.on("kopieren-basisdaten", () => kopieren.basisdatenSenden());
	ipcRenderer.on("kopieren-basisdaten-empfangen", (evt, daten) => kopieren.einfuegenBasisdatenEintragen(daten));
	ipcRenderer.on("kopieren-daten", () => kopieren.datenSenden());
	ipcRenderer.on("kopieren-daten-empfangen", (evt, daten) => kopieren.einfuegenEinlesen(daten));
	ipcRenderer.on("optionen-zuletzt", (evt, zuletzt) => optionen.updateZuletzt(zuletzt));
	ipcRenderer.on("dialog-anzeigen", (evt, text) => {
		dialog.oeffnen("alert");
		dialog.text(text);
	});
	ipcRenderer.on("bedeutungen-fenster-drucken", (evt, gn) => drucken.init("bedeutungen-", gn));
	ipcRenderer.on("bedeutungen-fenster-eintragen", (evt, bd) => beleg.bedeutungEinAustragen(bd, true));
	ipcRenderer.on("bedeutungen-fenster-austragen", (evt, bd) => beleg.bedeutungEinAustragen(bd, false));
	ipcRenderer.on("bedeutungen-fenster-status", (evt, status) => bedeutungenWin.status(status));

	// SYNCHRONE ANFRAGEN AN DEN MAIN-PROZESS STELLEN
	// Optionen laden
	let opt = ipcRenderer.sendSync("optionen-senden");
	optionen.einlesen(optionen.data, opt);
	optionen.anwenden();
	// Bilder vorladen (damit es nicht flackert)
	let bilder = ipcRenderer.sendSync("bilder-senden"),
		bilder_preload = [];
	for (let i = 0, len = bilder.length; i < len; i++) {
		bilder_preload[i] = new Image();
		bilder_preload[i].src = `img/${bilder[i]}`;
	}

	// Start-Sektion initialisieren
	// Obacht! Erst aufrufen, nachdem die Optionen geladen wurden!
	start.zuletzt();
	// Programmstart-Overlay ausblenden
	start.overlayAus();
});

// Schließen unterbrechen, falls Daten noch nicht gespeichert wurden
window.addEventListener("beforeunload", evt => {
	// Bedeutungen-Fenster ggf. schließen
	bedeutungenWin.schliessen();
	// Status des Fensters speichern
	const {remote} = require("electron"),
		win = remote.getCurrentWindow();
	optionen.data.fenster.maximiert = win.isMaximized();
	let bounds = win.getBounds();
	if (!optionen.data.fenster.maximiert && bounds) {
		optionen.data.fenster.x = bounds.x;
		optionen.data.fenster.y = bounds.y;
		optionen.data.fenster.width = bounds.width;
		optionen.data.fenster.height = bounds.height;
	}
	optionen.speichern();
	// Schließen ggf. unterbrechen + Kartei ggf. entsperren
	if (notizen.geaendert || tagger.geaendert || bedeutungen.geaendert || beleg.geaendert || kartei.geaendert) {
		sicherheitsfrage.warnen(function() {
			notizen.geaendert = false;
			tagger.geaendert = false;
			bedeutungen.geaendert = false;
			beleg.geaendert = false;
			kartei.geaendert = false;
			const {remote} = require("electron"),
				win = remote.getCurrentWindow();
			win.close();
		}, {
			notizen: true,
			tagger: true,
			bedeutungen: true,
			beleg: true,
			kartei: true,
		});
		evt.returnValue = "false";
	} else {
		kartei.lock(kartei.pfad, "unlock");
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("fenster-dereferenzieren", win.id);
	}
});

window.addEventListener("error", evt => {
	let err = {
		time: new Date().toISOString(),
		word: kartei.wort,
		fileWgd: kartei.pfad,
		fileJs: evt.filename,
		message: evt.message,
		line: evt.lineno,
		column: evt.colno,
	};
	const {ipcRenderer} = require("electron");
	ipcRenderer.send("fehler", err);
});
