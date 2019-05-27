"use strict";

let tagger = {
	// Tagger-Fenster öffnen
	//   idx = String
	//     (Index-Nummer im aktuellen Bedeutungsgerüst, zu der die Tags hinzugefügt werden sollen)
	oeffnen (idx) {
		let fenster = document.getElementById("tagger");
		overlay.oeffnen(fenster);
		fenster.dataset.idx = idx;
		tagger.aufbauen();
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
			let name = typ.substring(0, 1).toUpperCase() + typ.substring(1);
			if (optionen.tagsTypen[typ]) {
				name = optionen.tagsTypen[typ][1];
			}
			i.textContent = name;
			// Edit-Feld
			let span = document.createElement("span");
			p.appendChild(span);
			span.id = `tagger-${typ}`;
			span.setAttribute("contenteditable", "true");
			span.classList.add("dropdown-feld");
			dropdown.feld(span);
			// Dropdown-Link
			let a = dropdown.makeLink("dropdown-link-td", `${name} auswählen`, true);
			p.appendChild(a);
		}
		// keine Tag-Typen gefunden
		if (!cont.hasChildNodes()) {
			cont.classList.add("leer");
			cont.textContent = "keine Kategorien";
		} else {
			cont.classList.remove("leer");
			cont.querySelector("[contenteditable]").focus();
		}
	},
};
