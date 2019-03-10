"use strict";

let filter = {
	// Liste der Filter aufbauen
	//   belege = Array
	//     (die IDs der Belege, bereits chronologisch sortiert)
	aufbauen (belege) {
		let filter_backup = filter.backup();
		// überprüfen, welche Filter vorhanden sind;
		// speichert zugleiche, wie viele Karten zu dem Filter passen
		let filter_typen = {
			buecherdienst: 0,
		};
		for (let id in data.ka) {
			if ( !data.ka.hasOwnProperty(id) ) {
				continue;
			}
			// Bücherdienst
			if (data.ka[id].bu) {
				filter_typen.buecherdienst++;
			}
		}
		// Zeitraum
		if (!optionen.data.belegliste.sort_aufwaerts) {
			belege.reverse();
		}
		if (!belege.length) {
			filter.zeitraumStart = "";
		} else {
			filter.zeitraumStart = liste.zeitschnittErmitteln(data.ka[ belege[0] ].da).jahr;
			filter.zeitraumEnde = liste.zeitschnittErmitteln(data.ka[ belege[belege.length - 1] ].da).jahr;
		}
		filter.aufbauenZeitraum();
		// dynamische Filter drucken
		const cont = document.getElementById("liste-filter-dynamisch");
		helfer.keineKinder(cont);
		// Backup der Filtereinstellungen wiederherstellen
		filter.backupWiederher(filter_backup);
		// TODO FILTERBLOCK ERZEUGEN
// 		cont.appendChild( filter.aufbauenCont("Volltext") );
		// Bücherdienst TODO ALTER CODE
// 		if (filter_typen.buecherdienst) {
// 			let p = document.createElement("p"),
// 				input = document.createElement("input"),
// 				label = document.createElement("label");
// 			input.type = "checkbox";
// 			input.id = "filter_buecherdienst";
// 			filter.anwenden(input);
// 			p.appendChild(input);
// 			label.setAttribute("for", "filter-buecherdienst");
// 			label.textContent = `Bücherdienst (${filter_typen.buecherdienst})`;
// 			p.appendChild(label);
// 			cont.appendChild(p);
// 		}
	},
	// Zwischenspeicher für die Zeiträume der aktuellen Belegliste
	zeitraumStart: "",
	zeitraumEnde: "",
	// Zeitraumfilter aufbauen
	//   start = String
	//     (Jahr des 1. Belegs)
	//   ende = String
	//     (Jahr des letzten Belegs)
	aufbauenZeitraum () {
		// Liste leeren
		const cont = document.getElementById("filter-zeitraum-dynamisch");
		helfer.keineKinder(cont);
		// Belege vorhanden?
		if (!filter.zeitraumStart) {
			let p = document.createElement("p");
			p.classList.add("filter-keine-belege");
			p.textContent = "keine Belege";
			cont.appendChild(p);
			return;
		}
		// Grenzen berechnen
		let start = filter.zeitraumStart,
			ende = filter.zeitraumEnde,
			filter1 = 0,
			filterN = 0,
			step = 0;
		if (document.getElementById("filter-zeitraum-100").checked) {
			filter1 = parseInt(start.substring(0, 2), 10) * 100;
			filterN = parseInt(ende.substring(0, 2), 10) * 100;
			step = 100;
		} else if (document.getElementById("filter-zeitraum-50").checked) {
			let haelfte1 = Math.round(parseInt(start.substring(2), 10) / 100) ? "50" : "00";
			filter1 = parseInt(`${start.substring(0, 2)}${haelfte1}`, 10);
			let haelfteN = Math.round(parseInt(ende.substring(2), 10) / 100) ? "50" : "00";
			filterN = parseInt(`${ende.substring(0, 2)}${haelfteN}`, 10);
			step = 50;
		} else {
			filter1 = parseInt(start.substring(0, 3), 10) * 10;
			filterN = parseInt(ende.substring(0, 3), 10) * 10;
			step = 10;
		}
		// Liste füllen
		for (let i = filter1; i <= filterN; i += step) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Checkbox
			let input = document.createElement("input");
			input.id = `filter-zeit-${i}`;
			input.type = "checkbox";
			p.appendChild(input);
			// Label
			let label = document.createElement("label");
			label.setAttribute("for", `filter-zeit-${i}`);
			label.textContent = i;
			p.appendChild(label);
		}
		// Liste nach oben scrollen
		cont.scrollTop = 0;
	},
	// die Schnitte im Filter-Zeitraum werden gewechselt
	//   input = Element
	//     (Radio-Button, der für die gewünschten Zeitschnitte steht)
	wechselnZeitraum (input) {
		input.addEventListener("change", function() {
			optionen.data.filter_zeitraum = this.id.match(/[0-9]+$/)[0];
			optionen.speichern(false);
			filter.aufbauenZeitraum();
		});
	},
	// Kopf und Container einer Filtergruppe erzeugen
	//   name = String
	//     (Name des Filterkopfes)
	aufbauenCont (name) {
		let frag = document.createDocumentFragment();
		// Filter-Kopf
		let a = document.createElement("a");
		a.classList.add("filter-kopf");
		a.href = "#";
		a.id = `filter-kopf-${name.toLowerCase()}`;
		a.textContent = name;
		frag.appendChild(a);
		// Filter-Container
		let div = document.createElement("div");
		div.classList.add("filter-cont");
		div.id = `filter-cont-${name.toLowerCase()}`;
		frag.appendChild(div);
		// Fragment zurückgeben
		return frag;
	},
	// Erstellt ein Backup der aktuellen Filter-Einstellungen, um sie nach
	// dem Neuaufbau der Liste wieder anzuwenden.
	backup () {
		let bak = {};
		document.querySelectorAll("#liste-filter input").forEach(function(i) {
			if (i.type === "text" && i.value) {
				bak[i.id] = i.value;
			} else if (i.type === "checkbox" || i.type === "radio") {
				bak[i.id] = i.checked;
			}
		});
		return bak;
	},
	// Stellt ein zuvor gemachtes Backup der Einstellungen in der Filterliste wieder her.
	//   bak = Object
	//     (Das Objekt mit den gespeicherten Einstellungen; vgl. filter.backup().)
	backupWiederher (bak) {
		document.querySelectorAll("#liste-filter input").forEach(function(i) {
			// kein Wert gespeichert
			if (!bak[i.id]) {
				return;
			}
			// Wert wiederherstellen
			if (i.type === "text") {
				i.value = bak[i.id];
			} else if (i.type === "checkbox" || i.type === "radio") {
				i.checked = bak[i.id];
			}
		});
	},
	// speichert den aktiven Timeout für das Anwenden der Filter
	// (wichtig für den Volltextfilter, der nicht sofort, sondern
	// nur mit Verzögerung angewandt werden soll)
	anwendenTimeout: null,
	// Löst beim Ändern eines Filters den Neuaufbau der Liste aus
	//   input = Element
	//     (Check- oder Textbox in der Filterliste, die geändert wurde)
	anwenden (input) {
		let listener = "change",
			timeout = 0;
		if (input.type === "text") {
			listener = "input";
			timeout = 250;
		}
		input.addEventListener(listener, function() {
			clearTimeout(filter.anwendenTimeout);
			filter.anwendenTimeout = setTimeout( () => liste.status(false), timeout);
		});
	},
	// Karteikarten filtern
	//   karten = Array
	//     (enthält die IDs der Karten, die gefiltert werden sollen)
	kartenFiltern (karten) {
		// aktive Filter ermitteln
		let filter_aktiv = {
			volltext: false,
			buecherdienst: false,
		};
		let filter = document.querySelectorAll("#liste-filter input"),
			filtern = false;
		for (let i = 0, len = filter.length; i < len; i++) {
			if (filter[i].type === "text" && filter[i].value ||
					filter[i].type === "checkbox" && filter[i].checked) {
				let id = filter[i].id.replace(/^filter-/, "");
				filtern = true;
				filter_aktiv[id] = true;
			}
		}
		// keine Filter aktiv
		if (!filtern) {
			return karten;
		}
		// Karten filtern
		let karten_gefiltert = [],
			vt = helfer.textTrim(document.getElementById("filter-volltext").value),
			vt_reg = new RegExp(helfer.escapeRegExp( helfer.textTrim(vt) ), "i");
		for (let i = 0, len = karten.length; i < len; i++) {
			let id = karten[i];
			// Volltext
			if ( filter_aktiv.volltext && !volltext(id) ) {
				continue;
			}
			// Bücherdienst
			if (filter_aktiv.buecherdienst && !data.ka[id].bu) {
				continue;
			}
			// Karte ist okay!
			karten_gefiltert.push(id);
		}
		return karten_gefiltert;
		// Funktionen
		function volltext (id) {
			let okay = false;
			const ds = ["au", "bd", "bs", "da", "no", "qu", "ts"];
			for (let i = 0, len = ds.length; i < len; i++) {
				if ( data.ka[id][ ds[i] ].match(vt_reg) ) {
					okay = true;
					break;
				}
			}
			return okay;
		}
	},
};
