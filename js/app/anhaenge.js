"use strict";

let anhaenge = {
	// hier stehen Details zu den einzelnen Anhängen (s. anhaenge.scan())
	data: {},
	// scannt die übergebenen Anhänge und trägt das Ergebnis
	// in anhaenge.data ein
	//   an = Array/String
	//     (Anhang oder Liste von Anhängen, die gescannt werden sollen)
	scan (an) {
		if (Array.isArray(an)) {
			an.forEach((i) => scannen(i));
		} else {
			scannen(an);
		}
		function scannen (datei) {
			// schon gescannt
			if (anhaenge.data[datei]) {
				return;
			}
			// scannen
			const fs = require("fs"),
				path = require("path");
			let pfad = datei;
			if (!path.isAbsolute(datei)) {
				pfad = `${path.parse(kartei.pfad).dir}/${datei}`;
			}
			anhaenge.data[datei] = {
				exists: fs.existsSync(pfad),
				path: pfad,
				ext: path.parse(pfad).ext,
			};
		}
	},
	// ermittelt das Array, in dem die aufzulistenden Anhänge zu finden sind
	//   obj = String
	//     (String mit Angaben zu dem Objekt; dieser muss in einen echten Verweis
	//     umgewandelt werden)
	getArr (obj) {
		let obj_split = obj.split("|"),
			arr = {};
		if (obj_split[0] === "data") {
			arr = data;
		} else if (obj_split[0] === "beleg") {
			arr = beleg;
		}
		for (let i = 1, len = obj_split.length; i < len; i++) {
			arr = arr[obj_split[i]];
		}
		return arr;
	},
	// Liste mit Icon-Typen
	iconTypen: {
		".doc": "datei-doc.svg",
		".docx": "datei-doc.svg",
		".gif": "datei-img.svg",
		".gz": "datei-archiv.svg",
		".htm": "datei-html.svg",
		".html": "datei-html.svg",
		".jpeg": "datei-img.svg",
		".jpg": "datei-img.svg",
		".odp": "datei-praes.svg",
		".odt": "datei-doc.svg",
		".pdf": "datei-pdf.svg",
		".png": "datei-img.svg",
		".ppt": "datei-praes.svg",
		".pptx": "datei-praes.svg",
		".rar": "datei-archiv.svg",
		".txt": "datei-txt.svg",
		".wgd": "datei-wgd.svg",
		".xml": "datei-xml.svg",
		".zip": "datei-archiv.svg",
	},
	// passendes Icon zum anhang ermitteln
	//   an = string
	//     (Datei, wie sie sich in anhaenge.data findet)
	getIcon (an) {
		if (!anhaenge.data[an].exists) {
			return "img/datei-x.svg";
		}
		if (anhaenge.iconTypen[anhaenge.data[an].ext]) {
			return `img/${anhaenge.iconTypen[anhaenge.data[an].ext]}`;
		}
		return "img/datei.svg";
	},
	// Liste von Icons erstellen, die einzeln angeklickt werden können
	//   arr = Array/null
	//     (Array mit allen Dateien, für die Icons erstellt werden sollen;
	//     steht der Wert auf null, soll nur die Liste gelöscht werden)
	//   ziel = Element
	//     (Element, in das die Iconliste eingetragen werden soll)
	makeIconList (arr, ziel) {
		helfer.keineKinder(ziel);
		if (!arr) {
			return;
		}
		arr.forEach(function(i) {
			let img = document.createElement("img");
			img.dataset.datei = i;
			img.src = anhaenge.getIcon(i);
			img.width = "24";
			img.height = "24";
			img.title = i;
			anhaenge.oeffnenListener(img);
			ziel.appendChild(img);
		});
	},
	// Anhänge-Fenster einblenden
	fenster () {
		let fenster = document.getElementById("anhaenge");
		// Fenster öffnen oder in den Vordergrund holen
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Anhänge der Kartei auflisten
		let cont = document.getElementById("anhaenge-cont");
		anhaenge.auflisten(cont, true, "data|an");
		// Anhänge der Belege auflisten
		anhaenge.auflistenBelege(cont);
	},
	// Anhänge auflisten
	//   cont = Element
	//     (Container, in dem die Liste erzeugt werden soll)
	//   add = Boolean
	//     (Add-Button soll erzeugt werden, oder auch nicht)
	//   obj = String
	//     (verweist auf das Objekt, in dem die Anhänge gespeichert werden;
	//     Werte durch Haarstrich getrennt)
	auflisten (cont, add, obj) {
		// Content leeren
		// (soll kein Button hinzugefügt werden, soll der Containert auch nicht geleert werden;
		// das dürfte nur das Anhänge-Fenster betreffen; darum geht das so)
		if (add) {
			helfer.keineKinder(cont);
		}
		// ggf. Hinzufüge-Button einfügen
		if (add) {
			anhaenge.addButton(cont, obj);
		}
		// abbrechen, wenn keine Anhänge vorhanden sind
		let arr = anhaenge.getArr(obj);
		if (!arr.length) {
			return;
		}
		anhaenge.scan(arr);
		// Anhänge auflisten
		arr.forEach(function(i, n) {
			let div = document.createElement("div");
			div.classList.add("anhaenge-item");
			div.dataset.obj = obj;
			div.dataset.datei = i;
			anhaenge.oeffnenListener(div);
			// Icon
			let icon = document.createElement("img");
			icon.src = anhaenge.getIcon(i);
			icon.width = "24";
			icon.height = "24";
			div.appendChild(icon);
			// Datei
			let datei = `\u200E${i}\u200E`; // vgl. den Sermon in meta.oeffnen()
			let span = document.createElement("span");
			span.classList.add("anhaenge-datei");
			span.setAttribute("dir", "rtl");
			span.textContent = datei;
			span.title = datei;
			div.appendChild(span);
			// aufwärts
			if (n > 0) {
				let up = document.createElement("a");
				up.classList.add("icon-link", "anhaenge-aufwaerts");
				up.href = "#";
				up.textContent = " ";
				anhaenge.sortieren(up);
				div.appendChild(up);
			} else {
				let span = document.createElement("span");
				span.classList.add("anhaenge-platzhalter");
				span.textContent = " ";
				div.appendChild(span);
			}
			// Löschen
			let del = document.createElement("a");
			del.classList.add("icon-link", "anhaenge-loeschen");
			del.href = "#";
			del.textContent = " ";
			anhaenge.loeschen(del);
			div.appendChild(del);
			// <div> einhängen
			cont.appendChild(div);
		});
	},
	// Anhänge der Belege im Kartei-Fenster auflisten
	auflistenBelege (cont) {
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			// Anhänge vorhanden?
			if (!data.ka[id].an.length) {
				continue;
			}
			// Anhänge drucken
			let h3 = document.createElement("h3");
			h3.textContent = liste.detailAnzeigenH3(id);
			h3.dataset.id = id;
			anhaenge.belegOeffnen(h3);
			cont.appendChild(h3);
			anhaenge.auflisten(cont, false, `data|ka|${id}|an`);
		}
	},
	// Öffnet einen Anhang
	//   item = Element
	//     (der <div> oder <img>, auf den/das geklickt wurde)
	oeffnenListener (item) {
		item.addEventListener("click", function() {
			anhaenge.oeffnen(this.dataset.datei);
		});
	},
	// Öffnet die übergebene Datei
	//   datei = "String"
	//     (Datei, die geöffnet werden soll)
	oeffnen (datei) {
		if (!anhaenge.data[datei].exists) {
			dialog.oeffnen("alert");
			dialog.text("Die Datei konnte nicht gefunden werden.");
			return;
		}
		const {shell} = require("electron");
		shell.openItem(anhaenge.data[datei].path);
	},
	// Öffnet beim Klick auf eine Überschrift im Anhänge-Fenster den entsprechenden Beleg
	// (wird auch in kopieren.js benutzt)
	//   ele = Element
	//     (die Überschrift, auf die geklickt wurde)
	belegOeffnen (ele) {
		ele.addEventListener("click", function(evt) {
			evt.preventDefault();
			let id = this.dataset.id;
			if (bedeutungen.geaendert) {
				dialog.oeffnen("confirm", function() {
					if (dialog.antwort) {
						bedeutungen.speichern();
					} else if (dialog.antwort === false) {
						bedeutungen.bedeutungenGeaendert(false);
						oeffnen();
					}
				});
				dialog.text("Das Bedeutungsgerüst wurde verändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
				return;
			} else if (beleg.geaendert) {
				dialog.oeffnen("confirm", function() {
					if (dialog.antwort) {
						beleg.aktionSpeichern();
					} else if (dialog.antwort === false) {
						beleg.belegGeaendert(false);
						oeffnen();
					}
				});
				dialog.text("Der aktuell geöffnete Beleg ist noch nicht gespeichert.\nMöchten Sie ihn nicht erst einmal speichern?");
				return;
			}
			oeffnen();
			function oeffnen () {
				overlay.alleSchliessen();
				beleg.oeffnen(id);
			}
		});
	},
	// Sortiert den Anhang um eine Position nach oben
	//   item = Element
	//     (der Icon-Link, auf den geklickt wurde)
	sortieren (item) {
		item.addEventListener("click", function(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			let cont = this.parentNode.parentNode,
				obj = this.parentNode.dataset.obj,
				datei = this.parentNode.dataset.datei,
				arr = anhaenge.getArr(obj),
				idx = arr.indexOf(datei);
			// umsortieren
			arr.splice(idx, 1);
			arr.splice(idx - 1, 0, datei);
			// Änderungsmarkierung
			anhaenge.geaendert(cont);
			// ggf. Änderungsdatum der Karteikarte auffrischen
			if (/^data\|ka/.test(obj)) {
				const id = obj.split("|")[2];
				data.ka[id].dm = new Date().toISOString();
			}
			// Liste der Anhänge neu aufbauen
			if (cont.dataset.anhaenge === "kartei") { // sonst erscheinen die Anhänge des Belegs an der Stelle, an der die Anhänge der Kartei sein sollten
				obj = "data|an";
			}
			anhaenge.auflisten(cont, true, obj);
			// ggf. Liste der Anhänge in den Belegen neu aufbauen
			if (cont.dataset.anhaenge === "kartei") {
				anhaenge.auflistenBelege(cont);
			}
			// ggf. Pfeil-Icon fokussieren
			let pfeil = cont.querySelector(`[data-datei="${datei}"] .anhaenge-aufwaerts`);
			if (pfeil) {
				pfeil.focus();
			}
		});
	},
	// Löscht einen Anhang aus der Liste
	//   item = Element
	//     (der Icon-Link, auf den geklickt wurde)
	loeschen (item) {
		item.addEventListener("click", function(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			let cont = this.parentNode.parentNode,
				obj = this.parentNode.dataset.obj,
				datei = this.parentNode.dataset.datei,
				arr = anhaenge.getArr(obj);
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					arr.splice(arr.indexOf(datei), 1);
					// Änderungsmarkierung
					anhaenge.geaendert(cont);
					// ggf. Änderungsdatum der Karteikarte auffrischen
					if (/^data\|ka/.test(obj)) {
						const id = obj.split("|")[2];
						data.ka[id].dm = new Date().toISOString();
					}
					// Liste der Anhänge neu aufbauen
					if (cont.dataset.anhaenge === "kartei") { // sonst erscheinen die Anhänge des Belegs an der Stelle, an der die Anhänge der Kartei sein sollten
						obj = "data|an";
					}
					anhaenge.auflisten(cont, true, obj);
					// ggf. Liste der Anhänge in den Belegen neu aufbauen
					if (cont.dataset.anhaenge === "kartei") {
						anhaenge.auflistenBelege(cont);
					}
				}
			});
			dialog.text(`Soll die folgende Datei wirklich aus der Liste entfernt werden?\n<p class="force-wrap">${datei}</p>`);
		});
	},
	// Add-Button erzeugen, der über einer Anhängeliste steht
	//   cont = Element
	//     (Container, an den der Button gehängt werden soll)
	//   obj = String
	//     (verweist auf das Objekt, in dem die Anhänge gespeichert werden sollen;
	//     Werte durch Haarstrich getrennt)
	addButton (cont, obj) {
		let p = document.createElement("p");
		p.classList.add("anhaenge-add");
		let input = document.createElement("input");
		input.dataset.obj = obj;
		input.setAttribute("tabindex", "0");
		input.type = "button";
		input.value = "Ergänzen";
		anhaenge.add(input);
		p.appendChild(input);
		cont.appendChild(p);
	},
	// Anhang hinzufügen
	//   input = Element
	//     (Add-Button zum Hinzufügen eines Anhangs)
	add (input) {
		input.addEventListener("click", function() {
			const obj = this.dataset.obj,
				{app, dialog} = require("electron").remote;
			let cont = this.parentNode.parentNode;
			let opt = {
				title: "Anhang hinzufügen",
				defaultPath: app.getPath("documents"),
				filters: [
					{
						name: "Alle Dateien",
						extensions: ["*"],
					},
				],
				properties: [
					"multiSelections",
					"openFile",
				],
			};
			// Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
			if (optionen.data.letzter_pfad) {
				opt.defaultPath = optionen.data.letzter_pfad;
			}
			// Dialog anzeigen
			dialog.showOpenDialog(null, opt, function(dateien) { // dateien ist ein Array!
				if (dateien === undefined) {
					kartei.dialogWrapper("Sie haben keine Datei ausgewählt.");
					return;
				}
				anhaenge.addFiles(dateien, cont, obj);
			});
		});
	},
	// Dateien ggf. hinzufügen
	//   dateien = Array
	//     (enthält eine Liste der Dateien, die hinzugefügt werden sollen)
	//   cont = Element
	//     (Container der den Add-Button und die Liste der Anhänge enthält)
	//   obj = String
	//     (Angaben über das Array, dem die Dateien hinzugefügt werden sollen
	//     Werte durch Haarstriche getrennt)
	addFiles (dateien, cont, obj) {
		// Dateien hinzufügen
		const path = require("path");
		let reg_pfad = new RegExp(helfer.escapeRegExp(`${path.dirname(kartei.pfad)}${path.sep}`)),
			schon = [],
			arr = anhaenge.getArr(obj);
		dateien.forEach(function(i) {
			const datei = i.replace(reg_pfad, "");
			if (arr.includes(datei)) {
				schon.push(datei);
				return;
			}
			anhaenge.scan(datei);
			arr.push(datei);
		});
		// melden, wenn Dateien schon im Array sind
		if (schon.length) {
			dialog.oeffnen("alert");
			let text = "folgende Datei war";
			if (schon.length > 1) {
				text = "folgenden Dateien waren";
			}
			dialog.text(`Die ${text} schon angehängt:\n${schon.join("<br>")}`);
		}
		// Abbruch, wenn keine neuen Dateien hinzugefügt wurden
		if (schon.length === dateien.length) {
			return;
		}
		// Änderungsmarkierung
		anhaenge.geaendert(cont);
		// Liste der Anhänge neu aufbauen
		anhaenge.auflisten(cont, true, obj);
		// ggf. Liste der Anhänge in den Belegen neu aufbauen
		if (cont.dataset.anhaenge === "kartei") {
			anhaenge.auflistenBelege(cont);
		}
	},
	// Änderungsmarkierung setzen
	//   cont = Element
	//     (das Contentobjekt, in dem sich die Anhänge befinden; hier ist auch
	//     die Markierung, ob die Kartei oder ein Beleg betroffen sind)
	geaendert (cont) {
		// Änderungsmarkierung
		let typ = cont.dataset.anhaenge;
		if (typ === "kartei") {
			kartei.karteiGeaendert(true);
			anhaenge.makeIconList(data.an, document.getElementById("kartei-anhaenge"));
		} else if (typ === "beleg") {
			beleg.belegGeaendert(true);
		}
	},
};
