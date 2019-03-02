"use strict";

let filter = {
	// Liste der Filter aufbauen
	aufbauen () {
		// überprüfen, welche Filter vorhanden sind;
		// speichert zugleiche, wie viele Karten den Filter haben
		let filter_typen = {
			buecherdienst: 0,
		};
		for (let id in data.k) {
			if ( !data.k.hasOwnProperty(id) ) {
				continue;
			}
			// Bücherdienst
			if (data.k[id].bu) {
				filter_typen.buecherdienst++;
			}
		}
		// Filter drucken
		let cont = document.getElementById("liste-filter");
		helfer.keineKinder(cont);
		// Bücherdienst
		if (filter_typen.buecherdienst) {
			let p = document.createElement("p"),
				input = document.createElement("input"),
				label = document.createElement("label");
			input.type = "checkbox";
			input.id = "filter_buecherdienst";
			filter.anwenden(input);
			p.appendChild(input);
			label.setAttribute("for", "filter_buecherdienst");
			label.textContent = `Bücherdienst (${filter_typen.buecherdienst})`;
			p.appendChild(label);
			cont.appendChild(p);
		}
	},
	// Löst beim Ändern einer Filter-Checkbox den Neuaufbau der Liste aus
	//   input = Element
	//     (Checkbox in der Filterliste, die geändert wurde)
	anwenden (input) {
		input.addEventListener("change", () => liste.aufbauen(false) );
	},
	// Karteikarten filtern
	//   karten = Array
	//     (enthält die IDs der Karten, die gefiltert werden sollen)
	kartenFiltern (karten) {
		// aktive Filter ermitteln
		let filter_aktiv = {
			buecherdienst: false,
		};
		let filter = document.querySelectorAll("#liste-filter input"),
			filtern = false;
		for (let i = 0, len = filter.length; i < len; i++) {
			if (filter[i].checked) {
				let id = filter[i].id.replace(/^filter_/, "");
				filtern = true;
				filter_aktiv[id] = true;
			}
		}
		// keine Filter aktiv
		if (!filtern) {
			return karten;
		}
		// Karten filtern
		let karten_gefiltert = [];
		for (let i = 0, len = karten.length; i < len; i++) {
			let id = karten[i],
				okay = false;
			// Bücherdienst
			if (filter_aktiv.buecherdienst && data.k[id].bu) {
				okay = true;
			}
			// Karte okay?
			if (okay) {
				karten_gefiltert.push(id);
			}
		}
		return karten_gefiltert;
	},
};
