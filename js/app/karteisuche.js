"use strict";

let karteisuche = {
	// Zwischenspeicher für diese Session, welche Pfade bereits gefunden wurden
	pfadGefunden: [],
	// Suche-Fenster öffnen
	oeffnen () {
		let fenster = document.getElementById("karteisuche");
		overlay.oeffnen(fenster);
		karteisuche.pfadeAuflisten();
		fenster.querySelector("input").focus();
	},
	// Liste der ausgewählten Pfade aufbauen
	pfadeAuflisten () {
		let cont = document.getElementById("karteisuche-pfade");
		helfer.keineKinder(cont);
		// Pfad hinzufügen
		let p = document.createElement("p");
		cont.appendChild(p);
		p.classList.add("add");
		karteisuche.pfadHinzufuegenListener(p);
		let a = document.createElement("a");
		p.appendChild(a);
		a.href = "#";
		a.classList.add("icon-link", "icon-add");
		p.appendChild(document.createTextNode("Pfad hinzufügen"));
		// Pfade auflisten
		const fs = require("fs");
		for (let pfad of optionen.data.karteisuche.pfade) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Lösch-Icon
			let a = document.createElement("a");
			p.appendChild(a);
			a.href = "#";
			a.classList.add("icon-link", "icon-loeschen");
			a.dataset.pfad = pfad;
			karteisuche.pfadEntfernen(a);
			// Pfad
			let span = document.createElement("span");
			p.appendChild(span);
			span.setAttribute("dir", "rtl");
			const text = `\u200E${pfad}\u200E`; // vgl. meta.oeffnen()
			span.textContent = text;
			span.title = text;
			// Existiert der Pfad noch?
			if (karteisuche.pfadGefunden.includes(pfad)) {
				continue;
			}
			if (fs.existsSync(pfad)) {
				karteisuche.pfadGefunden.push(pfad);
			} else {
				let img = document.createElement("img");
				span.insertBefore(img, span.firstChild);
				img.src = "img/fehler.svg";
				img.width = "24";
				img.height = "24";
				karteisuche.pfadFehler(img);
			}
		}
	},
	// Pfad zur Pfadliste hinzufügen (Listener)
	//   p = Element
	//     (der Absatz zum Hinzufügen des Pfades)
	pfadHinzufuegenListener (p) {
		p.addEventListener("click", function(evt) {
			evt.stopPropagation();
			karteisuche.pfadHinzufuegen();
		});
	},
	// Pfad zur Pfadliste hinzufügen
	pfadHinzufuegen () {
		const {app, dialog} = require("electron").remote;
		let opt = {
			title: "Pfad hinzufügen",
			defaultPath: app.getPath("documents"),
			properties: [
				"openDirectory",
			],
		};
		dialog.showOpenDialog(null, opt, function(pfad) { // pfad ist ein Array!
			if (pfad === undefined) {
				kartei.dialogWrapper("Sie haben keinen Pfad ausgewählt.");
				return;
			}
			// Ist der Pfad schon in der Liste?
			if (optionen.data.karteisuche.pfade.includes(pfad[0])) {
				kartei.dialogWrapper("Der gewählte Pfad wurde schon aufgenommen.");
				return;
			}
			// Pfad hinzufügen
			karteisuche.pfadGefunden.push(pfad[0]);
			optionen.data.karteisuche.pfade.push(pfad[0]);
			optionen.speichern();
			// Liste auffrischen
			karteisuche.pfadeAuflisten();
		});
	},
	// Pfad aus der Liste entfernen
	//   a = Element
	//     (das Lösch-Icon)
	pfadEntfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// Pfad entfernen
			const pfad = this.dataset.pfad;
			karteisuche.pfadGefunden.splice(karteisuche.pfadGefunden.indexOf(pfad), 1);
			optionen.data.karteisuche.pfade.splice(optionen.data.karteisuche.pfade.indexOf(pfad), 1);
			optionen.speichern();
			// Liste auffrischen
			karteisuche.pfadeAuflisten();
		});
	},
	// Reaktion auf Klick auf dem Fehler-Icon
	//   img = Element
	//     (das Fehler-Icon)
	pfadFehler (img) {
		img.addEventListener("click", function() {
			dialog.oeffnen("alert");
			dialog.text("Der Pfad konnte nicht gefunden werden.");
		});
	},
	// Suche vorbereiten
	suchenPrep () {
		document.querySelector("#karteisuche input").blur();
		document.getElementById("karteisuche-suche-laeuft").classList.remove("aus");
		setTimeout(function() {
			karteisuche.suchen();
		}, 500);
	},
	// Suche starten
	suchen () {
		// Erst Pfad hinzufügen!
		if (!optionen.data.karteisuche.pfade.length) {
			dialog.oeffnen("alert", function() {
				karteisuche.pfadHinzufuegen();
			});
			dialog.text("Sie müssen zunächst einen Pfad hinzufügen.\nIn diesem Ordner wird dann gesucht.");
			document.getElementById("karteisuche-suche-laeuft").classList.add("aus");
			return;
		}
		// Keiner der Pfade wurde gefunden!
		if (!karteisuche.pfadGefunden.length) {
			dialog.oeffnen("alert");
			let text = "Der Pfad in der Liste konnte nicht gefunden werden.";
			if (optionen.data.karteisuche.pfade.length > 1) {
				text = "Die Pfade in der Liste konnten nicht gefunden werden.";
			}
			dialog.text(text);
			document.getElementById("karteisuche-suche-laeuft").classList.add("aus");
			return;
		}
		// Suche starten
		karteisuche.wgd = [];
		const fs = require("fs");
		for (let pfad of karteisuche.pfadGefunden) {
			if (fs.existsSync(pfad)) {
				karteisuche.wgdFinden(pfad);
			}
		}
		// Karteien analysieren
		for (let kartei of karteisuche.wgd) {
			const fs = require("fs"),
				content = fs.readFileSync(kartei.pfad, {encoding: "utf-8", flag: "r"});
			// Kartei einlesen
			let datei = "";
			try {
				datei = JSON.parse(content);
			} catch (err) {
				continue;
			}
			// keine WGD-Datei
			if (datei.ty !== "wgd") {
				continue;
			}
			// Wort merken
			kartei.wort = datei.wo;
			// mit Suchfiltern abgleichen TODO
			kartei.passt = true;
		}
		// passende Karteien auflisten
		karteisuche.wgdAuflisten();
		// Sperrbild weg
		document.getElementById("karteisuche-suche-laeuft").classList.add("aus");
	},
	// WGD-Dateien, die gefunden wurden;
	// Array enthält Objekte:
	//   pfad (String; Pfad zur Kartei)
	//   wort (String; Wort der Kartei)
	//   passt (Boolean; passt zu den Suchfiltern)
	wgd: [],
	// WGD-Dateien suchen
	//   pfadStart = String
	//     (Ordner von dem aus die Suche beginnen soll)
	wgdFinden (pfadStart) {
		const fs = require("fs"),
			path = require("path");
		let inhalt = fs.readdirSync(pfadStart);
		for (let i of inhalt) {
			const pfad = path.join(pfadStart, i);
			let stat = fs.lstatSync(pfad);
			if (stat.isDirectory()){
				karteisuche.wgdFinden(pfad);
			} else if (/\.wgd$/.test(pfad)) {
				karteisuche.wgd.push({
					pfad: pfad,
					wort: "",
					passt: false,
				});
			}
		}
	},
	// WGD-Dateien auflisten
	wgdAuflisten () {
		let treffer = 0,
			woerter = [];
		for (let i = 0, len = karteisuche.wgd.length; i < len; i++) {
			if (!karteisuche.wgd[i].passt) {
				continue;
			}
			treffer++;
			woerter.push({
				wort: karteisuche.wgd[i].wort,
				i: i,
			});
		}
		woerter.sort(function(a, b) {
			let arr = [a.wort, b.wort];
			arr.sort(helfer.sortAlpha);
			if (a.wort === arr[0]) {
				return -1;
			}
			return 1;
		});
		// Treffer anzeigen
		let text = "keine Karteien gefunden";
		if (treffer === 1) {
			text = "1 Kartei gefunden";
		} else if (treffer > 1) {
			text = `${treffer} Karteien gefunden`;
		}
		document.getElementById("karteisuche-treffer").textContent = text;
		// Karteiliste füllen
		let cont = document.getElementById("karteisuche-karteien");
		helfer.keineKinder(cont);
		for (let wort of woerter) {
			let p = document.createElement("p");
			cont.appendChild(p);
			let pfad = karteisuche.wgd[wort.i].pfad;
			p.dataset.pfad = pfad;
			karteisuche.wgdOeffnen(p);
			// Wort
			let span = document.createElement("span");
			p.appendChild(span);
			span.textContent = wort.wort;
			// Pfad
			span = document.createElement("span");
			p.appendChild(span);
			span.textContent = pfad;
			span.title = pfad;
		}
	},
	// WGD-Datei in neuem Fenster öffnen
	//   p = Element
	//     (Absatz, der auf eine WGD-Datei verweist)
	wgdOeffnen (p) {
		p.addEventListener("click", function() {
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("kartei-laden", this.dataset.pfad);
		});
	},
};
