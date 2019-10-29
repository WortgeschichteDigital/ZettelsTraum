"use strict";

let tagger = {
	// Tagger-Fenster öffnen
	//   idx = String
	//     (Index-Nummer im aktuellen Bedeutungsgerüst, zu der die Tags hinzugefügt werden sollen)
	oeffnen (idx) {
		let fenster = document.getElementById("tagger");
		overlay.oeffnen(fenster);
		fenster.dataset.idx = idx;
		tagger.aufbauenBedeutung(idx);
		tagger.aufbauen();
	},
	// Bedeutung eintragen, die hier getaggt wird
	//   idx = String
	//     (Index-Nummer im aktuellen Bedeutungsgerüst, zu der die Tags hinzugefügt werden sollen)
	aufbauenBedeutung (idx) {
		let cont = document.getElementById("tagger-bedeutung");
		helfer.keineKinder(cont);
		// Daten ermitteln
		const i = parseInt(idx, 10);
		bedeutungen.zaehlungTief(i).forEach(function(b) {
			let nB = document.createElement("b");
			nB.classList.add("zaehlung");
			nB.textContent = b;
			cont.appendChild(nB);
		});
		let span = document.createElement("span");
		span.innerHTML = bedeutungen.akt.bd[i].bd[bedeutungen.akt.bd[i].bd.length - 1];
		cont.appendChild(span);
	},
	// Tag-Kategorien aufbauen
	aufbauen () {
		tagger.filled = false;
		let cont = document.getElementById("tagger-typen");
		helfer.keineKinder(cont);
		let typen = [];
		for (let typ in optionen.data.tags) {
			if (!optionen.data.tags.hasOwnProperty(typ)) {
				continue;
			}
			typen.push(typ);
		}
		typen.sort(tagger.typenSort);
		for (let typ of typen) {
			let p = document.createElement("p");
			cont.appendChild(p);
			p.classList.add("input-text", "dropdown-cont");
			// Label
			let i = document.createElement("i");
			p.appendChild(i);
			const name = tagger.getName(typ);
			i.textContent = name;
			// Edit-Feld
			let span = document.createElement("span");
			p.appendChild(span);
			span.id = `tagger-${typ}`;
			span.setAttribute("contenteditable", "true");
			span.classList.add("dropdown-feld");
			dropdown.feld(span);
			tagger.listener(span);
			helfer.editNoFormat(span);
			// Dropdown-Link
			let a = dropdown.makeLink("dropdown-link-td", `${name} auswählen`, true);
			p.appendChild(a);
		}
		// keine Tag-Typen gefunden
		if (!cont.hasChildNodes()) {
			cont.classList.add("leer");
			cont.textContent = "keine Kategorien";
			return;
		} else {
			cont.classList.remove("leer");
			cont.querySelector("[contenteditable]").focus();
			// Felder mit Tags füllen
			tagger.fill();
		}
	},
	// Tag-Typen sortieren
	//   a = String
	//   b = String
	typenSort (a, b) {
		// Sachgebiete immer oben
		if (a === "sachgebiete") {
			return -1;
		} else if (b === "sachgebiete") {
			return 1;
		}
		// alphanumerisch
		let x = [a, b];
		x.sort();
		if (x[0] === a) {
			return -1;
		}
		return 1;
	},
	// Namen einer Tag-Kategorie ermitteln
	//   typ = String
	//     (der Zeiger auf die Kategorie)
	getName (typ) {
		let name = typ.substring(0, 1).toUpperCase() + typ.substring(1);
		if (optionen.tagsTypen[typ]) {
			name = optionen.tagsTypen[typ][1];
		}
		return name;
	},
	// die Tag-Felder wurden noch nicht gefüllt => keine Änderungsmarkierung setzen
	filled: false,
	// Tags eintragen
	fill () {
		const idx = parseInt(document.getElementById("tagger").dataset.idx, 10);
		let ta = bedeutungen.akt.bd[idx].ta,
			tags = {};
		for (let i of ta) {
			if (!optionen.data.tags[i.ty]) { // Tag-Datei wurde entfernt
				continue;
			}
			if (!tags[i.ty]) {
				tags[i.ty] = [];
			}
			tags[i.ty].push(optionen.data.tags[i.ty].data[i.id].name);
		}
		for (let i in tags) {
			if (!tags.hasOwnProperty(i)) {
				continue;
			}
			let feld = document.getElementById(`tagger-${i}`);
			feld.textContent = tags[i].join(", ");
		}
		setTimeout(function() {
			// der MutationObserver reagiert verzögert, darum muss hier ein Timeout stehen;
			// 0 Millisekunden würde wohl auch gehen
			tagger.filled = true;
		}, 5);
	},
	// hört, ob sich in einem Edit-Feld etwas tut
	listener (span) {
		// Enter abfangen
		span.addEventListener("keydown", function(evt) {
			if (evt.key === "Enter" && !document.getElementById("dropdown")) {
				evt.preventDefault();
				tagger.speichern();
			}
		});
		// Änderungen
		let observer = new MutationObserver(function() {
			if (!tagger.filled) {
				return;
			}
			span.classList.add("changed");
			tagger.taggerGeaendert(true);
		});
		observer.observe(span, {
			childList: true,
			subtree: true,
			characterData: true,
		});
	},
	// Tagger speichern
	speichern () {
		// Es wurde gar nichts geändert!
		if (!tagger.geaendert) {
			schliessen();
			return false;
		}
		// Werte der Felder auf Validität prüfen
		let mismatch = [],
			save = [],
			typen = document.querySelectorAll("#tagger-typen span");
		for (let typ of typen) {
			const kat = typ.id.replace(/^tagger-/, "");
			if (!optionen.data.tags[kat]) { // die Tag-Dateien könnte inzwischen gelöscht worden sein
				continue;
			}
			let tags = typ.textContent.split(",");
			forX: for (let tag of tags) {
				tag = helfer.textTrim(tag, true);
				if (!tag) {
					continue;
				}
				for (let id in optionen.data.tags[kat].data) {
					if (!optionen.data.tags[kat].data.hasOwnProperty(id)) {
						continue;
					}
					if (optionen.data.tags[kat].data[id].name === tag) {
						// ist der Tag schon in der Speicherliste?
						// (das könnte passieren, wenn man die Tags nicht aus dem Dropdown-Menü auswählt,
						// sondern händisch eintippt)
						for (let i of save) {
							if (i.ty === kat && i.id === id) {
								continue forX;
							}
						}
						// Tag ist noch nicht in der Liste => aufnehmen
						save.push({
							ty: kat,
							id: id,
						});
						continue forX;
					}
				}
				// Tag ist nicht in der Liste
				mismatch.push({
					kat: kat,
					tag: tag,
				});
			}
		}
		// inkorrekte Tags, weil nicht in der Liste
		if (mismatch.length) {
			tagger.filled = false; // da der MutationObserver verzögert reagiert, muss er kurzfristig ausgeschaltet werden
			let text = "Die folgenden Tags wurden in der zugehörigen Tag-Datei nicht gefunden. Sie wurden <em>nicht</em> gespeichert.",
				lastH3 = "";
			for (let mm of mismatch) {
				// Meldungstext erzeugen
				if (mm.kat !== lastH3) {
					lastH3 = mm.kat;
					text += `\n<h3>${tagger.getName(mm.kat)}</h3>\n`;
				} else {
					text += ", ";
				}
				text += `<s>${helfer.escapeHtml(mm.tag)}</s>`;
				// Feld auffrischen
				let feld = document.getElementById(`tagger-${mm.kat}`),
					feldText = feld.textContent,
					tag = helfer.escapeRegExp(mm.tag),
					reg = new RegExp(`^${tag}(,\\s*)*|,\\s*${tag}`);
				feld.textContent = feldText.replace(reg, "");
			}
			dialog.oeffnen({
				typ: "alert",
				text: text,
				callback: () => {
					tagger.filled = true;
					if (optionen.data.einstellungen["tagger-schliessen"]) {
						tagger.fokusTagzelle();
					} else {
						document.querySelector("#tagger-typen [contenteditable]").focus();
					}
				},
			});
		}
		// korrekte Tags speichern
		const idx = parseInt(document.getElementById("tagger").dataset.idx, 10);
		bedeutungen.akt.bd[idx].ta = save;
		// Tags in die Tabelle eintragen
		let zelle = document.querySelector(`#bedeutungen-cont tr[data-idx="${idx}"] td[data-feld="ta"]`);
		helfer.keineKinder(zelle);
		bedeutungen.aufbauenTags(save, zelle);
		// Änderungsmarkierung Bedeutungsgerüst setzen
		bedeutungen.bedeutungenGeaendert(true);
		// Änderungsmarkierungen im Tagger entfernen
		document.querySelectorAll("#tagger-typen .changed").forEach(function(i) {
			i.classList.remove("changed");
			i.classList.add("saved");
			setTimeout(function() {
				i.classList.remove("saved");
			}, 500);
		});
		tagger.taggerGeaendert(false);
		// Fenster ggf. schließen
		schliessen();
		// Rückmeldung, ob das Speichern erfolgreich war
		if (mismatch.length) {
			return false;
		} else {
			return true;
		}
		// Schließen-Funktion
		function schliessen () {
			if (optionen.data.einstellungen["tagger-schliessen"]) {
				tagger.schliessen();
			}
		}
	},
	// Tagger schließen
	schliessen () {
		speichern.checkInit(() => {
			overlay.ausblenden(document.getElementById("tagger"));
			tagger.fokusTagzelle();
		}, {
			notizen: false,
			bedeutungen: false,
			beleg: false,
		});
	},
	// Tabellenzelle mit den Tags fokussieren (nach dem Schließen)
	fokusTagzelle () {
		const idx = parseInt(document.getElementById("tagger").dataset.idx, 10);
		let zelle = document.querySelector(`#bedeutungen-cont tr[data-idx="${idx}"] td[data-feld="ta"]`);
		bedeutungen.editZeile(zelle, true);
		bedeutungen.linkTagger(zelle);
	},
	// Tags wurden geändert und noch nicht gespeichert
	geaendert: false,
	// Anzeigen, dass die Tags geändert wurden
	//   geaendert = Boolean
	taggerGeaendert (geaendert) {
		tagger.geaendert = geaendert;
		helfer.geaendert();
		let asterisk = document.getElementById("tagger-geaendert");
		if (geaendert) {
			asterisk.classList.remove("aus");
		} else {
			asterisk.classList.add("aus");
		}
	},
};
