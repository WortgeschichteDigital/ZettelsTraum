"use strict";

// Initialisierung der App
window.addEventListener("load", function() {
	// Fensterttyp registrieren
	window.fenstertyp = "index";
	
	// Globales Datenobjekt, in dem die Werte zur aktuellen
	// Kartei gespeichert werden, anlegen
	window.data = {};
	
	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helfer.tastatur);
	
	// RECHTSKLICK ABFANGEN
	window.addEventListener("contextmenu", function(evt) {
		evt.preventDefault();
		popup.oeffnen(evt);
	});
	
	// DATEIEN VIA DRAG & DROP ÖFFNEN
	document.addEventListener("dragover", evt => evt.preventDefault());
	document.addEventListener("dragleave", evt => evt.preventDefault());
	document.addEventListener("dragend", evt => evt.preventDefault());
	document.addEventListener("drop", function(evt) {
		evt.preventDefault();
		if (!evt.dataTransfer.files.length) { // wenn z.B. Text gedropt wird
			return;
		}
		let pfad = evt.dataTransfer.files[0].path;
		kartei.oeffnenEinlesen(pfad);
	});
	
	// EVENTS INITIALISIEREN
	// alle <textarea>
	document.querySelectorAll("textarea").forEach(function(textarea) {
		textarea.addEventListener("input", function() {
			helfer.textareaGrow(this);
		});
	});
	// alle <input type="number">
	document.querySelectorAll(`input[type="number"]`).forEach(function(i) {
		i.addEventListener("change", function() {
			helfer.inputNumber(this);
		});
	});
	// alle Dropdown-Listen
	document.querySelectorAll(".dropdown-feld").forEach(i => dropdown.feld(i));
	document.querySelectorAll(".dropdown-link-td, .dropdown-link-element").forEach(i =>	dropdown.link(i));
	// Quick-Access-Bar
	let quick = document.querySelectorAll("#quick a");
	for (let i = 0, len = quick.length; i < len; i++) {
		helfer.quickAccess(quick[i]);
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
	document.getElementById("icon").addEventListener("click", function() {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("ueber-app");
	});
	// Start-Sektion
	document.getElementById("start-erstellen").addEventListener("click", () => kartei.wortErfragen());
	document.getElementById("start-oeffnen").addEventListener("click", () => kartei.oeffnen());
	// Karteikarte
	let beleg_inputs = document.querySelectorAll("#beleg input, #beleg textarea");
	for (let i = 0, len = beleg_inputs.length; i < len; i++) {
		if (beleg_inputs[i].type === "button") {
			beleg.aktionButton(beleg_inputs[i]);
		} else {
			beleg.formularGeaendert(beleg_inputs[i]);
			beleg.belegSpeichern(beleg_inputs[i]);
		}
	}
	let beleg_links = document.querySelectorAll("#beleg .icon-link");
	for (let i = 0, len = beleg_links.length; i < len; i++) {
		if (beleg_links[i].classList.contains("icon-stern")) { // Bewertung
			beleg.bewertungEvents(beleg_links[i]);
		} else if (/icon-tools-/.test(beleg_links[i].getAttribute("class"))) { // Text-Tools
			beleg.toolsKlick(beleg_links[i]);
		}
	}
	document.querySelectorAll(".beleg-opt-block a").forEach(function(a) {
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
	document.querySelectorAll(".filter-kopf").forEach(function(a) {
		filter.anzeigeUmschalten(a);
		filter.ctrlResetBlock(a.lastChild);
	});
	filter.toggleErweiterte();
	document.querySelectorAll(".filter-optionen").forEach(input => filter.filterOptionenListener(input));
	document.querySelectorAll(`a[id^="filter-datenfelder-"]`).forEach(input => filter.ctrlVolltextDs(input));
	filter.anwenden(document.getElementById("filter-volltext"));
	let filter_zeitraum = document.getElementsByName("filter-zeitraum");
	for (let i = 0, len = filter_zeitraum.length; i < len; i++) {
		filter.wechselnZeitraum(filter_zeitraum[i]);
	}
	filter.backupKlappScroll(document.getElementById("filter-zeitraum-dynamisch"));
	document.querySelectorAll(`#filter-kartendatum input[type="checkbox"]`).forEach(i => filter.kartendatumBox(i));
	document.querySelectorAll(`#filter-kartendatum input[type="datetime-local"]`).forEach(i => filter.kartendatumFeld(i));
	document.querySelectorAll("#filter-kartendatum .icon-jetzt").forEach(a => filter.kartendatumJetzt(a));
	// Funktionen im Belegliste-Header
	let liste_links = document.querySelectorAll("#liste header a");
	for (let i = 0, len = liste_links.length; i < len; i++) {
		liste.header(liste_links[i]);
	}
	// Einstellungen-Fenster
	let ee_menu = document.querySelectorAll("#einstellungen ul a");
	for (let i = 0, len = ee_menu.length; i < len; i++) {
		optionen.sektionWechselnLink(ee_menu[i]);
	}
	let ee = document.querySelectorAll("#einstellungen input");
	for (let i = 0, len = ee.length; i < len; i++) {
		optionen.aendereEinstellungListener(ee[i]);
	}
	document.getElementById("einstellung-personenliste").addEventListener("click", () => optionen.aenderePersonenliste());
	optionen.anwendenNotizenFilterleiste(document.getElementById("einstellung-notizen-filterleiste"));
	document.getElementById("tags-laden").addEventListener("click", () => optionen.tagsManuLaden());
	optionen.anwendenIconsDetailsListener(document.getElementById("einstellung-anzeige-icons-immer-an"));
	// Formvarianten-Fenster
	let stamm_inputs = document.querySelectorAll("#stamm input");
	for (let i = 0, len = stamm_inputs.length; i < len; i++) {
		if (stamm_inputs[i].type === "button") {
			stamm.aktionButton(stamm_inputs[i]);
		} else { // Text-Input
			stamm.aktionText(stamm_inputs[i]);
		}
	}
	// Notizen-Fenster
	document.querySelectorAll("#notizen .icon-link").forEach(function(a) {
		notizen.tools(a);
	});
	let notizen_inputs = document.querySelectorAll("#notizen input, #notizen-feld");
	for (let i = 0, len = notizen_inputs.length; i < len; i++) {
		if (notizen_inputs[i].type === "button") { // Buttons
			notizen.aktionButton(notizen_inputs[i]);
		} else { // #notizen-feld
			notizen.change(notizen_inputs[i]);
		}
	}
	// Lexika-Fenster
	let lexika_inputs = document.querySelectorAll("#lexika input");
	for (let i = 0, len = lexika_inputs.length; i < len; i++) {
		if (lexika_inputs[i].type === "button") {
			lexika.aktionButton(lexika_inputs[i]);
		} else { // Text-Input
			lexika.aktionText(lexika_inputs[i]);
		}
	}
	// Metadaten-Fenster
	let meta_inputs = document.querySelectorAll("#meta input");
	for (let i = 0, len = meta_inputs.length; i < len; i++) {
		if (meta_inputs[i].type === "button") {
			meta.aktionButton(meta_inputs[i]);
		} else { // Text-Input
			meta.aktionText(meta_inputs[i]);
		}
	}
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
	let dialog_buttons = ["dialog-ok-button", "dialog-abbrechen-button", "dialog-ja-button", "dialog-nein-button"];
	for (let i = 0, len = dialog_buttons.length; i < len; i++) {
		dialog_schliessen(dialog_buttons[i]);
	}
	function dialog_schliessen (button) {
		document.getElementById(button).addEventListener("click", function() {
			overlay.schliessen(this);
		});
	}
	// Druck-Links
	document.querySelectorAll(".druck-icon").forEach(function(a) {
		drucken.listener(a);
	});
	// Druck-Fenster
	document.querySelectorAll("#drucken-head span").forEach(span => drucken.buttons(span));
	// Schließen-Links von Overlays
	let overlay_links = document.querySelectorAll(".overlay-schliessen");
	for (let i = 0, len = overlay_links.length; i < len; i++) {
		overlay.initSchliessen(overlay_links[i]);
	}
	
	// ANFRAGEN DES MAIN-PROZESSES ABFANGEN
	const {ipcRenderer} = require("electron");
	ipcRenderer.on("optionen-empfangen", (evt, data) => optionen.empfangen(data));
	ipcRenderer.on("programm-einstellungen", () => optionen.oeffnen());
	ipcRenderer.on("programm-karteisuche", () => karteisuche.oeffnen());
	ipcRenderer.on("kartei-erstellen", () => kartei.wortErfragen());
	ipcRenderer.on("kartei-oeffnen", function(evt, datei) {
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
	ipcRenderer.on("kopieren-basisdaten", () => kopieren.basisdatenSenden());
	ipcRenderer.on("kopieren-basisdaten-empfangen", (evt, daten) => kopieren.einfuegenBasisdatenEintragen(daten));
	ipcRenderer.on("kopieren-daten", () => kopieren.datenSenden());
	ipcRenderer.on("kopieren-daten-empfangen", (evt, daten) => kopieren.einfuegenEinlesen(daten));
	ipcRenderer.on("optionen-zuletzt", (evt, zuletzt) => optionen.updateZuletzt(zuletzt));
	ipcRenderer.on("dialog-anzeigen", function(evt, text) {
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
window.addEventListener("beforeunload", function(evt) {
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

window.addEventListener("error", function(evt) {
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
