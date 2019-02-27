"use strict";

// Globales Datenobjekt, in dem die Werte zur aktuellen
// Kartei gespeichert werden.
let data = {};

// Initialisierung der App
window.addEventListener("load", function() {
	// TASTATUREINGABEN
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
	// Start-Sektion
	document.getElementById("start_erstellen").addEventListener("click", () => kartei.wortErfragen() );
	document.getElementById("start_oeffnen").addEventListener("click", () => kartei.oeffnen() );
	// Belegformular
	let beleg_inputs = document.querySelectorAll("#beleg input, #beleg textarea");
	for (let i = 0, len = beleg_inputs.length; i < len; i++) {
		if (beleg_inputs[i].type === "button") {
			beleg.klickButton(beleg_inputs[i]);
		} else {
			beleg.feldGeaendert(beleg_inputs[i]);
		}
	}
	let beleg_links = document.querySelectorAll("#beleg .icon_link");
	for (let i = 0, len = beleg_links.length; i < len; i++) {
		beleg.toolsInit(beleg_links[i]);
	}
	// Funktionen im Belegliste-Header
	let liste_links = document.querySelectorAll("#liste header a");
	for (let i = 0, len = liste_links.length; i < len; i++) {
		liste.header(liste_links[i]);
	}
	// Prompt-Textfeld
	document.getElementById("dialog_prompt_text").addEventListener("keydown", function(evt) {
		if (evt.which === 13) { // Enter im Textfeld führt die Aktion aus
			overlay.schliessen(this);
		}
	});
	// Dialog-Buttons
	function dialog_schliessen (button) {
		document.getElementById(button).addEventListener("click", function() {
			overlay.schliessen(this);
		});
	}
	let dialog_buttons = ["dialog_ok_button", "dialog_abbrechen_button", "dialog_ja_button", "dialog_nein_button"];
	for (let i = 0, len = dialog_buttons.length; i < len; i++) {
		dialog_schliessen(dialog_buttons[i]);
	}
	// Schließen-Links von Overlays
	let overlay_links = document.querySelectorAll(".overlay_schliessen");
	for (let i = 0, len = overlay_links.length; i < len; i++) {
		overlay.initSchliessen(overlay_links[i]);
	}
	
	// ANFRAGEN DES MAIN-PROZESSES ABFANGEN
	require("electron").ipcRenderer.on("kartei-erstellen", function() {
		kartei.checkSpeichern( () => kartei.wortErfragen() );
	});
	require("electron").ipcRenderer.on("kartei-oeffnen", function() {
		kartei.checkSpeichern( () => kartei.oeffnen() );
	});
	require("electron").ipcRenderer.on("kartei-speichern", () => kartei.speichern(false) );
	require("electron").ipcRenderer.on("kartei-speichern-unter", () => kartei.speichern(true) );
	require("electron").ipcRenderer.on("kartei-schliessen", function() {
		kartei.checkSpeichern( () => kartei.schliessen() );
	});
	require("electron").ipcRenderer.on("beleg-hinzufuegen", () => beleg.erstellenCheck() );
	require("electron").ipcRenderer.on("belege-auflisten", () => liste.anzeigen() );
});
