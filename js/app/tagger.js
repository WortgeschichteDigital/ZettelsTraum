"use strict";

let tagger = {
	// Tagger-Fenster öffnen
	//   idx = String
	//     (Index-Nummer im aktuellen Bedeutungsgerüst, zu der die Tags hinzugefügt werden sollen)
	oeffnen (idx) {
		let fenster = document.getElementById("tagger");
		overlay.oeffnen(fenster);
		fenster.dataset.idx = idx;
		tagger.aufbauen(idx);
	},
	// Tag-Kategorien aufbauen
	aufbauen () {
		let cont = document.getElementById("tagger-typen");
		helfer.keineKinder(cont);
		let typen = [];
		for (let typ in optionen.data.tags) {
			if (!optionen.data.tags.hasOwnProperty(typ)) {
				continue;
			}
			typen.push(typ);
		}
		typen.sort(helfer.sortAlpha);
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
	// Tags eintragen
	fill () {
		const idx = parseInt(document.getElementById("tagger").dataset.idx, 10);
		let ta = bedeutungen.data.bd[idx].ta,
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
	},
	// hört, ob sich in einem Edit-Feld etwas tut
	listener (span) {
		// TODO
		let observer = new MutationObserver(function() {
			console.log("hier");
		});
		observer.observe(span, {
			characterData: true,
		});
	},
	// Tagger speichern
	speichern () {
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
						save.push({
							ty: kat,
							id: id,
						});
						continue forX;
					}
				}
				// Tag ist nicht in der Liste
				mismatch.push({
					typ: tagger.getName(kat),
					name: tag,
				});
			}
		}
		// inkorrekte Tags, weil nicht in der Liste
		if (mismatch.length) {
			let text = "Die folgenden Tags wurden in der zugehörigen Tag-Datei nicht gefunden. Sie wurden <em>nicht</em> gespeichert.",
				lastH3 = "";
			for (let mm of mismatch) {
				if (mm.typ !== lastH3) {
					lastH3 = mm.typ;
					text += `\n<h3>${mm.typ}</h3>\n`;
				} else {
					text += ", ";
				}
				text += `<s>${mm.name}</s>`;
			}
			dialog.oeffnen("alert");
			dialog.text(text);
		}
		// korrekte Tags speichern
		const idx = parseInt(document.getElementById("tagger").dataset.idx, 10);
		bedeutungen.data.bd[idx].ta = save;
		// Fenster ggf. schließen
		if (optionen.data.einstellungen["tagger-schliessen"]) {
			tagger.schliessen();
		}
	},
	// Tagger schließen
	schliessen () {
		overlay.ausblenden(document.getElementById("tagger"));
	},
};
