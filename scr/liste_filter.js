"use strict";

let liste_filter = {
	// Liste der Filter aufbauen
	init () {
		// überprüfen, welche Filter vorhanden sind;
		// speichert zugleiche, wie viele Karten den Filter haben
		let filter = {
			buecherdienst: 0,
		};
		for (let id in data.k) {
			if (!data.k.hasOwnProperty(id)) {
				continue;
			}
			// Bücherdienst
			if (data.k[id].bue) {
				filter.buecherdienst++;
			}
		}
		// Filter drucken
		let cont = document.getElementById("liste_filter");
		helfer.keineKinder(cont);
		// Bücherdienst
		if (filter.buecherdienst) {
			let p = document.createElement("p"),
				input = document.createElement("input"),
				label = document.createElement("label");
			input.type = "checkbox";
			input.id = "filter_buecherdienst";
			liste_filter.filterEvent(input);
			p.appendChild(input);
			label.setAttribute("for", "filter_buecherdienst");
			label.textContent = `Bücherdienst (${filter.buecherdienst})`;
			p.appendChild(label);
			cont.appendChild(p);
		}
	},
	// Löst beim Ändern einer Filter-Checkbox den Neuaufbau der Liste aus
	filterEvent (input) {
		input.addEventListener("change", function() {
			liste.aufbauen(false);
		});
	},
	// Karteikarten filtern
	filter (karten) {
		// aktive Filter ermitteln
		let filter_aktiv = {
			buecherdienst: false,
		};
		let filter = document.querySelectorAll("#liste_filter input"),
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
			if (filter_aktiv.buecherdienst && data.k[id].bue) {
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
