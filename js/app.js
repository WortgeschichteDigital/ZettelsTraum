"use strict";

// Globales Datenobjekt, in dem die Werte zur aktuellen
// Kartei gespeichert werden.
let data = {};

// Initialisierung der App
window.addEventListener("load", function() {
	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helfer.tastatur);
	
	// DATEIEN VIA DRAG & DROP ÖFFNEN
	document.addEventListener("dragover", (evt) => evt.preventDefault() );
	document.addEventListener("dragleave", (evt) => evt.preventDefault() );
	document.addEventListener("dragend", (evt) => evt.preventDefault() );
	document.addEventListener("drop", function(evt) {
		evt.preventDefault();
		let pfad = evt.dataTransfer.files[0].path;
		kartei.checkSpeichern( () => kartei.oeffnenEinlesen(pfad) );
	});
	
	// KLICK-EVENTS INITIALISIEREN
	// Wort-Element
	document.getElementById("wort").addEventListener("click", () => kartei.wortAendern() );
	// Notizen-Icon
	document.getElementById("notizen-icon").addEventListener("click", () => notizen.oeffnen() );
	// Programm-Icon
	document.getElementById("icon").addEventListener("click", function() {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("ueber-zettelstraum");
	});
	// Start-Sektion
	document.getElementById("start-erstellen").addEventListener("click", () => kartei.wortErfragen() );
	document.getElementById("start-oeffnen").addEventListener("click", () => kartei.oeffnen() );
	// Belegformular
	let beleg_inputs = document.querySelectorAll("#beleg input, #beleg textarea");
	for (let i = 0, len = beleg_inputs.length; i < len; i++) {
		if (beleg_inputs[i].type === "button") {
			beleg.aktionButton(beleg_inputs[i]);
		} else {
			beleg.formularGeaendert(beleg_inputs[i]);
			if ( beleg_inputs[i].type.match(/^checkbox|^text/) ) {
				beleg.belegSpeichern(beleg_inputs[i]);
			}
		}
	}
	let beleg_links = document.querySelectorAll("#beleg .icon-link");
	for (let i = 0, len = beleg_links.length; i < len; i++) {
		beleg.toolsKlick(beleg_links[i]);
	}
	// Funktionen im Belegliste-Header
	let liste_links = document.querySelectorAll("#liste header a");
	for (let i = 0, len = liste_links.length; i < len; i++) {
		liste.header(liste_links[i]);
	}
	// Einstellungen-Fenster
	let ee = document.querySelectorAll("#einstellungen input");
	for (let i = 0, len = ee.length; i < len; i++) {
		optionen.aendereEinstellung(ee[i]);
	}
	// Notizen-Fenster
	let notizen_inputs = document.querySelectorAll("#notizen input, #notizen textarea");
	for (let i = 0, len = notizen_inputs.length; i < len; i++) {
		if (notizen_inputs[i].type === "button") {
			notizen.aktionButton(notizen_inputs[i]);
		} else { // <textarea>
			notizen.change(notizen_inputs[i]);
		}
	}
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
	// Schließen-Links von Overlays
	let overlay_links = document.querySelectorAll(".overlay-schliessen");
	for (let i = 0, len = overlay_links.length; i < len; i++) {
		overlay.initSchliessen(overlay_links[i]);
	}
	
	// ANFRAGEN DES MAIN-PROZESSES ABFANGEN
	const {ipcRenderer} = require("electron");
	ipcRenderer.on("programm-einstellungen", () => optionen.oeffnen() );
	ipcRenderer.on("kartei-erstellen", function() {
		kartei.checkSpeichern( () => kartei.wortErfragen() );
	});
	ipcRenderer.on("kartei-oeffnen", function(evt, datei) {
		if (datei) {
			kartei.checkSpeichern(() => kartei.oeffnenEinlesen(datei) );
		} else {
			kartei.checkSpeichern(() => kartei.oeffnen() );
		}
	});
	ipcRenderer.on("kartei-speichern", () => kartei.speichern(false) );
	ipcRenderer.on("kartei-speichern-unter", () => kartei.speichern(true) );
	ipcRenderer.on("kartei-schliessen", function() {
		kartei.checkSpeichern( () => kartei.schliessen() );
	});
	ipcRenderer.on("kartei-notizen", () => notizen.oeffnen() );
	ipcRenderer.on("belege-hinzufuegen", () => beleg.erstellenPre() );
	ipcRenderer.on("belege-auflisten", () => liste.anzeigen() );
	ipcRenderer.on("optionen-zuletzt", (evt, zuletzt) => optionen.data.zuletzt = zuletzt );
	
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
	// Obacht! Erst aufrunfen, nachdem die Optionen geladen wurden!
	start.zuletzt();
});

// Schließen unterbrechen, falls Daten noch nicht gespeichert wurden
window.addEventListener("beforeunload", function(evt) {
	if (beleg.geaendert || kartei.geaendert) {
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort === false) {
				beleg.geaendert = false;
				kartei.geaendert = false;
				const {remote} = require("electron");
				let win = remote.getCurrentWindow();
				win.close();
			} else if (dialog.antwort) {
				if (beleg.geaendert) {
					beleg.aktionSpeichern();
				} else if (kartei.geaendert) {
					kartei.speichern(false);
				}
			}
		});
		let typ = "Der Beleg";
		if (kartei.geaendert) {
			typ = "Die Kartei";
		}
		dialog.text(`${typ} wurde noch nicht gespeichert!\nMöchten Sie die Daten vor dem Schließen des Programms nicht erst einmal speichern?`);
		evt.returnValue = "false";
	}
});
