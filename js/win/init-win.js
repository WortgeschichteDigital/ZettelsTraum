"use strict";

// INITIALISIERUNG DES FENSTERS
let initWin = {
	// Listener für Signale des Main-Prozesses
	ipcListener () {
		const {ipcRenderer} = require("electron");
		// Abschnitt öffnen (Dokumentation, Handbuch)
		ipcRenderer.on("oeffne-abschnitt", (evt, abschnitt) => hilfe.naviSprungAusfuehren(abschnitt));
		// Gerüstdaten übernehmen (Bedeutungen)
		ipcRenderer.on("daten", (evt, daten) => {
			bedeutungen.data = daten;
			bedeutungen.aufbauen();
		});
		// XML-Redaktionsfenster: alle XML-Daten empfangen
		ipcRenderer.on("xml-daten", (evt, xmlDaten) => {
			if (xml.data.wort) {
				// beim Ändern des Karteiworts werden alle Daten noch einmal
				// an das bereits offene Fenster geschickt; in diesem Fall
				// darf xml.init() nicht aufgerufen werden (macht Probleme)
				xml.data.wort = xmlDaten.wort;
				document.querySelector("h1").textContent = xml.data.wort;
			} else {
				xml.data = xmlDaten;
				xml.init();
			}
		});
		// XML-Redaktionsfester: einen XML-Datensatz empfangen
		ipcRenderer.on("xml-datensatz", (evt, xmlDatensatz) => xml.empfangen({xmlDatensatz}));
		// Before-Unload
		ipcRenderer.on("before-unload", () => helferWin.beforeUnload());
	},
	// Infos zu App und Fenster erfragen
	async infos () {
		const {ipcRenderer} = require("electron");
		let info = await ipcRenderer.invoke("infos-senden");
		window.appInfo = info.appInfo;
		window.winInfo = info.winInfo;
	},
	// Programmname in Elemente eintragen
	appName () {
		document.querySelectorAll(".app-name").forEach(i => i.textContent = appInfo.name);
	},
	// XML-Quelltexte aufhübschen
	xmlPrettyPrint () {
		let pretty = document.querySelectorAll(".xml-pretty-print");
		for (let i of pretty) {
			i.innerHTML = helferXml.prettyPrint({xmlStr: i.textContent});
		}
	},
	// Events initialisieren
	events () {
		// Tastatureingaben abfangen
		document.addEventListener("keydown", tastatur.init);
		// Nebenfenster öffnen
		document.querySelectorAll(".link-changelog").forEach(a => helferWin.oeffneChangelog(a));
		document.querySelectorAll(".link-dokumentation, .link-handbuch").forEach(a => helferWin.oeffne(a));
		document.querySelectorAll(".link-fehlerlog").forEach(a => helferWin.oeffneFehlerlog(a));
		document.querySelectorAll("#icon, .ueber-app").forEach(i => {
			i.addEventListener("click", evt => {
				evt.preventDefault();
				const {ipcRenderer} = require("electron");
				ipcRenderer.send("ueber-app");
			});
		});
		document.querySelectorAll(".ueber-electron").forEach(i => {
			i.addEventListener("click", evt => {
				evt.preventDefault();
				const {ipcRenderer} = require("electron");
				ipcRenderer.send("ueber-electron");
			});
		});
		// externe Links
		document.querySelectorAll(`a[href^="http"], a[href^="mailto"]`).forEach(a => helfer.externeLinks(a));
		// Demonstrationskartei
		document.querySelectorAll(".hilfe-demo").forEach(i => {
			i.addEventListener("click", evt => {
				evt.preventDefault();
				const {ipcRenderer} = require("electron");
				ipcRenderer.send("hilfe-demo");
			});
		});
		// Hilfe-Fenster (Dokumentation, Handbuch)
		if (typeof hilfe !== "undefined") {
			// interne Links
			document.querySelectorAll(`a[href^="#"]`).forEach(a => {
				if (/^#[a-z]/.test(a.getAttribute("href"))) {
					hilfe.naviSprung(a);
				}
			});
			// Vorschau-Bilder
			document.querySelectorAll("figure").forEach(i => {
				i.addEventListener("click", function() {
					hilfe.bild(this);
				});
			});
		}
	},
	// Events initialisieren: Suchzeile
	eventsSuche () {
		hilfe.sucheListener(document.getElementById("suchfeld"));
		document.getElementById("suchfeld-lupe").addEventListener("click", evt => {
			evt.preventDefault();
			hilfe.sucheWechseln();
		});
		document.getElementById("navi-back").addEventListener("click", evt => {
			evt.preventDefault();
			hilfe.historyNavi(false);
		});
		document.getElementById("navi-forward").addEventListener("click", evt => {
			evt.preventDefault();
			hilfe.historyNavi(true);
		});
		document.querySelectorAll(".link-suche").forEach(a => {
			a.addEventListener("click", evt => {
				evt.preventDefault();
				document.getElementById("suchfeld").select();
			});
		});
		document.querySelectorAll(".link-suchleiste").forEach(a => {
			a.addEventListener("click", evt => {
				evt.preventDefault();
				suchleiste.f3(evt);
			});
		});
	},
	// Events initialisieren: Rechtsklickmenü
	eventsPopup () {
		window.addEventListener("contextmenu", evt => {
			evt.preventDefault();
			popup.oeffnen(evt);
		});
	},
	// Events initialisieren: Kopf-Icons (Changelog, Dokumentation, Handbuch)
	eventsHilfeKopf () {
		document.querySelectorAll("#kopf-icons a").forEach(a => {
			a.addEventListener("click", function(evt) {
				evt.preventDefault();
				if (/suchleiste$/.test(this.id)) {
					suchleiste.einblenden();
				} else if (/drucken$/.test(this.id)) {
					print();
				}
			});
		});
	},
	// Events initialisieren: Elemente im XML-Fenster
	eventsXml () {
		// Kopf-Icons
		document.querySelectorAll("#kopf-icons a").forEach(a => {
			a.addEventListener("click", function(evt) {
				evt.preventDefault();
				switch (this.id) {
					case "kopf-export":
						xml.exportieren();
						break;
					case "kopf-import":
						xml.importieren();
						break;
					case "kopf-speichern":
						xml.speichernKartei();
						break;
					case "kopf-reset":
						xml.reset();
						break;
				}
			});
		});
		// Kopf-Navigation
		document.querySelectorAll("#kopf-nav a").forEach(a => {
			a.addEventListener("click", function(evt) {
				evt.preventDefault();
				const id = this.getAttribute("href").replace("#", "");
				let ziel = document.getElementById(id),
					header = document.querySelector("body > header");
				window.scrollTo({
					left: 0,
					top: ziel.offsetTop - header.offsetHeight,
					behavior: "smooth",
				});
			});
		});
		// Metadaten-Felder
		document.querySelectorAll("#md-id, #md-ty, #md-tf").forEach(i => xml.mdChange({input: i}));
		// Autofill Artikel-ID
		document.querySelector("#md .icon-stift").addEventListener("click", evt => {
			evt.preventDefault();
			xml.mdIdMake();
		});
		// Revision/Lemma/Label/Nachweis/Textreferenz hinzufügen
		document.querySelectorAll("#le input, #md-re input, #la, #bg-nw input, #bg-tf input").forEach(i => {
			i.addEventListener("keydown", function(evt) {
				tastatur.detectModifiers(evt);
				if (!tastatur.modifiers &&
						evt.key === "Enter" &&
						!document.getElementById("dropdown")) {
					if (this.closest("#md-re")) {
						xml.mdRevisionAdd();
					} else if (this.closest("#le")) {
						xml.lemmaAdd();
					} else if (this.id === "la") {
						xml.bgLabelChange();
					} else if (this.closest("#bg-nw")) {
						xml.bgNachweisAdd();
					} else {
						xml.bgTextreferenzAdd();
					}
				}
			});
			if (i.id === "nw-ty") {
				i.addEventListener("input", () => xml.bgNachweisToggle());
			}
		});
		document.querySelectorAll("#le .icon-plus-dick, #md-re .icon-plus-dick, #bg-nw .icon-plus-dick, #bg-tf .icon-plus-dick").forEach(i => {
			i.addEventListener("click", function(evt) {
				evt.preventDefault();
				if (this.closest("#md-re")) {
					xml.mdRevisionAdd();
				} else if (this.closest("#le")) {
					xml.lemmaAdd();
				} else if (this.closest("#bg-nw")) {
					xml.bgNachweisAdd();
				} else {
					xml.bgTextreferenzAdd();
				}
			});
		});
		// Abschnitt hinzufügen
		document.querySelectorAll(".abschnitt-add").forEach(i => {
			i.addEventListener("click", function() {
				xml.abschnittAdd({element: this});
			});
		});
		document.querySelectorAll(".abschnitt-add a").forEach(i => {
			i.addEventListener("click", function(evt) {
				evt.stopPropagation();
				xml.abschnittAdd({element: this});
			});
		});
		// Beleg einfügen/Blöcke umschalten
		document.querySelectorAll(".toggle").forEach(abschnitt => {
			abschnitt.querySelectorAll("a").forEach(i => {
				i.addEventListener("click", function(evt) {
					evt.preventDefault();
					if (this.classList.contains("icon-einfuegen")) { // Beleg einfügen
						xml.belegEinfuegen();
					} else { // Blöcke umschalten
						const auf = this.classList.contains("icon-auge") ? true : false,
							key = this.closest("span").dataset.id;
						xml.elementKopfToggle({auf, key});
					}
				});
			});
		});
	},
};

// FEHLER AN MAIN SCHICKEN
window.addEventListener("error", evt => helfer.onError(evt));
window.addEventListener("unhandledrejection", evt => helfer.onError(evt));
