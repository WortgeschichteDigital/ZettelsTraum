"use strict";

// INITIALISIERUNG DER APP
window.addEventListener("load", async () => {
	// VARIABLEN ANLEGEN
	// Infos zu App und Fenster erfragen
	const {ipcRenderer} = require("electron");
	let info = await ipcRenderer.invoke("infos-senden");
	window.appInfo = info.appInfo;
	window.winInfo = info.winInfo;

	// globales Datenobjekt für Kartei
	window.data = {};

	// IPC-LISTENER INITIALISIEREN
	// Menüpunkte
	ipcRenderer.on("app-karteisuche", () => karteisuche.oeffnen());
	ipcRenderer.on("app-einstellungen", () => optionen.oeffnen());
	ipcRenderer.on("kartei-erstellen", () => kartei.wortErfragen());
	ipcRenderer.on("kartei-oeffnen", (evt, datei) => {
		if (datei) {
			kartei.oeffnenEinlesen(datei);
		} else {
			kartei.oeffnen();
		}
	});
	ipcRenderer.on("kartei-speichern", () => speichern.kaskade());
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
	ipcRenderer.on("belege-hinzufuegen", () => {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Belege &gt; Hinzufügen</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		speichern.checkInit(() => beleg.erstellen());
	});
	ipcRenderer.on("belege-auflisten", () => {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Belege &gt; Auflisten</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		speichern.checkInit(() => liste.wechseln());
	});
	ipcRenderer.on("belege-kopieren", () => kopieren.init());
	ipcRenderer.on("belege-einfuegen", () => kopieren.einfuegen());
	ipcRenderer.on("hilfe-demo", () => helfer.demoOeffnen());
	// Kopierfunktion
	ipcRenderer.on("kopieren-basisdaten", () => kopieren.basisdatenSenden());
	ipcRenderer.on("kopieren-basisdaten-empfangen", (evt, daten) => kopieren.einfuegenBasisdatenEintragen(daten));
	ipcRenderer.on("kopieren-daten", () => kopieren.datenSenden());
	ipcRenderer.on("kopieren-daten-empfangen", (evt, daten) => kopieren.einfuegenEinlesen(daten));
	// Einstellungen
	ipcRenderer.on("optionen-empfangen", (evt, data) => optionen.empfangen(data));
	ipcRenderer.on("optionen-zuletzt", (evt, karteien) => zuletzt.update(karteien));
	ipcRenderer.on("optionen-zuletzt-verschwunden", (evt, verschwunden) => zuletzt.verschwundenUpdate(verschwunden));
	ipcRenderer.on("optionen-fenster", (evt, fenster, status) => optionen.data[fenster] = status);
	// Bedeutungsgerüst-Fenster
	ipcRenderer.on("bedeutungen-fenster-daten", () => bedeutungenWin.daten());
	ipcRenderer.on("bedeutungen-fenster-geschlossen", () => bedeutungenWin.contentsId = 0);
	ipcRenderer.on("bedeutungen-fenster-drucken", (evt, gn) => {
		drucken.init("bedeutungen-", gn);
		helfer.fensterFokus();
	});
	ipcRenderer.on("bedeutungen-fenster-umtragen", (evt, bd, eintragen) => {
		beleg.bedeutungEinAustragen(bd, eintragen);
		helfer.fensterFokus();
	});
	// Dialog
	ipcRenderer.on("dialog-anzeigen", (evt, text) => {
		dialog.oeffnen({
			typ: "alert",
			text: text,
		});
	});
	// Before-Unload
	ipcRenderer.on("before-unload", () => helfer.beforeUnload());

	// EVENTS: TASTATUREINGABEN
	document.addEventListener("keydown", tastatur.init);

	// EVENTS: RECHTSKLICK
	window.addEventListener("contextmenu", evt => {
		evt.preventDefault();
		popup.oeffnen(evt);
	});

	// EVENTS: DRAG & DROP
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

	// EVENTS: ELEMENTE
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
	// aktives Element für Quick-Access-Bar zwischenspeichern
	document.addEventListener("mousedown", function() {
		quick.accessRolesActive = document.activeElement;
	});
	// Wort-Element
	document.getElementById("wort").addEventListener("click", () => kartei.wortAendern());
	// Erinnerungen-Icon
	document.getElementById("erinnerungen-icon").addEventListener("click", () => erinnerungen.show());
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
	document.getElementById("beleg-bs").addEventListener("paste", evt => beleg.pasteBs(evt));
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
	document.getElementById("kopieren-einfuegen-einfuegen").addEventListener("click", () => speichern.checkInit(() => kopieren.einfuegenAusfuehren()));
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
	document.querySelectorAll("#einstellungen-quick-alle, #einstellungen-quick-standard, #einstellungen-quick-keine").forEach(a => quick.preset(a));
	document.querySelectorAll("#quick-config div:nth-child(2) img").forEach(img => quick.eventsPfeile(img));
	optionen.anwendenNotizenFilterleiste(document.getElementById("einstellung-notizen-filterleiste"));
	document.getElementById("tags-laden").addEventListener("click", () => optionen.tagsManuLaden());
	document.getElementById("tags-zuruecksetzen").addEventListener("click", () => optionen.tagsZuruecksetzen());
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
	document.getElementById("notizen-feld").addEventListener("paste", evt => notizen.paste(evt));
	// Anhänge (Fenster und Karteikartei)
	document.querySelectorAll(".anhaenge-add input").forEach(i => anhaenge.add(i));
	// Lexika-Fenster
	document.querySelectorAll("#lexika input").forEach(i => {
		if (i.type === "button") {
			lexika.aktionButton(i);
		} else { // Text-Input
			lexika.aktionText(i);
		}
	});
	// Metadaten-Fenster
	document.getElementById("meta-ordner").addEventListener("click", () => {
		if (kartei.pfad) {
			helfer.ordnerOeffnen(kartei.pfad);
		}
	});
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
		tastatur.detectModifiers(evt);
		if (!tastatur.modifiers && evt.key === "Enter") {
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

	// VISUELLE ANPASSUNGEN
	// App-Namen eintragen
	document.querySelectorAll(".app-name").forEach(i => i.textContent = appInfo.name);
	// macOS
	if (process.platform === "darwin") {
		// Option zum Ausblenden der Menüleiste verstecken
		let option = document.getElementById("einstellung-autoHideMenuBar").parentNode;
		option.classList.add("aus");
	}
	// Tastaturkürzel ändern
	tastatur.shortcutsText();

	// IPC-ANFRAGEN
	// Bilder vorladen
	let bilderPreload = [],
		bilder = await ipcRenderer.invoke("bilder-senden");
	for (let b of bilder) {
		let img = new Image();
		img.src = `img/${b}`;
		bilderPreload.push(img);
	}
	// Optionen laden
	let opt = await ipcRenderer.invoke("optionen-senden");
	optionen.einlesen(optionen.data, opt);
	optionen.anwenden();

	// FENSTER FREISCHALTEN
	zuletzt.aufbauen();
	helfer.fensterGeladen();
});

// FEHLER AN MAIN SCHICKEN
window.addEventListener("error", evt => helfer.onError(evt));
window.addEventListener("unhandledrejection", evt => helfer.onError(evt));
