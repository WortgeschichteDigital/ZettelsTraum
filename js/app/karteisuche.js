"use strict";

let karteisuche = {
	// Suche-Fenster öffnen
	async oeffnen () {
		let fenster = document.getElementById("karteisuche");
		overlay.oeffnen(fenster);
		// Läuft im aktuellen Fenster gerade eine Suche?
		if (!document.getElementById("karteisuche-suche-laeuft").classList.contains("aus")) {
			return;
		}
		// Suchtiefe aus den Optionen übernehmen
		document.querySelector("#karteisuche-suchenTiefe").value = optionen.data.karteisuche.tiefe;
		// Cache laden
		const {ipcRenderer} = require("electron");
		karteisuche.ztjCache = await ipcRenderer.invoke("ztj-cache-get");
		// Suchbutton fokussieren
		let buttons = fenster.querySelectorAll(`input[type="button"]`);
		if (Object.keys(karteisuche.ztjCache).length) {
			buttons[1].classList.remove("aus");
			buttons[1].focus();
		} else {
			buttons[0].focus();
		}
		// Pfade auflisten
		karteisuche.pfadeAuflisten();
		// ggf. eine ID für die Filter erzeugen
		if (karteisuche.makeId === null) {
			karteisuche.makeId = karteisuche.idGenerator(1);
		}
		// ggf. die Filter wiederherstellen
		if (!document.querySelector(".karteisuche-filter") &&
				optionen.data.karteisuche.filter.length) {
			karteisuche.filterWiederherstellen();
		}
	},
	// Liste der ausgewählten Pfade aufbauen
	pfadeAuflisten () {
		// Check-Status sichern
		let status = Array(optionen.data.karteisuche.pfade.length).fill(true),
			inputs = document.querySelectorAll("#karteisuche-pfade input");
		for (let i = 0, len = inputs.length; i < len; i++) {
			if (!inputs[i].checked) {
				status[i] = false;
			}
		}
		// Content leeren
		let cont = document.getElementById("karteisuche-pfade");
		cont.replaceChildren();
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
		for (let i = 0, len = optionen.data.karteisuche.pfade.length; i < len; i++) {
			const pfad = optionen.data.karteisuche.pfade[i];
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
			span.dataset.pfad = pfad; // wegen des Rechtsklickmenüs
			span.title = pfad;
			// ggf. Checkbox einblenden
			if (len > 1) {
				let input = document.createElement("input");
				span.insertBefore(input, span.firstChild);
				input.checked = status[i];
				input.id = `pfad-${i + 1}`;
				input.type = "checkbox";
				input.value = pfad;
				let label = document.createElement("label");
				span.appendChild(label);
				label.setAttribute("for", `pfad-${i + 1}`);
				label.textContent = pfad;
			} else {
				span.textContent = pfad;
			}
		}
		tooltip.init(p);
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
	async pfadHinzufuegen () {
		let opt = {
			title: "Pfad hinzufügen",
			defaultPath: appInfo.documents,
			properties: [
				"openDirectory",
			],
		};
		// Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
		if (optionen.data.letzter_pfad) {
			opt.defaultPath = optionen.data.letzter_pfad;
		}
		// Dialog anzeigen
		const {ipcRenderer} = require("electron");
		let result = await ipcRenderer.invoke("datei-dialog", {
			open: true,
			winId: winInfo.winId,
			opt: opt,
		});
		// Fehler oder keine Datei ausgewählt
		if (result.message || !Object.keys(result).length) { // Fehler
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) { // keine Datei ausgewählt
			return;
		}
		// Ist der Pfad schon in der Liste?
		if (optionen.data.karteisuche.pfade.includes(result.filePaths[0])) {
			dialog.oeffnen({
				typ: "alert",
				text: "Der gewählte Pfad wurde schon aufgenommen.",
			});
			return;
		}
		// Pfad hinzufügen
		optionen.data.karteisuche.pfade.push(result.filePaths[0]);
		optionen.speichern();
		// Liste auffrischen
		karteisuche.pfadeAuflisten();
		// Maximalhöhe Trefferliste setzenclearTimeout(helfer.resizeTimeout);
		helfer.elementMaxHeight({
			ele: document.getElementById("karteisuche-karteien"),
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
			optionen.data.karteisuche.pfade.splice(optionen.data.karteisuche.pfade.indexOf(pfad), 1);
			optionen.speichern();
			// Liste auffrischen
			karteisuche.pfadeAuflisten();
			// Maximalhöhe Trefferliste setzen
			helfer.elementMaxHeight({
				ele: document.getElementById("karteisuche-karteien"),
			});
		});
	},
	// speichert die Suchttiefe, also die Angaben darüber, wie viele Ordner
	// in die Tiefe gegangen wird, um nach ZTJ-Dateien zu suchen;
	//   1 = nur im angegebenen Ordner suchen
	//   2 = bis zu einen Ordner tief gehen
	//   3 = bis zu zwei Ordner tief gehen
	//   ...
	suchenTiefe: 0,
	// speichert das Input-Element, das vor dem Start der Suche den Fokus hatte
	suchenFokus: null,
	// Suche vorbereiten
	async suchenPrep () {
		// Fehler: kein Pfad hinzugefügt
		if (!optionen.data.karteisuche.pfade.length) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie müssen zunächst einen Pfad hinzufügen.",
				callback: () => {
					karteisuche.pfadHinzufuegen();
				},
			});
			karteisuche.animation(false);
			return;
		}
		// Pfade ermitteln, in denen gesucht werden soll und kann
		let pfade = [],
			inputs = document.querySelectorAll("#karteisuche-pfade input"),
			nichtGefunden = 0,
			abgehakt = 0;
		if (inputs.length) {
			for (let i of inputs) {
				if (!i.checked) {
					continue;
				}
				abgehakt++;
				const exists = await helfer.exists(i.value);
				if (exists) {
					pfade.push(i.value);
					karteisuche.markierungPfad(i.value, false);
				} else {
					nichtGefunden++;
					karteisuche.markierungPfad(i.value, true);
				}
			}
		} else {
			abgehakt++;
			const pfad = optionen.data.karteisuche.pfade[0],
				exists = await helfer.exists(pfad);
			if (exists) {
				pfade.push(pfad);
				karteisuche.markierungPfad(pfad, false);
			} else {
				nichtGefunden++;
				karteisuche.markierungPfad(pfad, true);
			}
		}
		// Fehler: kein Pfad ausgewählt
		if (!abgehakt) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie müssen zunächst einen Pfad auswählen.",
			});
			karteisuche.animation(false);
			return;
		}
		// Fehler: keiner der (ausgewählten) Pfade wurde wiedergefunden
		if (nichtGefunden === abgehakt) {
			let ausgewaehlt = "";
			if (abgehakt < optionen.data.karteisuche.pfade.length) {
				ausgewaehlt = " ausgewählte";
				if (abgehakt > 1) {
					ausgewaehlt = " ausgewählten";
				}
			}
			let text = `Der${ausgewaehlt} Pfad wurde nicht wiedergefunden.`;
			if (abgehakt > 1) {
				text = `Keiner der${ausgewaehlt} Pfade wurde wiedergefunden.`;
			}
			dialog.oeffnen({
				typ: "alert",
				text: text,
			});
			karteisuche.animation(false);
			return;
		}
		// Suche starten
		await karteisuche.suchenPrepZtj(pfade);
	},
	// markiert einen Pfad, wenn er nicht gefunden wurde, und demarkiert ihn,
	// wenn er gefunden wurde
	//   pfad = String
	//     (der Pfad)
	//   verschwunden = Boolean
	//     (der Pfad ist verschwunden)
	markierungPfad (pfad, verschwunden) {
		// betreffenden Span finden
		pfad = pfad.replace(/\\/g, "\\\\"); // Backslash in Windows-Pfaden maskieren!
		let span = document.querySelector(`#karteisuche-pfade [title="${pfad}"]`),
			img = span.querySelector("img");
		// Bild ggf. entfernen
		if (!verschwunden) {
			if (img) {
				img.parentNode.removeChild(img);
			}
			return;
		}
		// Bild ggf. hinzufügen
		if (img) {
			return;
		}
		let x = document.createElement("img");
		span.insertBefore(x, span.lastChild);
		x.src = "img/x-dick-rot.svg";
		x.width = "24";
		x.height = "24";
		karteisuche.markierungFehler(x);
	},
	// Reaktion auf Klick auf dem Fehler-Icon
	//   img = Element
	//     (das Fehler-Icon)
	markierungFehler (img) {
		img.addEventListener("click", function() {
			dialog.oeffnen({
				typ: "alert",
				text: `Der Pfad\n<p class="force-wrap"><i>${this.parentNode.title}</i></p>\nkonnte nicht gefunden werden.`,
			});
		});
	},
	// ZTJ-Dateien zusammentragen
	//   pfade = Array
	//     (Pfade, in denen gesucht werden soll;
	//     das Array ist leer, wenn im Cache gesucht werden soll)
	async suchenPrepZtj (pfade) {
		const {ipcRenderer} = require("electron"),
			status = await ipcRenderer.invoke("ztj-cache-status-get");
		// Abbruch, falls bereits eine Suche läuft
		if (status) {
			dialog.oeffnen({
				typ: "alert",
				text: "Es läuft bereits eine Karteisuche.\nSie müssen warten, bis diese beendet ist.",
			});
			return;
		}
		// speichern, dass die Suche läuft
		ipcRenderer.invoke("ztj-cache-status-set", true);
		// Cache-Daten aus Main holen
		karteisuche.ztjCache = await ipcRenderer.invoke("ztj-cache-get");
		// Element mit Fokus speichern
		karteisuche.suchenFokus = document.querySelector("#karteisuche input:focus");
		if (karteisuche.suchenFokus) {
			karteisuche.suchenFokus.blur();
		} else {
			karteisuche.suchenFokus = null;
		}
		// Animation einblenden
		karteisuche.animation(true);
		// Dateien suchen
		const fs = require("fs"),
			fsP = fs.promises;
		karteisuche.suchenTiefe = parseInt(document.querySelector("#karteisuche-suchenTiefe").value, 10);
		await new Promise(resolve => {
			setTimeout(async () => {
				karteisuche.ztj = [];
				if (pfade.length) {
					// Dateien auf Speichermedium suchen
					for (let ordner of pfade) {
						const exists = await helfer.exists(ordner);
						if (exists) {
							try {
								await fsP.access(ordner, fs.constants.R_OK); // Lesezugriff auf Basisordner? Wenn kein Zugriff => throw
								await karteisuche.ordnerParsen(ordner, 1);
							} catch (err) { // wahrscheinlich besteht kein Zugriff auf den Pfad
								karteisuche.suchenAbschluss();
								dialog.oeffnen({
									typ: "alert",
									text: `Die Karteisuche wurde wegen eines Fehlers nicht gestartet.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`,
								});
								resolve(false);
								return;
							}
						}
					}
				} else {
					// aktive Pfade ermitteln
					let pfade = [];
					document.querySelectorAll("#karteisuche-pfade span[data-pfad]").forEach(i => {
						const input = i.querySelector("input");
						if (input && input.checked ||
								!input) {
							const reg = new RegExp("^" + helfer.escapeRegExp(i.dataset.pfad));
							pfade.push(reg);
						}
					});
					// Dateidaten aus dem Cache zusammentragen
					for (let pfad of Object.keys(karteisuche.ztjCache)) {
						let pfadAktiv = false;
						for (const reg of pfade) {
							if (reg.test(pfad)) {
								pfadAktiv = true;
								break;
							}
						}
						if (!pfadAktiv) {
							// Dateien aus inaktiven Pfaden ignorieren
							continue;
						}
						karteisuche.ztj.push({
							pfad: pfad,
							ctime: karteisuche.ztjCache[pfad].ctime,
							wort: "",
							wortSort: "",
							redaktion: [],
							nebenlemmata: [],
							behandeltIn: "",
							behandeltMit: [],
							passt: false,
						});
					}
				}
				await karteisuche.suchen();
				resolve(true);
			}, 500);
		});
	},
	// Suche starten
	async suchen () {
		// Filterwerte sammeln
		karteisuche.filterWerteSammeln();
		// Karteien analysieren
		const {ipcRenderer} = require("electron");
		let ztjAdd = [],
			ztjMit = {},
			nebenlemmata = new Set();
		for (let kartei of karteisuche.ztj) {
			// Kartei einlesen
			let datei = {};
			if (karteisuche.ztjCache[kartei.pfad] &&
					kartei.ctime === karteisuche.ztjCache[kartei.pfad].ctime) {
				// aus Cache holen
				datei = karteisuche.ztjCache[kartei.pfad].data;
			} else {
				// vom Speichermedium holen
				const content = await io.lesen(kartei.pfad);
				try {
					datei = JSON.parse(content);
				} catch (err) {
					continue;
				}
				// keine ZTJ-Datei
				// (bis Version 0.24.0 stand in dem Feld "wgd")
				if (!/^(wgd|ztj)$/.test(datei.ty)) {
					continue;
				}
				// Kartei cachen
				ipcRenderer.invoke("ztj-cache-save", {
					pfad: kartei.pfad,
					ctime: kartei.ctime,
					data: datei,
				});
				karteisuche.ztjCache[kartei.pfad] = { // Arbeitskopie im Fenster up-to-date halten
					ctime: kartei.ctime,
					data: datei,
				};
			}
			// Werden in der Kartei mehrere Wörter behandelt?
			let woerter = datei.wo.split(", ");
			for (let i = 0, len = woerter.length; i < len; i++) {
				let ziel = kartei;
				if (i > 0) {
					ztjAdd.push({
						pfad: kartei.pfad,
						ctime: kartei.ctime,
						wort: "",
						wortSort: "",
						redaktion: [],
						nebenlemmata: [],
						behandeltIn: "",
						behandeltMit: [],
						passt: false,
					});
					ziel = ztjAdd[ztjAdd.length - 1];
				}
				// Wort merken
				ziel.wort = woerter[i];
				ziel.wortSort = karteisuche.wortSort(woerter[i]);
				// Nebenlemmata
				if (datei.rd.nl) {
					datei.rd.nl.split(/, */).forEach(nl => {
						if (!nl) {
							return;
						}
						nebenlemmata.add(nl);
						ziel.nebenlemmata.push(nl);
						if (!ziel.behandeltMit.includes(nl)) {
							ziel.behandeltMit.push(nl);
						}
						if (!ztjMit[woerter[i]]) {
							ztjMit[woerter[i]] = [];
						}
						if (!ztjMit[woerter[i]].includes(nl)) {
							ztjMit[woerter[i]].push(nl);
						}
					});
				}
				// Behandelt-Datensätze
				if (woerter.length > 1 &&
						!datei.rd.bh) {
					let mit = [...woerter];
					mit.splice(i, 1);
					ziel.behandeltMit = [...mit];
				}
				if (datei.rd.bh) {
					nebenlemmata.add(woerter[i]);
					ziel.behandeltIn = datei.rd.bh;
					if (!ztjMit[datei.rd.bh]) {
						ztjMit[datei.rd.bh] = [];
					}
					if (!ztjMit[datei.rd.bh].includes(woerter[i])) {
						ztjMit[datei.rd.bh].push(woerter[i]);
					}
				}
				// Redaktionsereignisse klonen
				let er = datei.rd.er;
				if (!er) {
					// bis Dateiformat Version 12 standen die Redaktionsereignisse in data.rd;
					// erst danach in data.rd.er
					er = datei.rd;
				}
				for (const erg of er) {
					ziel.redaktion.push({...erg});
				}
			}
		}
		// Karteiliste ggf. ergänzen
		karteisuche.ztj = karteisuche.ztj.concat(ztjAdd);
		for (const i of karteisuche.ztj) {
			// Wörter ergänzen, die mit dem Wort der aktuellen Kartei behandelt werden
			if (ztjMit[i.wort]) {
				for (const mit of ztjMit[i.wort]) {
					if (!i.behandeltMit.includes(mit)) {
						i.behandeltMit.push(mit);
					}
				}
			}
			// ggf. Einträge der Nebenlemmata ergänzen
			if (i.nebenlemmata.length) {
				forX: for (const nl of i.nebenlemmata) {
					for (const ztj of karteisuche.ztj) {
						if (ztj.wort === nl) {
							continue forX;
						}
					}
					const obj = {
						pfad: i.pfad,
						ctime: i.ctime,
						wort: nl,
						wortSort: karteisuche.wortSort(nl),
						redaktion: [],
						nebenlemmata: [],
						behandeltIn: i.wort,
						behandeltMit: [],
						passt: i.passt,
					};
					karteisuche.ztj.push(obj);
				}
			}
		}
		// Redaktionsereignisse ggf. aus der übergeordneten Kartei holen
		for (const i of karteisuche.ztj) {
			if (!i.behandeltIn) {
				continue;
			}
			for (const j of karteisuche.ztj) {
				if (j.wort === i.behandeltIn) {
					i.redaktion = [];
					for (const erg of j.redaktion) {
						i.redaktion.push({...erg});
					}
					break;
				}
			}
		}
		// Karteien filtern
		for (const kartei of karteisuche.ztj) {
			if (!karteisuche.ztjCache[kartei.pfad]) {
				continue;
			}
			let datei = karteisuche.ztjCache[kartei.pfad].data;
			if (datei.rd.er) {
				datei.rd.er = kartei.redaktion;
			} else {
				datei.rd = kartei.redaktion;
			}
			kartei.passt = karteisuche.filtern(datei);
		}
		// ggf. Karteien nach Lemmatyp filtern
		// (da die Lemmatypen keine Eigenschaft der Karteien sind, kann dieser Filter
		// nicht in karteisuche.filtern() angewendet werden)
		const lt = karteisuche.filterWerte.filter(i => i.typ === "Lemmatyp");
		if (lt.length) {
			for (const i of karteisuche.ztj) {
				if (lt[0].lt === "Hauptlemma" && nebenlemmata.has(i.wort) ||
						lt[0].lt === "Nebenlemma" && !nebenlemmata.has(i.wort)) {
					i.passt = false;
				}
			}
		}
		// passende Karteien auflisten
		karteisuche.ztjAuflisten();
		// ggf. Cache-Button ein- oder ausblenden
		let button = document.querySelectorAll(`#karteisuche input[type="button"]`)[1];
		if (karteisuche.ztj.length ||
				Object.keys(karteisuche.ztjCache).length) {
			button.classList.remove("aus");
		} else {
			button.classList.add("aus");
		}
		// Sperrbild weg, Status zurücksetzen
		karteisuche.suchenAbschluss();
		// Filter speichern
		karteisuche.filterSpeichern();
		// Systemmeldung ausgeben
		let notifyOpts = {
			body: "Die Karteisuche ist abgeschlossen!",
			icon: "img/icon/linux/icon_128px.png",
			lang: "de",
		};
		switch (process.platform) {
			case "darwin":
				notifyOpts.icon = "img/icon/mac/icon.icns";
				break;
			case "win32":
				notifyOpts.icon = "img/icon/win/icon.ico";
				break;
		}
		new Notification(appInfo.name, notifyOpts);
	},
	// Karteisuche abschließen (bei Erfolg oder vorzeitigem Abbruch)
	suchenAbschluss () {
		const {ipcRenderer} = require("electron");
		// Sperrbild weg und das zuletzt fokussierte Element wieder fokussieren
		karteisuche.animation(false);
		if (karteisuche.suchenFokus) {
			karteisuche.suchenFokus.focus();
		}
		// Status der Karteisuche zurücksetzen
		ipcRenderer.invoke("ztj-cache-status-set", false);
	},
	// ZTJ-Dateien, die gefunden wurden;
	// Array enthält Objekte:
	//   pfad (String; Pfad zur Kartei)
	//   ctime (String; Änderungsdatum der Kartei)
	//   wort (String; Wort der Kartei)
	//   wortSort (String; Sortierform des Worts der Kartei)
	//   redaktion (Array; Klon von data.rd.er)
	//   nebenlemmata (Array; Liste der Nebenlemmata)
	//   behandeltIn (String; Wort, in dem das aktuelle Wort behandelt wird)
	//   behandeltMit (Array; Lemmata, die mit dem aktuellen Wort behandelt werden)
	//   passt (Boolean; passt zu den Suchfiltern)
	ztj: [],
	// Cache für ZTJ-Dateien
	// (wird beim Öffnen des Fensters und Start einer Suche aus Main geholt;
	// Schlüssel ist der Pfad der ZTJ-Datei)
	//   ctime (String; Änderungsdatum der Kartei)
	//   data (Object; die kompletten Karteidaten)
	ztjCache: {},
	// findet alle Pfade in einem übergebenen Ordner
	//   ordner = String
	//     (Ordner, von dem aus die Suche beginnen soll)
	//   suchtiefe = Number
	//     (Tiefe gezählt vom Startordner aus; Startordner = 1)
	ordnerParsen (ordner, suchtiefe) {
		suchtiefe++;
		return new Promise(async resolve => {
			try {
				const fsP = require("fs").promises,
					files = await fsP.readdir(ordner);
				for (let i of files) {
					const path = require("path"),
						pfad = path.join(ordner, i);
					await karteisuche.pfadPruefen(pfad, suchtiefe);
				}
				resolve(true);
			} catch (err) { // Auslesen des Ordners fehlgeschlagen
				resolve(false);
			}
		});
	},
	// überprüft einen übergebenen Pfad: Ordner oder ZTJ-Datei?
	//   pfad = String
	//     (Ordner, von dem aus die Suche beginnen soll)
	//   suchtiefe = Number
	//     (Tiefe gezählt vom Startordner aus; Startordner = 1)
	pfadPruefen (pfad, suchtiefe) {
		return new Promise(async resolve => {
			try {
				let stats; // Natur des Pfades?
				if (/\.ztj$/.test(pfad) ||
						!/\.[a-z]{3,4}/.test(pfad)) {
					// zur Beschleunigung nur testen, wenn ZTJ-Datei oder wahrscheinlich Ordner
					const fsP = require("fs").promises;
					stats = await fsP.lstat(pfad);
				}
				if (stats?.isDirectory() && // Ordner => parsen
						suchtiefe <= karteisuche.suchenTiefe) { // nur bis zu dieser Verschachtelungstiefe suchen
					await karteisuche.ordnerParsen(pfad, suchtiefe);
				} else if (/\.ztj$/.test(pfad)) { // ZTJ-Datei => merken
					karteisuche.ztj.push({
						pfad: pfad,
						ctime: stats.ctime.toString(),
						wort: "",
						wortSort: "",
						redaktion: [],
						nebenlemmata: [],
						behandeltIn: "",
						behandeltMit: [],
						passt: false,
					});
				}
				resolve(true);
			} catch (err) { // wahrscheinlich besteht kein Zugriff auf den Pfad
				resolve(false);
			}
		});
	},
	// ZTJ-Dateien auflisten
	ztjAuflisten () {
		let treffer = 0,
			woerter = [];
		for (let i = 0, len = karteisuche.ztj.length; i < len; i++) {
			if (!karteisuche.ztj[i].passt) {
				continue;
			}
			treffer++;
			woerter.push({
				wort: karteisuche.ztj[i].wort,
				wortSort: karteisuche.ztj[i].wortSort,
				i: i,
			});
		}
		woerter.sort(function(a, b) {
			let arr = [a.wortSort, b.wortSort];
			arr.sort(helfer.sortAlpha);
			if (a.wortSort === arr[0]) {
				return -1;
			}
			return 1;
		});
		// Treffer anzeigen
		document.getElementById("karteisuche-treffer").textContent = `(${treffer})`;
		// Karteiliste füllen
		let cont = document.getElementById("karteisuche-karteien"),
			alphabet = new Set();
		cont.scrollTop = 0;
		cont.replaceChildren();
		for (let wort of woerter) {
			// Absatz
			let div = document.createElement("div");
			cont.appendChild(div);
			let alpha = karteisuche.wortAlpha(wort.wortSort);
			alphabet.add(alpha);
			div.dataset.buchstabe = alpha;
			div.dataset.idx = wort.i;
			// Link
			let a = document.createElement("a");
			div.appendChild(a);
			a.href = "#";
			let pfad = karteisuche.ztj[wort.i].pfad;
			a.dataset.pfad = pfad;
			karteisuche.ztjOeffnen(a);
			// Wort
			let span = document.createElement("span");
			a.appendChild(span);
			span.textContent = wort.wort;
			// Pfad
			span = document.createElement("span");
			a.appendChild(span);
			span.textContent = pfad;
			span.title = pfad;
			// ggf. Infos ergänzen
			karteisuche.ztjAuflistenInfos(div, wort.i);
		}
		tooltip.init(cont);
		// Maximalhöhe Trefferliste setzen
		helfer.elementMaxHeight({
			ele: document.getElementById("karteisuche-karteien"),
		});
		// Alphabet drucken
		karteisuche.alphabet(alphabet);
	},
	// Infos ergänzen (Redaktionsstatus und -ereignisse und Verweise)
	//   div = Element
	//     (der Container, in dem die Ereignisse angezeigt werden sollen)
	//   i = Number
	//     (Index, der auf die Daten in karteisuche.ztj zeigt)
	ztjAuflistenInfos (div, i) {
		// Wrapper erzeugen
		let wrap = document.createElement("div");
		// Redaktionsinfos
		if (karteisuche.filterWerte.some(i => i.typ === "Redaktion")) {
			// Redaktionsstatus drucken
			let status = karteisuche.ztjAuflistenRedaktion(i),
				stat = document.createElement("span");
			wrap.appendChild(stat);
			stat.classList.add("karteisuche-status", `karteisuche-status${status.status}`);
			// höchstes Redaktionsereignis drucken
			let erg = document.createElement("span");
			wrap.appendChild(erg);
			erg.classList.add("karteisuche-hoechst");
			erg.textContent = status.ereignis;
			// Personen und Daten: Wer hat wann was erstellt?
			let erstellt = [
				{
					arr: karteisuche.ztj[i].redaktion.filter(v => v.er === "Kartei erstellt"),
					txt: "Kartei",
				},
				{
					arr: karteisuche.ztj[i].redaktion.filter(v => v.er === "Artikel erstellt"),
					txt: "Artikel",
				},
			];
			let br = false;
			for (let e of erstellt) {
				for (let i of e.arr) {
					if (br) {
						wrap.appendChild(document.createElement("br"));
					}
					let typ = document.createElement("i");
					wrap.appendChild(typ);
					typ.textContent = `${e.txt}:`;
					let da = helfer.datumFormat(i.da, "minuten").split(", ")[0],
						pr = i.pr ? i.pr : "N. N.";
					wrap.appendChild(document.createTextNode(` ${pr} (${da})`));
					br = true;
				}
			}
		}
		// Verweisinfos
		let verweise = karteisuche.ztjAuflistenVerweise(i);
		if (verweise) {
			if (wrap.hasChildNodes()) {
				wrap.appendChild(document.createElement("br"));
			}
			wrap.appendChild(verweise);
			tooltip.init(wrap);
		}
		// Wrapper einhängen, wenn er denn gefüllt wurde
		if (wrap.hasChildNodes()) {
			div.appendChild(wrap);
		}
	},
	// Redaktionsstatus ermitteln
	//   idx = Number
	//     (auf karteisuche.ztj zeigender Index)
	ztjAuflistenRedaktion (idx) {
		let ds = karteisuche.ztj[idx],
			ereignisse = Object.keys(redaktion.ereignisse),
			status = 1,
			status2 = ereignisse.indexOf("Artikel erstellt"),
			status3 = ereignisse.indexOf("Artikel fertig"),
			status4 = ereignisse.indexOf("Artikel online"),
			hoechst = -1;
		for (let i of ds.redaktion) {
			let idx = ereignisse.indexOf(i.er);
			hoechst = idx > hoechst ? idx : hoechst;
		}
		// Status ermitteln
		if (hoechst >= status4) {
			status = 4;
		} else if (hoechst >= status3) {
			status = 3;
		} else if (hoechst >= status2) {
			status = 2;
		}
		return {
			hoechst,
			status,
			status2,
			status3,
			status4,
			ereignis: ereignisse[hoechst],
		};
	},
	// Verweise ermitteln
	//   i = Number
	//     (Index, der auf die Daten in karteisuche.ztj zeigt)
	ztjAuflistenVerweise (i) {
		// Verweise ermitteln
		let verweise = [...new Set(karteisuche.ztj[i].behandeltMit)];
		verweise.sort(helfer.sortAlpha);
		verweise.forEach((i, n) => {
			verweise[n] = `+ ${i}`;
		});
		let bhIn = karteisuche.ztj[i].behandeltIn;
		if (bhIn) {
			verweise.unshift(`→ ${bhIn}`);
		}
		// keine Verweise vorhanden
		if (!verweise.length) {
			return null;
		}
		// Verweise vorhanden
		let span = document.createElement("span");
		span.classList.add("verweise");
		for (let i = 0, len = verweise.length; i < len; i++) {
			if (i > 0) {
				span.appendChild(document.createTextNode(", "));
			}
			let v = verweise[i],
				wrap = document.createElement("span");
			if (/^→/.test(v)) {
				wrap.textContent = "→ ";
				wrap.title = "behandelt in";
			} else {
				wrap.textContent = "+ ";
				wrap.title = "behandelt mit";
			}
			span.appendChild(wrap);
			span.appendChild(document.createTextNode(v.substring(2)));
		}
		return span;
	},
	// ZTJ-Datei in neuem Fenster öffnen
	//   a = Element
	//     (Link, mit dem eine ZTJ-Datei geöffnet werden kann)
	ztjOeffnen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (evt.detail > 1) { // Doppelklicks abfangen
				return;
			}
			// die Kartei könnte bereits in diesem Fenster offen sein
			if (kartei.pfad === this.dataset.pfad) {
				return;
			}
			// Kartei in einem neuen Fenster öffnen
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("kartei-laden", this.dataset.pfad, false);
		});
	},
	// Sortierwort aus dem übergebenen Wort/Ausdruck ableiten
	// (denn das Wort könnte mehrgliedrig sein, Beispiele:
	// politisch korrekt => Rückgabe: politisch;
	// der kleine Mann => Rückgabe: Mann)
	//   wort = String
	//     (Wort oder Ausdruck)
	wortSort (wort) {
		// Homographenziffern entfernen
		wort = wort.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, "");
		let sortform = "";
		for (let i of wort.split(/\s/)) {
			// Artikel ignorieren
			if (/^der|die|das$/.test(i)) {
				continue;
			}
			// erstes Wort, das kein Artikel ist
			if (!sortform) {
				sortform = i;
			}
			// erstes Wort, das mit einem Großbuchstaben beginnt, bevorzugen
			if (/^[A-ZÄÖÜ]/.test(i)) {
				sortform = i;
				break;
			}
		}
		if (!sortform) {
			// das Wort war offenbar ein Artikel
			return wort;
		}
		return sortform;
	},
	// Buchstabe des Alphabets aus dem übergebenen Karteiwort ableiten
	//   wort = String
	//     (das Wort, um das es geht)
	wortAlpha (wort) {
		let erster = wort.substring(0, 1).toUpperCase();
		if (/[0-9]/.test(erster)) {
			erster = "#";
		} else if (/[ÄÖÜ]/.test(erster)) {
			switch (erster) {
				case "Ä":
					erster = "A";
					break;
				case "Ö":
					erster = "O";
					break;
				case "Ü":
					erster = "U";
					break;
			}
		}
		return erster;
	},
	// Alphabet drucken
	//   alpha = Set
	//     (Buchstaben des Alphabets, die auftauchen)
	alphabet (alpha) {
		// Liste löschen
		let cont = document.getElementById("karteisuche-alphabet");
		cont.replaceChildren();
		// keine Treffer
		if (!alpha.size) {
			return;
		}
		// Liste aufbauen
		let alphabet = [...alpha].sort();
		alphabet.unshift("alle");
		for (let i = 0, len = alphabet.length; i < len; i++) {
			let a = document.createElement("a");
			cont.appendChild(a);
			a.dataset.buchstabe = alphabet[i];
			a.href = "#";
			a.textContent = alphabet[i];
			if (i === 0) {
				a.classList.add("aktiv");
				cont.appendChild(document.createTextNode("|"));
			}
		}
		// Maximalbreite berechnen
		let h = cont.parentNode,
			treffer = document.getElementById("karteisuche-treffer"),
			belegt = treffer.offsetLeft + treffer.offsetWidth + h.lastChild.offsetWidth + 4 + 2 * 25; // 4px Abstand rechts, 2 * 25px Margins zum Alphabet
		cont.style.maxWidth = `calc(100% - ${belegt}px`;
		// Klickevents anhängen
		cont.querySelectorAll("a").forEach(a => karteisuche.alphabetFilter(a));
	},
	// Trefferliste nach Buchstaben filtern
	//   a = Element
	//     (Link für einen oder alle Buchstaben)
	alphabetFilter (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let b = this.dataset.buchstabe,
				liste = document.getElementById("karteisuche-karteien"),
				treffer = 0;
			liste.scrollTop = 0;
			// filtern
			for (let i of liste.childNodes) {
				let anzeigen = false;
				if (b === "alle" || b === i.dataset.buchstabe) {
					anzeigen = true;
				}
				if (anzeigen) {
					i.classList.remove("aus");
					treffer++;
				} else {
					i.classList.add("aus");
				}
			}
			// aktiven Filter markieren
			let alpha = document.getElementById("karteisuche-alphabet");
			alpha.querySelector(".aktiv").classList.remove("aktiv");
			this.classList.add("aktiv");
			// Trefferzahl auffrischen
			document.getElementById("karteisuche-treffer").textContent = `(${treffer})`;
		});
	},
	// Generator zur Erzeugung der nächsten Filter-ID
	makeId: null,
	*idGenerator (id) {
		while (true) {
			yield id++;
		}
	},
	// zur Verfügung stehende Filter-Typen
	filterTypen: {
		"Karteiwort": [
			{
				type: "text",
				ro: false,
				cl: "karteisuche-karteiwort",
				ph: "Suchtext",
				pre: "",
				label: "",
			},
		],
		"Lemmatyp": [
			{
				type: "dropdown",
				ro: true,
				cl: "karteisuche-lemmatyp",
				ph: "",
				pre: "Hauptlemma",
				label: "",
			},
		],
		"Themenfeld": [
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-themenfeld",
				ph: "Themenfeld",
				pre: "",
				label: "",
			},
		],
		"Sachgebiet": [
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-sachgebiet",
				ph: "Sachgebiet",
				pre: "",
				label: "",
			},
		],
		"Volltext": [
			{
				type: "text",
				ro: false,
				cl: "karteisuche-volltext",
				ph: "Suchtext",
				pre: "",
				label: "",
			},
			{
				type: "checkbox",
				ro: false,
				cl: "karteisuche-volltext-genau",
				ph: "genaue Schreibung",
				pre: "",
				label: "",
			},
		],
		"Tag": [
			{
				type: "dropdown",
				ro: true,
				cl: "karteisuche-tag-typ",
				ph: "Typ",
				pre: "",
				label: "",
			},
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-tag",
				ph: "Tag",
				pre: "",
				label: "",
			},
		],
		"Karteidatum": [
			{
				type: "dropdown",
				ro: true,
				cl: "karteisuche-datum-typ",
				ph: "Ereignis",
				pre: "erstellt",
				label: "",
			},
			{
				type: "dropdown",
				ro: true,
				cl: "karteisuche-datum-dir",
				ph: "Zeitrichtung",
				pre: "<=",
				label: "",
			},
			{
				type: "date",
				ro: false,
				cl: "karteisuche-datum",
				ph: "",
				pre: "",
				label: "",
			},
		],
		"BearbeiterIn": [
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-person",
				ph: "Person",
				pre: "",
				label: "",
			},
		],
		"Redaktion": [
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-redaktion-logik",
				ph: "Logik",
				pre: "=",
				label: "",
			},
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-redaktion-ereignis",
				ph: "Ereignis",
				pre: "",
				label: "",
			},
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-redaktion-person",
				ph: "Person",
				pre: "",
				label: "",
			},
		],
		"Redaktionsdatum": [
			{
				type: "date",
				ro: false,
				cl: "karteisuche-redaktionsdatum-von",
				ph: "",
				pre: "",
				label: "von",
			},
			{
				type: "date",
				ro: false,
				cl: "karteisuche-redaktionsdatum-bis",
				ph: "",
				pre: "",
				label: "bis",
			},
		],
	},
	// fügt einen neuen Filter hinzu
	//   manuell = Boolean || undefined
	//     (der Filter wurde manuell hinzugefügt)
	filterHinzufuegen (manuell = true) {
		let cont = document.getElementById("karteisuche-filter"),
			p = document.createElement("p");
		cont.insertBefore(p, cont.firstChild);
		p.classList.add("input-text");
		// Lösch-Icon
		let a = document.createElement("a");
		p.appendChild(a);
		a.href = "#";
		a.classList.add("icon-link", "icon-loeschen");
		karteisuche.filterEntfernen(a);
		// Dropdown-Container
		let span = document.createElement("span");
		p.appendChild(span);
		span.classList.add("dropdown-cont");
		// Input
		let input = document.createElement("input");
		span.appendChild(input);
		input.classList.add("dropdown-feld", "karteisuche-filter");
		let id = karteisuche.makeId.next().value;
		input.id = `karteisuche-filter-${id}`;
		input.placeholder = "Filtertyp";
		input.readOnly = true;
		input.type = "text";
		input.value = "";
		span.appendChild(dropdown.makeLink("dropdown-link-td", "Filtertyp", true));
		tooltip.init(span);
		dropdown.feld(input);
		karteisuche.filterFelderListener(input);
		// Filter fokussieren, wenn er manuell hinzugefügt wurde
		if (manuell) {
			input.focus();
		}
		// Maximalhöhe Trefferliste setzen
		helfer.elementMaxHeight({
			ele: document.getElementById("karteisuche-karteien"),
		});
	},
	// baut die zu einem Filter gehörigen Formularelemente auf
	//   filterId = String
	//     (ID des Filters, der gerade geändert wurde)
	filterFelder (filterId) {
		let filter = document.getElementById(filterId),
			p = filter.parentNode.parentNode;
		// ggf. unnötige Inputs entfernen
		// (der Filter kann geändert werden)
		while (p.childNodes.length > 2) {
			p.removeChild(p.lastChild);
		}
		// Filtertyp und ID ermitteln
		const typ = filter.value,
			id = filterId.replace(/.+-/, "");
		// der Filtertyp könnte leer sein, wenn ein leerer Filter wiederhergestellt wird
		if (!typ) {
			return;
		}
		// die nötigen Inputs hinzufügen
		let felder = karteisuche.filterTypen[typ];
		for (let feld of felder) {
			let span = document.createElement("span");
			p.appendChild(span);
			if (feld.label) {
				let label = document.createElement("label");
				span.appendChild(label);
				label.setAttribute("for", `${feld.cl}-${id}`);
				label.textContent = feld.label;
			}
			if (feld.type === "dropdown") {
				span.classList.add("dropdown-cont");
				let input = document.createElement("input");
				span.appendChild(input);
				input.classList.add("dropdown-feld", feld.cl);
				input.id = `${feld.cl}-${id}`;
				input.placeholder = feld.ph;
				if (feld.ro) {
					input.readOnly = true;
				}
				input.type = "text";
				input.value = feld.pre;
				span.appendChild(dropdown.makeLink("dropdown-link-td", feld.ph, true));
				dropdown.feld(input);
				karteisuche.filterFelderListener(input);
			} else if (feld.type === "text") {
				let input = document.createElement("input");
				span.appendChild(input);
				input.classList.add(feld.cl);
				input.id = `${feld.cl}-${id}`;
				input.placeholder = feld.ph;
				input.type = "text";
				input.value = feld.pre;
				karteisuche.filterFelderListener(input);
			} else if (feld.type === "date") {
				let input = document.createElement("input");
				span.appendChild(input);
				input.classList.add(feld.cl);
				input.id = `${feld.cl}-${id}`;
				input.type = "date";
				let datum = new Date();
				if (feld.cl === "karteisuche-redaktionsdatum-von") {
					input.value = `${datum.getFullYear()}-01-01`;
				} else if (feld.cl === "karteisuche-redaktionsdatum-bis") {
					input.value = `${datum.getFullYear()}-12-31`;
				} else {
					input.value = datum.toISOString().split("T")[0];
				}
				karteisuche.filterFelderListener(input);
			} else if (feld.type === "checkbox") {
				let input = document.createElement("input");
				span.appendChild(input);
				input.classList.add(feld.cl);
				input.id = `${feld.cl}-${id}`;
				input.type = "checkbox";
				karteisuche.filterFelderListener(input);
				let label = document.createElement("label");
				span.appendChild(label);
				label.setAttribute("for", `${feld.cl}-${id}`);
				label.textContent = feld.ph;
			}
		}
		tooltip.init(p);
	},
	// Suche mit Enter starten
	filterFelderListener (input) {
		input.addEventListener("keydown", function(evt) {
			tastatur.detectModifiers(evt);
			if (!tastatur.modifiers &&
					evt.key === "Enter" &&
					!document.querySelector("#dropdown .aktiv")) {
				evt.preventDefault();
				if (Object.keys(karteisuche.ztjCache).length) {
					karteisuche.suchenPrepZtj([]);
				} else {
					karteisuche.suchenPrep();
				}
			}
		});
	},
	// ermittelt den zu einem ausgeschriebenen Tag-Typ gehörenden Schlüssel
	//   feld = Element
	//     (das Input-Feld, in dem der ausgeschriebene Tag-Typ steht)
	filterTagTyp (feld) {
		const typ = feld.value;
		for (let key in optionen.tagsTypen) {
			if (!optionen.tagsTypen.hasOwnProperty(key)) {
				continue;
			}
			if (optionen.tagsTypen[key][1] === typ) {
				return key;
			}
		}
		return typ.substring(0, 1).toLowerCase() + typ.substring(1);
	},
	// entfernt einen Filter
	//   a = Element
	//     (Anker zum Entfernen des Filters)
	filterEntfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			a.parentNode.parentNode.removeChild(a.parentNode);
			// Maximalhöhe Trefferliste setzen
			helfer.elementMaxHeight({
				ele: document.getElementById("karteisuche-karteien"),
			});
		});
	},
	// Zwischenspeicher für die Filterwerte
	filterWerte: [],
	// Map für Tags
	filterTagMap: {
		Themenfeld: "themenfelder",
		Sachgebiet: "sachgebiete",
	},
	// Filterwerte sammeln
	filterWerteSammeln () {
		karteisuche.filterWerte = [];
		for (let filter of document.querySelectorAll(".karteisuche-filter")) {
			const id = filter.id.replace(/.+-/, ""),
				typ = filter.value;
			// Filter ausgewählt?
			if (!typ) {
				karteisuche.filterIgnorieren(filter, true);
				continue;
			}
			// Objekt für die Filterwerte
			let obj = {
				typ: typ,
			};
			// Karteiwort
			if (typ === "Karteiwort") {
				let text = document.getElementById(`karteisuche-karteiwort-${id}`).value;
				text = helfer.textTrim(text, true);
				if (!text) {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
				obj.reg = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(text)), "i");
				karteisuche.filterWerte.push(obj);
			}
			// Lemmatyp
			else if (typ === "Lemmatyp") {
				obj.lt = document.getElementById(`karteisuche-lemmatyp-${id}`).value;
				karteisuche.filterWerte.push(obj);
			}
			// Themenfelder/Sachgebiet
			else if (/^(Themenfeld|Sachgebiet)$/.test(typ)) {
				const tagName = karteisuche.filterTagMap[typ];
				obj.id = "";
				const tag = document.getElementById(`karteisuche-${typ.toLowerCase()}-${id}`).value;
				if (!tag || !optionen.data.tags[tagName]) {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
				for (let id in optionen.data.tags[tagName].data) {
					if (!optionen.data.tags[tagName].data.hasOwnProperty(id)) {
						continue;
					}
					if (optionen.data.tags[tagName].data[id].name === tag) {
						obj.id = id;
						break;
					}
				}
				if (obj.id) {
					karteisuche.filterWerte.push(obj);
				} else {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
			}
			// Volltext
			else if (typ === "Volltext") {
				let text = document.getElementById(`karteisuche-volltext-${id}`).value;
				text = helfer.textTrim(text.replace(/[<>]+/g, ""), true);
				if (!text) {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
				const i = document.getElementById(`karteisuche-volltext-genau-${id}`).checked ? "" : "i";
				obj.reg = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(text)), i);
				karteisuche.filterWerte.push(obj);
			}
			// Tag
			else if (typ === "Tag") {
				obj.tagTyp = karteisuche.filterTagTyp(document.getElementById(`karteisuche-tag-typ-${id}`));
				obj.tagId = "";
				const tag = document.getElementById(`karteisuche-tag-${id}`).value;
				if (!obj.tagTyp || !tag) {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
				for (let id in optionen.data.tags[obj.tagTyp].data) {
					if (!optionen.data.tags[obj.tagTyp].data.hasOwnProperty(id)) {
						continue;
					}
					if (optionen.data.tags[obj.tagTyp].data[id].name === tag) {
						obj.tagId = id;
						break;
					}
				}
				if (obj.tagId) {
					karteisuche.filterWerte.push(obj);
				} else {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
			}
			// Karteidatum
			else if (typ === "Karteidatum") {
				obj.typVal = document.getElementById(`karteisuche-datum-typ-${id}`).value;
				obj.dirVal = document.getElementById(`karteisuche-datum-dir-${id}`).value;
				obj.datumVal = document.getElementById(`karteisuche-datum-${id}`).value;
				if (obj.datumVal) { // falls kein korrektes Datum eingegeben wurde, ist der Wert leer
					karteisuche.filterWerte.push(obj);
				} else {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
			}
			// BearbeiterIn
			else if (typ === "BearbeiterIn") {
				let text = document.getElementById(`karteisuche-person-${id}`).value;
				text = helfer.textTrim(text, true);
				if (!text) {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
				obj.reg = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(text)), "i");
				karteisuche.filterWerte.push(obj);
			}
			// Redaktion
			else if (typ === "Redaktion") {
				let textEr = document.getElementById(`karteisuche-redaktion-ereignis-${id}`).value,
					textPr = document.getElementById(`karteisuche-redaktion-person-${id}`).value;
				textEr = helfer.textTrim(textEr, true);
				textPr = helfer.textTrim(textPr, true);
				if (!textEr && !textPr) {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
				if (textEr) {
					obj.er = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(textEr)), "i");
				}
				if (textPr) {
					obj.pr = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(textPr)), "i");
				}
				obj.logik = document.getElementById(`karteisuche-redaktion-logik-${id}`).value;
				karteisuche.filterWerte.push(obj);
			}
			// Redaktionsdatum
			else if (typ === "Redaktionsdatum") {
				let vonVal = document.getElementById(`karteisuche-redaktionsdatum-von-${id}`).value,
					bisVal = document.getElementById(`karteisuche-redaktionsdatum-bis-${id}`).value;
				if (vonVal && bisVal) {
					obj.von = new Date(vonVal);
					obj.bis = new Date(bisVal);
					karteisuche.filterWerte.push(obj);
				} else {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
			}
			karteisuche.filterIgnorieren(filter, false);
		}
	},
	// markiert/demarkiert Filter, die ignoriert werden/wurden
	//   filter = Element
	//     (Input-Feld mit der Bezeichnung des Filtertyps)
	//   ignorieren = Boolean
	//     (Filter wird ignoriert bzw. nicht mehr ignoriert)
	filterIgnorieren (filter, ignorieren) {
		let p = filter.closest("p");
		if (ignorieren) {
			p.classList.add("karteisuche-ignoriert");
		} else {
			p.classList.remove("karteisuche-ignoriert");
		}
	},
	// String-Datensätze, die der Volltextfilter berücksichtigt
	// (für die Bedeutungen wird es komplizierter)
	filterVolltext: {
		datei: ["no", "wo"],
		redaktion: ["bh", "nl", "no"],
		karten: ["au", "bl", "bs", "da", "kr", "no", "qu", "sy", "ts"],
	},
	// überprüfen, ob eine Kartei zu den übergebenen Filtern passt
	//   datei = Object
	//     (die ZTJ-Datei, die gefiltert werden soll; also alle Karteidaten, in der üblichen Form)
	filtern (datei) {
		let be = datei.rd.be;
		if (!be) {
			// bis Dateiformat Version 12 standen die Bearbeiterinnen in data.be;
			// erst danach in data.rd.be
			be = datei.be;
		}
		let er = datei.rd.er;
		if (!er) {
			// bis Dateiformat Version 12 standen die Redaktionsereignisse in data.rd;
			// erst danach in data.rd.er
			er = datei.rd;
		}
		let redErg = new Set();
		document.querySelectorAll(".karteisuche-redaktion-ereignis").forEach(i => {
			redErg.add(helfer.formVariSonderzeichen(helfer.escapeRegExp(i.value)));
		});
		let redErgReg = new RegExp([...redErg].join("|"), "i");
		forX: for (let filter of karteisuche.filterWerte) {
			// Karteiwort
			if (filter.typ === "Karteiwort" &&
					!filter.reg.test(datei.wo)) {
				return false;
			}
			// Themenfeld/Sachgebiet
			else if (/^(Themenfeld|Sachgebiet)$/.test(filter.typ)) {
				let gefunden = false;
				let keys = {
					Themenfeld: "tf",
					Sachgebiet: "sg",
				};
				if (datei.rd[keys[filter.typ]]) {
					// dieser Datensatz wurde erst mit Dateiformat Version 13 eingeführt;
					// davor existierte er nicht
					for (let i of datei.rd[keys[filter.typ]]) {
						if (i.id === filter.id) {
							gefunden = true;
							break;
						}
					}
				}
				if (!gefunden) {
					return false;
				}
			}
			// Volltext
			else if (filter.typ === "Volltext") {
				// Datenfelder Kartei
				for (let ds of karteisuche.filterVolltext.datei) {
					if (filter.reg.test(datei[ds])) {
						continue forX;
					}
				}
				// Datenfelder Redaktion
				for (let ds of karteisuche.filterVolltext.redaktion) {
					if (filter.reg.test(datei.rd[ds])) {
						continue forX;
					}
				}
				// Datenfelder Karteikarten
				for (let ds of karteisuche.filterVolltext.karten) {
					for (let id in datei.ka) {
						if (!datei.ka.hasOwnProperty(id)) {
							continue;
						}
						let text_rein = datei.ka[id][ds];
						if (ds === "bs") {
							text_rein = liste.belegTrennungWeg(text_rein, true);
						}
						if (filter.reg.test(text_rein)) {
							continue forX;
						}
					}
				}
				// Bedeutungen
				for (let id in datei.bd.gr) {
					if (!datei.bd.gr.hasOwnProperty(id)) {
						continue;
					}
					let bd = datei.bd.gr[id].bd;
					for (let i of bd) {
						const bedeutung = i.bd[i.bd.length - 1];
						if (filter.reg.test(bedeutung)) {
							continue forX;
						}
					}
				}
				return false;
			}
			// Tag
			else if (filter.typ === "Tag") {
				let gefunden = false;
				forTag: for (let id in datei.bd.gr) {
					if (!datei.bd.gr.hasOwnProperty(id)) {
						continue;
					}
					let bd = datei.bd.gr[id].bd;
					for (let i of bd) {
						for (let j of i.ta) {
							if (j.ty === filter.tagTyp &&
									j.id === filter.tagId) {
								gefunden = true;
								break forTag;
							}
						}
					}
				}
				if (!gefunden) {
					return false;
				}
			}
			// Karteidatum
			else if (filter.typ === "Karteidatum") {
				const ds = filter.typVal === "erstellt" ? "dc" : "dm",
					lt = filter.dirVal === "<=" ? true : false,
					datum = new Date(filter.datumVal),
					datumDatei = new Date(datei[ds].split("T")[0]);
				if (lt && datumDatei > datum ||
						!lt && datumDatei < datum) {
					return false;
				}
			}
			// BearbeiterIn
			else if (filter.typ === "BearbeiterIn" &&
					!hasSome(be, filter.reg)) {
				return false;
			}
			// Redaktion
			else if (filter.typ === "Redaktion") {
				for (let i of er) {
					let gefunden = {
						er: filter.er && filter.er.test(i.er) ? true : false,
						pr: filter.pr && filter.pr.test(i.pr) ? true : false,
					};
					let treffer = filter.er && filter.pr && gefunden.er && gefunden.pr ||
							filter.er && !filter.pr && gefunden.er ||
							!filter.er && filter.pr && gefunden.pr;
					if (treffer && filter.logik === "=") {
						continue forX;
					} else if (treffer && filter.logik !== "=") {
						return false;
					}
				}
				if (filter.logik !== "=") {
					continue forX;
				}
				return false;
			}
			// Redaktionsdatum
			else if (filter.typ === "Redaktionsdatum") {
				let inRange = false;
				for (let i of er) {
					if (redErg.size && !redErgReg.test(i.er)) {
						continue;
					}
					let da = new Date(i.da);
					if (da >= filter.von && da <= filter.bis) {
						inRange = true;
						break;
					}
				}
				if (!inRange) {
					return false;
				} else {
					continue forX;
				}
			}
		}
		return true;
		// testet, ob die Bedingungen zutreffen
		// (ausgelagert, damit die Funktionen nicht in der Schleife sind)
		//   arr = Array
		//     (hier wird gesucht)
		//   reg = RegExp
		//     (regulärer Ausdruck, mit dem gesucht wird)
		function hasSome (arr, reg) {
			return arr.some(v => reg.test(v));
		}
	},
	// aktuelle Filterkonfiguration in den Optionen speichern
	filterSpeichern () {
		optionen.data.karteisuche.filter = [];
		for (let filter of document.querySelectorAll(".karteisuche-filter")) {
			let inputs = filter.parentNode.parentNode.querySelectorAll("input"),
				filterDaten = [];
			for (let i of inputs) {
				if (i.type === "checkbox") {
					filterDaten.push(i.checked);
				} else {
					filterDaten.push(i.value);
				}
			}
			optionen.data.karteisuche.filter.push(filterDaten);
		}
		optionen.speichern();
	},
	// in den Optionen gespeicherte Filter wiederherstellen
	filterWiederherstellen () {
		for (let i = optionen.data.karteisuche.filter.length - 1; i >= 0; i--) {
			let werte = optionen.data.karteisuche.filter[i];
			// Korrektur Redaktionsfilter
			// (ab Version 0.32.0 gibt es ein Logikfeld: = || !=)
			if (werte[0] === "Redaktion" && werte.length === 3) {
				werte.splice(1, 0, "=");
			}
			// neuen Absatz erzeugen
			karteisuche.filterHinzufuegen(false);
			let typ = document.querySelector("#karteisuche-filter input");
			typ.value = werte[0];
			// Filterfelder einhängen
			karteisuche.filterFelder(typ.id);
			// Filterfelder füllen
			let inputs = document.querySelectorAll("#karteisuche-filter p:first-child input");
			for (let j = 1, len = werte.length; j < len; j++) {
				if (helfer.checkType("Boolean", werte[j])) {
					inputs[j].checked = werte[j];
				} else {
					inputs[j].value = werte[j];
				}
			}
		}
	},
	// Ansicht der Filter umschalten
	filterUmschalten () {
		let filter = document.getElementById("karteisuche-filterblock"),
			hoehe = 0;
		if (filter.classList.contains("aus")) {
			filter.classList.remove("aus");
			hoehe = filter.scrollHeight;
			helfer.elementMaxHeight({
				ele: document.getElementById("karteisuche-karteien"),
			});
			filter.classList.add("blenden");
			filter.style.height = "0px";
			filter.style.paddingTop = "0px";
			setTimeout(() => {
				filter.style.height = `${hoehe}px`;
				filter.style.paddingTop = "10px";
			}, 0);
			setTimeout(() => {
				filter.classList.remove("blenden");
				filter.removeAttribute("style");
			}, 300);
		} else {
			filter.classList.add("blenden");
			filter.style.height = `${filter.scrollHeight}px`;
			filter.style.paddingTop = "10px";
			setTimeout(() => {
				filter.style.height = "0px";
				filter.style.paddingTop = "0px";
			}, 0);
			setTimeout(() => {
				filter.classList.add("aus");
				filter.classList.remove("blenden");
				filter.removeAttribute("style");
				helfer.elementMaxHeight({
					ele: document.getElementById("karteisuche-karteien"),
				});
			}, 300);
		}
	},
	// Animation, dass die Karteisuche läuft
	//   anschalten = Boolean
	//     (die Animation soll angeschaltet werden)
	animation (anschalten) {
		let sperrbild = document.getElementById("karteisuche-suche-laeuft");
		// Animation soll ausgeschaltet werden
		if (!anschalten) {
			clearInterval(karteisuche.animationStatus.interval);
			sperrbild.classList.add("aus");
			return;
		}
		// Animation soll angeschaltet werden
		karteisuche.animationStatus.punkte = 3;
		karteisuche.animationStatus.interval = setInterval(() => karteisuche.animationRefresh(), 500);
		karteisuche.animationRefresh();
		sperrbild.classList.remove("aus");
	},
	// Status-Informationen für die Animation
	animationStatus: {
		punkte: 3,
		interval: null,
	},
	// Text in der Animation auffrischen
	animationRefresh() {
		let span = document.querySelector("#karteisuche-suche-laeuft span"),
			status = karteisuche.animationStatus;
		span.textContent = ".".repeat(status.punkte);
		if (status.punkte === 3) {
			status.punkte = 1;
		} else {
			status.punkte++;
		}
	},
};
